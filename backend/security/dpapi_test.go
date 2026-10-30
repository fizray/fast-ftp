package security

import (
	"testing"
)

func TestDPAPIEncryptDecrypt(t *testing.T) {
	testSecret := "my-super-secret-ssh-password-12345!"

	encrypted, err := EncryptString(testSecret)
	if err != nil {
		t.Fatalf("EncryptString failed: %v", err)
	}

	if encrypted == "" || encrypted == testSecret {
		t.Fatalf("Encrypted string is invalid: %s", encrypted)
	}

	decrypted, err := DecryptString(encrypted)
	if err != nil {
		t.Fatalf("DecryptString failed: %v", err)
	}

	if decrypted != testSecret {
		t.Fatalf("Decrypted string mismatch: got %q, want %q", decrypted, testSecret)
	}
}

func TestDPAPIEmpty(t *testing.T) {
	enc, err := EncryptString("")
	if err != nil || enc != "" {
		t.Fatalf("Expected empty result for empty input")
	}

	dec, err := DecryptString("")
	if err != nil || dec != "" {
		t.Fatalf("Expected empty result for empty input")
	}
}
