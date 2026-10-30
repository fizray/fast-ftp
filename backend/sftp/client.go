package sftp

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"fast-ftp/backend/models"
	"fast-ftp/backend/security"
	"fast-ftp/backend/sshutil"
	"github.com/google/uuid"
	"github.com/pkg/sftp"
	"golang.org/x/crypto/ssh"
)

type Session struct {
	ID           string
	Profile      models.ConnectionProfile
	SSHClient    *ssh.Client
	SFTP         *sftp.Client
	agentCleanup func()
}

type Service struct {
	mu       sync.RWMutex
	sessions map[string]*Session
}

func NewService() *Service {
	return &Service{
		sessions: make(map[string]*Session),
	}
}

// Connect establishes an SSH & SFTP connection based on profile and optional credentials.
func (s *Service) Connect(ctx context.Context, req models.ConnectRequest) (string, error) {
	p := req.Profile
	if p.Port <= 0 {
		p.Port = 22
	}

	var authMethods []ssh.AuthMethod
	var agentCleanup func()

	// 1. Passwordless / SSH Agent
	if p.AuthType == models.AuthTypeAgent || p.Source == "ssh_config" {
		signers, cleanupConn, err := sshutil.GetAgentAuthSigners()
		if err == nil && len(signers) > 0 {
			agentCleanup = cleanupConn
			authMethods = append(authMethods, ssh.PublicKeys(signers...))
		}

		// Also check standard ~/.ssh/ keys as fallback for passwordless
		defaultKeys, _ := sshutil.DiscoverSSHKeys()
		for _, keyInfo := range defaultKeys {
			if keyData, err := os.ReadFile(keyInfo.Path); err == nil {
				if signer, err := ssh.ParsePrivateKey(keyData); err == nil {
					authMethods = append(authMethods, ssh.PublicKeys(signer))
				}
			}
		}
	}

	// 2. Explicit Key File
	if p.AuthType == models.AuthTypeKeyFile && p.KeyPath != "" {
		keyBytes, err := os.ReadFile(p.KeyPath)
		if err != nil {
			return "", fmt.Errorf("failed to read private key file: %w", err)
		}

		// Try unencrypted first
		signer, err := ssh.ParsePrivateKey(keyBytes)
		if err != nil {
			// Try with passphrase
			passphrase := req.Passphrase
			if passphrase == "" && p.EncryptedPassphrase != "" {
				passphrase, _ = security.DecryptString(p.EncryptedPassphrase)
			}

			if passphrase != "" {
				signer, err = ssh.ParsePrivateKeyWithPassphrase(keyBytes, []byte(passphrase))
			}

			if err != nil {
				return "", fmt.Errorf("private key is passphrase-protected or invalid: %w", err)
			}
		}
		authMethods = append(authMethods, ssh.PublicKeys(signer))
	}

	// 3. Password Authentication
	if p.AuthType == models.AuthTypePassword || req.Password != "" || p.EncryptedPassword != "" {
		pass := req.Password
		if pass == "" && p.EncryptedPassword != "" {
			pass, _ = security.DecryptString(p.EncryptedPassword)
		}

		if pass != "" {
			authMethods = append(authMethods, ssh.Password(pass))
			authMethods = append(authMethods, ssh.KeyboardInteractive(
				func(user, instruction string, questions []string, echos []bool) (answers []string, err error) {
					answers = make([]string, len(questions))
					for i := range questions {
						answers[i] = pass
					}
					return answers, nil
				},
			))
		}
	}

	if len(authMethods) == 0 {
		return "", fmt.Errorf("no authentication method available (agent, private key, or password required)")
	}

	sshConfig := &ssh.ClientConfig{
		User:            p.User,
		Auth:            authMethods,
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		Timeout:         12 * time.Second,
	}

	target := fmt.Sprintf("%s:%d", p.Host, p.Port)
	sshClient, err := ssh.Dial("tcp", target, sshConfig)
	if err != nil {
		if agentCleanup != nil {
			agentCleanup()
		}
		return "", fmt.Errorf("SSH connection failed to %s: %w", target, err)
	}

	sftpClient, err := sftp.NewClient(sshClient)
	if err != nil {
		sshClient.Close()
		if agentCleanup != nil {
			agentCleanup()
		}
		return "", fmt.Errorf("SFTP subsystem initialization failed: %w", err)
	}

	sessionID := uuid.New().String()
	sess := &Session{
		ID:           sessionID,
		Profile:      p,
		SSHClient:    sshClient,
		SFTP:         sftpClient,
		agentCleanup: agentCleanup,
	}

	s.mu.Lock()
	s.sessions[sessionID] = sess
	s.mu.Unlock()

	return sessionID, nil
}

// Disconnect closes the session and all underlying network connections.
func (s *Service) Disconnect(sessionID string) {
	s.mu.Lock()
	sess, exists := s.sessions[sessionID]
	if exists {
		delete(s.sessions, sessionID)
	}
	s.mu.Unlock()

	if exists && sess != nil {
		if sess.SFTP != nil {
			sess.SFTP.Close()
		}
		if sess.SSHClient != nil {
			sess.SSHClient.Close()
		}
		if sess.agentCleanup != nil {
			sess.agentCleanup()
		}
	}
}

// GetWorkingDir returns the current remote working directory.
func (s *Service) GetWorkingDir(sessionID string) (string, error) {
	sess, err := s.getSession(sessionID)
	if err != nil {
		return "", err
	}
	wd, err := sess.SFTP.Getwd()
	if err != nil {
		return "/", nil
	}
	return wd, nil
}

// ListFiles lists files in the given remote directory.
func (s *Service) ListFiles(sessionID string, remotePath string, showHidden bool) ([]models.FileItem, error) {
	sess, err := s.getSession(sessionID)
	if err != nil {
		return nil, err
	}

	if remotePath == "" || remotePath == "." {
		wd, err := sess.SFTP.Getwd()
		if err == nil && wd != "" {
			remotePath = wd
		} else {
			remotePath = "/"
		}
	}

	entries, err := sess.SFTP.ReadDir(remotePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read remote directory %s: %w", remotePath, err)
	}

	var items []models.FileItem
	for _, entry := range entries {
		name := entry.Name()
		isHidden := strings.HasPrefix(name, ".")
		if isHidden && !showHidden {
			continue
		}

		fullPath := pathJoin(remotePath, name)
		isDir := entry.IsDir()
		mode := entry.Mode()

		isSymlink := (mode & os.ModeSymlink) != 0
		var linkTarget string
		if isSymlink {
			target, _ := sess.SFTP.ReadLink(fullPath)
			linkTarget = target
		}

		items = append(items, models.FileItem{
			Name:        name,
			Path:        fullPath,
			Size:        entry.Size(),
			Mode:        mode.String(),
			OctalMode:   fmt.Sprintf("%04o", mode.Perm()),
			NumericMode: uint32(mode.Perm()),
			IsDir:       isDir,
			IsSymlink:   isSymlink,
			LinkTarget:  linkTarget,
			ModTime:     entry.ModTime(),
			Extension:   strings.ToLower(filepath.Ext(name)),
			IsHidden:    isHidden,
		})
	}

	return items, nil
}

// ReadFileContent reads remote text file content up to maxSize (e.g. 5MB).
func (s *Service) ReadFileContent(sessionID string, remotePath string, maxSize int64) (string, error) {
	sess, err := s.getSession(sessionID)
	if err != nil {
		return "", err
	}

	if maxSize <= 0 {
		maxSize = 5 * 1024 * 1024 // 5 MB default limit
	}

	file, err := sess.SFTP.Open(remotePath)
	if err != nil {
		return "", fmt.Errorf("failed to open remote file: %w", err)
	}
	defer file.Close()

	reader := io.LimitReader(file, maxSize)
	content, err := io.ReadAll(reader)
	if err != nil {
		return "", fmt.Errorf("failed to read remote file: %w", err)
	}

	return string(content), nil
}

// WriteFileContent saves text file content back to the remote server.
func (s *Service) WriteFileContent(sessionID string, remotePath string, content string) error {
	sess, err := s.getSession(sessionID)
	if err != nil {
		return err
	}

	file, err := sess.SFTP.Create(remotePath)
	if err != nil {
		return fmt.Errorf("failed to write remote file: %w", err)
	}
	defer file.Close()

	_, err = io.WriteString(file, content)
	return err
}

// CreateDirectory creates a remote directory.
func (s *Service) CreateDirectory(sessionID string, remotePath string) error {
	sess, err := s.getSession(sessionID)
	if err != nil {
		return err
	}
	return sess.SFTP.MkdirAll(remotePath)
}

// DeletePath deletes a remote file or folder.
func (s *Service) DeletePath(sessionID string, remotePath string, isDir bool) error {
	sess, err := s.getSession(sessionID)
	if err != nil {
		return err
	}

	if isDir {
		return s.removeRemoteDirRecursive(sess.SFTP, remotePath)
	}
	return sess.SFTP.Remove(remotePath)
}

func (s *Service) removeRemoteDirRecursive(client *sftp.Client, dirPath string) error {
	entries, err := client.ReadDir(dirPath)
	if err != nil {
		return err
	}

	for _, entry := range entries {
		subPath := pathJoin(dirPath, entry.Name())
		if entry.IsDir() {
			if err := s.removeRemoteDirRecursive(client, subPath); err != nil {
				return err
			}
		} else {
			if err := client.Remove(subPath); err != nil {
				return err
			}
		}
	}

	return client.RemoveDirectory(dirPath)
}

// Rename renames or moves a remote file/folder.
func (s *Service) Rename(sessionID string, oldPath, newPath string) error {
	sess, err := s.getSession(sessionID)
	if err != nil {
		return err
	}
	return sess.SFTP.Rename(oldPath, newPath)
}

// Chmod updates remote file permissions.
func (s *Service) Chmod(sessionID string, remotePath string, mode uint32) error {
	sess, err := s.getSession(sessionID)
	if err != nil {
		return err
	}
	return sess.SFTP.Chmod(remotePath, os.FileMode(mode))
}

// UploadFile uploads a file from local to remote with progress reporting.
func (s *Service) UploadFile(
	sessionID string,
	localPath string,
	remotePath string,
	onProgress func(transferred, total int64),
) error {
	sess, err := s.getSession(sessionID)
	if err != nil {
		return err
	}

	localFile, err := os.Open(localPath)
	if err != nil {
		return fmt.Errorf("failed to open local file: %w", err)
	}
	defer localFile.Close()

	info, err := localFile.Stat()
	if err != nil {
		return err
	}
	totalBytes := info.Size()

	remoteFile, err := sess.SFTP.Create(remotePath)
	if err != nil {
		return fmt.Errorf("failed to create remote file: %w", err)
	}
	defer remoteFile.Close()

	buf := make([]byte, 64*1024)
	var transferred int64

	for {
		n, readErr := localFile.Read(buf)
		if n > 0 {
			if _, writeErr := remoteFile.Write(buf[:n]); writeErr != nil {
				return writeErr
			}
			transferred += int64(n)
			if onProgress != nil {
				onProgress(transferred, totalBytes)
			}
		}
		if readErr == io.EOF {
			break
		}
		if readErr != nil {
			return readErr
		}
	}

	return nil
}

// DownloadFile downloads a file from remote to local with progress reporting.
func (s *Service) DownloadFile(
	sessionID string,
	remotePath string,
	localPath string,
	onProgress func(transferred, total int64),
) error {
	sess, err := s.getSession(sessionID)
	if err != nil {
		return err
	}

	remoteFile, err := sess.SFTP.Open(remotePath)
	if err != nil {
		return fmt.Errorf("failed to open remote file: %w", err)
	}
	defer remoteFile.Close()

	stat, err := remoteFile.Stat()
	if err != nil {
		return err
	}
	totalBytes := stat.Size()

	// Ensure destination directory exists
	if err := os.MkdirAll(filepath.Dir(localPath), 0755); err != nil {
		return err
	}

	localFile, err := os.Create(localPath)
	if err != nil {
		return fmt.Errorf("failed to create local file: %w", err)
	}
	defer localFile.Close()

	buf := make([]byte, 64*1024)
	var transferred int64

	for {
		n, readErr := remoteFile.Read(buf)
		if n > 0 {
			if _, writeErr := localFile.Write(buf[:n]); writeErr != nil {
				return writeErr
			}
			transferred += int64(n)
			if onProgress != nil {
				onProgress(transferred, totalBytes)
			}
		}
		if readErr == io.EOF {
			break
		}
		if readErr != nil {
			return readErr
		}
	}

	return nil
}

func (s *Service) getSession(sessionID string) (*Session, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	sess, exists := s.sessions[sessionID]
	if !exists || sess == nil {
		return nil, fmt.Errorf("session not found or disconnected: %s", sessionID)
	}
	return sess, nil
}

func pathJoin(base, elem string) string {
	if strings.HasSuffix(base, "/") {
		return base + elem
	}
	return base + "/" + elem
}
