package sshutil

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"fast-ftp/backend/models"
)

// GetSSHDir returns the path to the current user's .ssh directory.
func GetSSHDir() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".ssh"), nil
}

// GetSSHConfigPath returns the path to ~/.ssh/config.
func GetSSHConfigPath() (string, error) {
	sshDir, err := GetSSHDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(sshDir, "config"), nil
}

// ParseSSHConfig reads and parses ~/.ssh/config into ConnectionProfiles.
func ParseSSHConfig() ([]models.ConnectionProfile, error) {
	configPath, err := GetSSHConfigPath()
	if err != nil {
		return nil, err
	}

	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		return []models.ConnectionProfile{}, nil
	}

	file, err := os.Open(configPath)
	if err != nil {
		return nil, fmt.Errorf("unable to open ssh config: %w", err)
	}
	defer file.Close()

	var profiles []models.ConnectionProfile
	var currentProfile *models.ConnectionProfile

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())

		// Skip comments and empty lines
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		parts := strings.Fields(line)
		if len(parts) < 2 {
			continue
		}

		key := strings.ToLower(parts[0])
		value := strings.Join(parts[1:], " ")

		if key == "host" {
			// Save previous profile if valid
			if currentProfile != nil && currentProfile.Name != "" && currentProfile.Name != "*" {
				fillProfileDefaults(currentProfile)
				profiles = append(profiles, *currentProfile)
			}

			// Host can have multiple patterns e.g. "Host server1 server2"
			// Use the first pattern as the name
			hostAlias := parts[1]
			if hostAlias == "*" {
				currentProfile = nil
				continue
			}

			currentProfile = &models.ConnectionProfile{
				ID:       "ssh_config_" + hostAlias,
				Name:     hostAlias,
				Host:     hostAlias,
				Port:     22,
				AuthType: models.AuthTypeAgent, // Default to agent / passwordless for ssh config
				Source:   "ssh_config",
			}
			continue
		}

		if currentProfile == nil {
			continue
		}

		switch key {
		case "hostname":
			currentProfile.Host = value
		case "user":
			currentProfile.User = value
		case "port":
			if p, err := strconv.Atoi(value); err == nil && p > 0 {
				currentProfile.Port = p
			}
		case "identityfile":
			resolvedPath := resolveHomePath(value)
			currentProfile.KeyPath = resolvedPath
			currentProfile.AuthType = models.AuthTypeKeyFile
		}
	}

	if currentProfile != nil && currentProfile.Name != "" && currentProfile.Name != "*" {
		fillProfileDefaults(currentProfile)
		profiles = append(profiles, *currentProfile)
	}

	return profiles, scanner.Err()
}

func fillProfileDefaults(p *models.ConnectionProfile) {
	if p.Port == 0 {
		p.Port = 22
	}
	if p.KeyPath != "" {
		p.AuthType = models.AuthTypeKeyFile
	} else {
		p.AuthType = models.AuthTypeAgent
	}
}

func resolveHomePath(path string) string {
	if strings.HasPrefix(path, "~/") || strings.HasPrefix(path, `~\`) {
		home, err := os.UserHomeDir()
		if err == nil {
			return filepath.Join(home, path[2:])
		}
	}
	return path
}

// DiscoverSSHKeys scans ~/.ssh for usable private and public keys.
func DiscoverSSHKeys() ([]models.SSHKeyInfo, error) {
	sshDir, err := GetSSHDir()
	if err != nil {
		return nil, err
	}

	if _, err := os.Stat(sshDir); os.IsNotExist(err) {
		return []models.SSHKeyInfo{}, nil
	}

	entries, err := os.ReadDir(sshDir)
	if err != nil {
		return nil, err
	}

	var keys []models.SSHKeyInfo
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		name := entry.Name()
		// Skip known non-key files
		if name == "config" || name == "known_hosts" || name == "known_hosts.old" ||
			name == "authorized_keys" || name == "allowed_signers" {
			continue
		}

		fullPath := filepath.Join(sshDir, name)

		if strings.HasSuffix(name, ".pub") {
			continue
		}

		// Check if it looks like a private key
		keyType := detectKeyType(fullPath)
		if keyType != "" {
			keys = append(keys, models.SSHKeyInfo{
				Name:      name,
				Path:      fullPath,
				Type:      keyType,
				IsPrivate: true,
			})
		}
	}

	return keys, nil
}

func detectKeyType(path string) string {
	file, err := os.Open(path)
	if err != nil {
		return ""
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	if scanner.Scan() {
		line := scanner.Text()
		if strings.Contains(line, "OPENSSH PRIVATE KEY") {
			return "OpenSSH"
		}
		if strings.Contains(line, "RSA PRIVATE KEY") {
			return "RSA"
		}
		if strings.Contains(line, "EC PRIVATE KEY") {
			return "ECDSA"
		}
		if strings.Contains(line, "PRIVATE KEY") {
			return "SSH Key"
		}
	}
	return ""
}

// AppendToSSHConfig appends a new host entry to ~/.ssh/config.
func AppendToSSHConfig(profile models.ConnectionProfile) error {
	configPath, err := GetSSHConfigPath()
	if err != nil {
		return err
	}

	// Ensure ~/.ssh directory exists
	sshDir := filepath.Dir(configPath)
	if err := os.MkdirAll(sshDir, 0700); err != nil {
		return fmt.Errorf("unable to create .ssh directory: %w", err)
	}

	file, err := os.OpenFile(configPath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0600)
	if err != nil {
		return fmt.Errorf("unable to open .ssh/config for writing: %w", err)
	}
	defer file.Close()

	var sb strings.Builder
	sb.WriteString("\n# Added by fast-ftp\n")
	sb.WriteString(fmt.Sprintf("Host %s\n", profile.Name))
	sb.WriteString(fmt.Sprintf("    HostName %s\n", profile.Host))
	if profile.User != "" {
		sb.WriteString(fmt.Sprintf("    User %s\n", profile.User))
	}
	if profile.Port > 0 && profile.Port != 22 {
		sb.WriteString(fmt.Sprintf("    Port %d\n", profile.Port))
	}
	if profile.KeyPath != "" {
		sb.WriteString(fmt.Sprintf("    IdentityFile %s\n", profile.KeyPath))
	}

	_, err = file.WriteString(sb.String())
	return err
}
