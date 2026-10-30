package terminal

import (
	"fmt"
	"os/exec"

	"fast-ftp/backend/models"
)

// LaunchSSHTerminal opens Windows Terminal or PowerShell connected to the host via SSH.
func LaunchSSHTerminal(profile models.ConnectionProfile) error {
	var sshArgs []string
	if profile.User != "" {
		sshArgs = append(sshArgs, fmt.Sprintf("%s@%s", profile.User, profile.Host))
	} else {
		sshArgs = append(sshArgs, profile.Host)
	}

	if profile.Port > 0 && profile.Port != 22 {
		sshArgs = append(sshArgs, "-p", fmt.Sprintf("%d", profile.Port))
	}

	if profile.KeyPath != "" {
		sshArgs = append(sshArgs, "-i", profile.KeyPath)
	}

	// Try Windows Terminal (wt.exe) first
	if wtPath, err := exec.LookPath("wt.exe"); err == nil {
		cmdArgs := []string{"new-tab", "ssh"}
		cmdArgs = append(cmdArgs, sshArgs...)
		cmd := exec.Command(wtPath, cmdArgs...)
		return cmd.Start()
	}

	// Fallback to powershell.exe
	sshCmd := "ssh"
	for _, arg := range sshArgs {
		sshCmd += " " + arg
	}
	cmd := exec.Command("powershell.exe", "-NoExit", "-Command", sshCmd)
	return cmd.Start()
}
