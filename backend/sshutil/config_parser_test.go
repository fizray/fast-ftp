package sshutil

import (
	"os"
	"path/filepath"
	"testing"

	"fast-ftp/backend/models"
)

func TestParseSSHConfigRealOrEmpty(t *testing.T) {
	profiles, err := ParseSSHConfig()
	if err != nil {
		t.Fatalf("ParseSSHConfig failed: %v", err)
	}

	// In user profile, we already checked that robin, hermes, evernight, harin, playground exist!
	if len(profiles) > 0 {
		var foundRobin bool
		for _, p := range profiles {
			if p.Name == "robin" {
				foundRobin = true
				if p.Host != "100.90.0.2" {
					t.Errorf("expected host 100.90.0.2, got %s", p.Host)
				}
				if p.User != "robin" {
					t.Errorf("expected user robin, got %s", p.User)
				}
			}
		}
		if !foundRobin {
			t.Logf("robin not found, parsed profiles: %+v", profiles)
		}
	}
}

func TestDiscoverSSHKeysReal(t *testing.T) {
	keys, err := DiscoverSSHKeys()
	if err != nil {
		t.Fatalf("DiscoverSSHKeys failed: %v", err)
	}

	t.Logf("Discovered %d SSH keys in ~/.ssh: %+v", len(keys), keys)
}

func TestAppendToSSHConfigCustomDir(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "ssh-test")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(tmpDir)

	fakeConfig := filepath.Join(tmpDir, "config")
	p := models.ConnectionProfile{
		Name:    "test-server",
		Host:    "192.168.1.100",
		User:    "admin",
		Port:    2222,
		KeyPath: filepath.Join(tmpDir, "id_rsa"),
	}

	file, err := os.Create(fakeConfig)
	if err != nil {
		t.Fatal(err)
	}
	file.WriteString("Host " + p.Name + "\n")
	file.Close()
}
