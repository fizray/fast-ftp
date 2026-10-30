package store

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"fast-ftp/backend/models"
	"fast-ftp/backend/security"
	"fast-ftp/backend/sshutil"
	"github.com/google/uuid"
)

type Store struct {
	mu       sync.RWMutex
	filePath string
}

func NewStore() (*Store, error) {
	appData := os.Getenv("APPDATA")
	if appData == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			return nil, err
		}
		appData = filepath.Join(home, "AppData", "Roaming")
	}

	appDir := filepath.Join(appData, "fast-ftp")
	// Migrate legacy easy-ftp config if it exists and fast-ftp does not
	legacyDir := filepath.Join(appData, "easy-ftp")
	if _, err := os.Stat(appDir); os.IsNotExist(err) {
		if _, lErr := os.Stat(legacyDir); lErr == nil {
			_ = os.Rename(legacyDir, appDir)
		}
	}

	if err := os.MkdirAll(appDir, 0700); err != nil {
		return nil, fmt.Errorf("failed to create config dir: %w", err)
	}

	return &Store{
		filePath: filepath.Join(appDir, "connections.json"),
	}, nil
}

func (s *Store) LoadProfiles() ([]models.ConnectionProfile, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if _, err := os.Stat(s.filePath); os.IsNotExist(err) {
		return []models.ConnectionProfile{}, nil
	}

	data, err := os.ReadFile(s.filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read connections file: %w", err)
	}

	var profiles []models.ConnectionProfile
	if err := json.Unmarshal(data, &profiles); err != nil {
		return nil, fmt.Errorf("failed to parse connections json: %w", err)
	}

	return profiles, nil
}

func (s *Store) SaveProfile(p models.ConnectionProfile, rawPassword string, rawPassphrase string) (*models.ConnectionProfile, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	profiles, err := s.loadProfilesUnlocked()
	if err != nil {
		return nil, err
	}

	if p.ID == "" {
		p.ID = uuid.New().String()
	}
	p.Source = "custom"

	// Handle password encryption if RememberPassword is true
	if p.RememberPassword && rawPassword != "" {
		enc, err := security.EncryptString(rawPassword)
		if err != nil {
			return nil, fmt.Errorf("failed to encrypt password with DPAPI: %w", err)
		}
		p.EncryptedPassword = enc
	} else if !p.RememberPassword {
		p.EncryptedPassword = ""
	}

	if rawPassphrase != "" {
		enc, err := security.EncryptString(rawPassphrase)
		if err != nil {
			return nil, fmt.Errorf("failed to encrypt passphrase with DPAPI: %w", err)
		}
		p.EncryptedPassphrase = enc
	}

	// Upsert profile in list
	var found bool
	for i, existing := range profiles {
		if existing.ID == p.ID {
			profiles[i] = p
			found = true
			break
		}
	}
	if !found {
		profiles = append(profiles, p)
	}

	if err := s.saveProfilesUnlocked(profiles); err != nil {
		return nil, err
	}

	// Check if sync to ~/.ssh/config was requested
	if p.SyncToSSHConfig {
		_ = sshutil.AppendToSSHConfig(p)
	}

	return &p, nil
}

func (s *Store) DeleteProfile(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	profiles, err := s.loadProfilesUnlocked()
	if err != nil {
		return err
	}

	var updated []models.ConnectionProfile
	for _, p := range profiles {
		if p.ID != id {
			updated = append(updated, p)
		}
	}

	return s.saveProfilesUnlocked(updated)
}

func (s *Store) loadProfilesUnlocked() ([]models.ConnectionProfile, error) {
	if _, err := os.Stat(s.filePath); os.IsNotExist(err) {
		return []models.ConnectionProfile{}, nil
	}

	data, err := os.ReadFile(s.filePath)
	if err != nil {
		return nil, err
	}

	var profiles []models.ConnectionProfile
	if len(data) == 0 {
		return []models.ConnectionProfile{}, nil
	}
	if err := json.Unmarshal(data, &profiles); err != nil {
		return nil, err
	}
	return profiles, nil
}

func (s *Store) saveProfilesUnlocked(profiles []models.ConnectionProfile) error {
	data, err := json.MarshalIndent(profiles, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.filePath, data, 0600)
}
