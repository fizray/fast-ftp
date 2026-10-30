package store

import (
	"os"
	"path/filepath"
	"testing"

	"fast-ftp/backend/models"
	"fast-ftp/backend/security"
)

func TestStoreSaveAndLoad(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "store-test")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(tmpDir)

	s := &Store{
		filePath: filepath.Join(tmpDir, "connections.json"),
	}

	p := models.ConnectionProfile{
		Name:             "prod-web",
		Host:             "192.168.1.50",
		Port:             22,
		User:             "admin",
		AuthType:         models.AuthTypePassword,
		RememberPassword: true,
	}

	rawPassword := "SecurePass123!"
	saved, err := s.SaveProfile(p, rawPassword, "")
	if err != nil {
		t.Fatalf("SaveProfile failed: %v", err)
	}

	if saved.ID == "" {
		t.Fatalf("Expected generated ID")
	}

	if saved.EncryptedPassword == "" || saved.EncryptedPassword == rawPassword {
		t.Fatalf("Expected encrypted password string")
	}

	// Verify we can decrypt it back
	decrypted, err := security.DecryptString(saved.EncryptedPassword)
	if err != nil {
		t.Fatalf("DecryptString failed: %v", err)
	}
	if decrypted != rawPassword {
		t.Fatalf("Decrypted mismatch: got %s, want %s", decrypted, rawPassword)
	}

	// Load list
	list, err := s.LoadProfiles()
	if err != nil {
		t.Fatalf("LoadProfiles failed: %v", err)
	}
	if len(list) != 1 {
		t.Fatalf("Expected 1 profile, got %d", len(list))
	}
	if list[0].Name != "prod-web" {
		t.Fatalf("Profile name mismatch: %s", list[0].Name)
	}

	// Delete
	if err := s.DeleteProfile(saved.ID); err != nil {
		t.Fatalf("DeleteProfile failed: %v", err)
	}

	listAfter, err := s.LoadProfiles()
	if err != nil {
		t.Fatalf("LoadProfiles after delete failed: %v", err)
	}
	if len(listAfter) != 0 {
		t.Fatalf("Expected 0 profiles after delete, got %d", len(listAfter))
	}
}
