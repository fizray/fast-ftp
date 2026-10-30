package main

import (
	"context"
	"fmt"
	"path/filepath"

	"fast-ftp/backend/localfs"
	"fast-ftp/backend/models"
	"fast-ftp/backend/sftp"
	"fast-ftp/backend/sshutil"
	"fast-ftp/backend/store"
	"fast-ftp/backend/terminal"
	"github.com/google/uuid"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx         context.Context
	sftpService *sftp.Service
	store       *store.Store
}

// NewApp creates a new App application struct
func NewApp() *App {
	st, err := store.NewStore()
	if err != nil {
		fmt.Printf("Warning: failed to initialize profile store: %v\n", err)
	}

	return &App{
		sftpService: sftp.NewService(),
		store:       st,
	}
}

// startup is called when the app starts.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// WindowMinimise minimizes the application window.
func (a *App) WindowMinimise() {
	runtime.WindowMinimise(a.ctx)
}

// WindowToggleMaximise toggles maximize / restore window.
func (a *App) WindowToggleMaximise() {
	runtime.WindowToggleMaximise(a.ctx)
}

// WindowClose terminates the application.
func (a *App) WindowClose() {
	runtime.Quit(a.ctx)
}

// --- Host & Profile Discovery / Management ---

// GetSSHConfigProfiles returns all hosts discovered from ~/.ssh/config.
func (a *App) GetSSHConfigProfiles() ([]models.ConnectionProfile, error) {
	return sshutil.ParseSSHConfig()
}

// GetSavedProfiles returns custom saved host connections from local app storage.
func (a *App) GetSavedProfiles() ([]models.ConnectionProfile, error) {
	if a.store == nil {
		return []models.ConnectionProfile{}, nil
	}
	return a.store.LoadProfiles()
}

// SaveProfile saves or updates a connection profile.
func (a *App) SaveProfile(p models.ConnectionProfile, rawPassword string, rawPassphrase string) (*models.ConnectionProfile, error) {
	if a.store == nil {
		return nil, fmt.Errorf("storage not initialized")
	}
	return a.store.SaveProfile(p, rawPassword, rawPassphrase)
}

// DeleteSavedProfile removes a profile from local storage.
func (a *App) DeleteSavedProfile(id string) error {
	if a.store == nil {
		return fmt.Errorf("storage not initialized")
	}
	return a.store.DeleteProfile(id)
}

// GetDiscoveredSSHKeys returns available private keys in ~/.ssh/.
func (a *App) GetDiscoveredSSHKeys() ([]models.SSHKeyInfo, error) {
	return sshutil.DiscoverSSHKeys()
}

// IsSSHAgentAvailable checks if the Windows OpenSSH agent pipe is active.
func (a *App) IsSSHAgentAvailable() bool {
	return sshutil.IsAgentAvailable()
}

// --- SFTP Sessions ---

// ConnectSFTP opens an SFTP connection and returns a unique sessionID.
func (a *App) ConnectSFTP(req models.ConnectRequest) (string, error) {
	return a.sftpService.Connect(a.ctx, req)
}

// DisconnectSFTP terminates an active SFTP session.
func (a *App) DisconnectSFTP(sessionID string) {
	a.sftpService.Disconnect(sessionID)
}

// GetRemoteWorkingDir returns the initial/current working directory of the server.
func (a *App) GetRemoteWorkingDir(sessionID string) (string, error) {
	return a.sftpService.GetWorkingDir(sessionID)
}

// ListRemoteFiles retrieves directory contents from the remote server.
func (a *App) ListRemoteFiles(sessionID string, remotePath string, showHidden bool) ([]models.FileItem, error) {
	return a.sftpService.ListFiles(sessionID, remotePath, showHidden)
}

// ReadRemoteFile retrieves the text contents of a remote file for the code editor.
func (a *App) ReadRemoteFile(sessionID string, remotePath string) (string, error) {
	return a.sftpService.ReadFileContent(sessionID, remotePath, 10*1024*1024)
}

// WriteRemoteFile updates the content of a remote file from the code editor.
func (a *App) WriteRemoteFile(sessionID string, remotePath string, content string) error {
	return a.sftpService.WriteFileContent(sessionID, remotePath, content)
}

// CreateRemoteDirectory creates a new folder on the remote server.
func (a *App) CreateRemoteDirectory(sessionID string, remotePath string) error {
	return a.sftpService.CreateDirectory(sessionID, remotePath)
}

// DeleteRemotePath removes a remote file or folder.
func (a *App) DeleteRemotePath(sessionID string, remotePath string, isDir bool) error {
	return a.sftpService.DeletePath(sessionID, remotePath, isDir)
}

// RenameRemotePath renames or moves a remote file or folder.
func (a *App) RenameRemotePath(sessionID string, oldPath, newPath string) error {
	return a.sftpService.Rename(sessionID, oldPath, newPath)
}

// ChmodRemotePath changes Unix permissions for a remote file or directory.
func (a *App) ChmodRemotePath(sessionID string, remotePath string, mode uint32) error {
	return a.sftpService.Chmod(sessionID, remotePath, mode)
}

// UploadFile transfers a file from local to remote while emitting progress events.
func (a *App) UploadFile(sessionID string, localPath string, remotePath string) error {
	transferID := uuid.New().String()
	fileName := filepath.Base(localPath)

	emitProgress := func(transferred, total int64) {
		pct := float64(0)
		if total > 0 {
			pct = float64(transferred) / float64(total) * 100.0
		}
		status := "transferring"
		if transferred >= total && total > 0 {
			status = "completed"
		}
		runtime.EventsEmit(a.ctx, "transfer:progress", models.TransferProgress{
			SessionID:        sessionID,
			TransferID:       transferID,
			Direction:        "upload",
			SourcePath:       localPath,
			DestPath:         remotePath,
			FileName:         fileName,
			BytesTotal:       total,
			BytesTransferred: transferred,
			Percentage:       pct,
			Status:           status,
		})
	}

	err := a.sftpService.UploadFile(sessionID, localPath, remotePath, emitProgress)
	if err != nil {
		runtime.EventsEmit(a.ctx, "transfer:progress", models.TransferProgress{
			SessionID:    sessionID,
			TransferID:   transferID,
			Direction:    "upload",
			SourcePath:   localPath,
			DestPath:     remotePath,
			FileName:     fileName,
			Status:       "error",
			ErrorMessage: err.Error(),
		})
		return err
	}
	return nil
}

// DownloadFile transfers a file from remote to local while emitting progress events.
func (a *App) DownloadFile(sessionID string, remotePath string, localPath string) error {
	transferID := uuid.New().String()
	fileName := filepath.Base(remotePath)

	emitProgress := func(transferred, total int64) {
		pct := float64(0)
		if total > 0 {
			pct = float64(transferred) / float64(total) * 100.0
		}
		status := "transferring"
		if transferred >= total && total > 0 {
			status = "completed"
		}
		runtime.EventsEmit(a.ctx, "transfer:progress", models.TransferProgress{
			SessionID:        sessionID,
			TransferID:       transferID,
			Direction:        "download",
			SourcePath:       remotePath,
			DestPath:         localPath,
			FileName:         fileName,
			BytesTotal:       total,
			BytesTransferred: transferred,
			Percentage:       pct,
			Status:           status,
		})
	}

	err := a.sftpService.DownloadFile(sessionID, remotePath, localPath, emitProgress)
	if err != nil {
		runtime.EventsEmit(a.ctx, "transfer:progress", models.TransferProgress{
			SessionID:    sessionID,
			TransferID:   transferID,
			Direction:    "download",
			SourcePath:   remotePath,
			DestPath:     localPath,
			FileName:     fileName,
			Status:       "error",
			ErrorMessage: err.Error(),
		})
		return err
	}
	return nil
}

// --- Local Filesystem Operations ---

// GetLocalDrives returns the available Windows drive letters.
func (a *App) GetLocalDrives() ([]models.DriveInfo, error) {
	return localfs.GetDrives()
}

// GetLocalHomeDir returns the current user's home folder.
func (a *App) GetLocalHomeDir() string {
	return localfs.GetHomeDir()
}

// SelectLocalDirectoryDialog opens native Windows folder selection dialog.
func (a *App) SelectLocalDirectoryDialog(defaultPath string) (string, error) {
	if defaultPath == "" {
		defaultPath = localfs.GetHomeDir()
	}
	res, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		DefaultDirectory: defaultPath,
		Title:            "Select Local Folder",
	})
	return res, err
}

// ListLocalFiles lists files and folders inside a local directory.
func (a *App) ListLocalFiles(localPath string, showHidden bool) ([]models.FileItem, error) {
	return localfs.ListDirectory(localPath, showHidden)
}

// CreateLocalDirectory creates a new directory on the local system.
func (a *App) CreateLocalDirectory(localPath string) error {
	return localfs.CreateDirectory(localPath)
}

// DeleteLocalPath removes a local file or folder.
func (a *App) DeleteLocalPath(localPath string) error {
	return localfs.DeletePath(localPath)
}

// RenameLocalPath renames a local file or directory.
func (a *App) RenameLocalPath(oldPath, newPath string) error {
	return localfs.RenamePath(oldPath, newPath)
}

// --- Terminal Integration ---

// LaunchSSHTerminal opens Windows Terminal or PowerShell connecting to the host via SSH.
func (a *App) LaunchSSHTerminal(p models.ConnectionProfile) error {
	return terminal.LaunchSSHTerminal(p)
}
