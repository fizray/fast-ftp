package sshutil

import (
	"fmt"
	"net"
	"time"

	"github.com/Microsoft/go-winio"
	"golang.org/x/crypto/ssh"
	"golang.org/x/crypto/ssh/agent"
)

const OpenSSHAgentPipe = `\\.\pipe\openssh-ssh-agent`

// GetSSHAgent connects to the Windows OpenSSH Agent named pipe.
func GetSSHAgent() (agent.ExtendedAgent, net.Conn, error) {
	timeout := 500 * time.Millisecond
	conn, err := winio.DialPipe(OpenSSHAgentPipe, &timeout)
	if err != nil {
		return nil, nil, fmt.Errorf("Windows OpenSSH Agent not reachable: %w", err)
	}
	return agent.NewClient(conn), conn, nil
}

// IsAgentAvailable checks whether the Windows OpenSSH agent pipe is accessible.
func IsAgentAvailable() bool {
	timeout := 150 * time.Millisecond
	conn, err := winio.DialPipe(OpenSSHAgentPipe, &timeout)
	if err != nil {
		return false
	}
	conn.Close()
	return true
}

// GetAgentAuthSigners returns ssh.AuthMethod backed by the SSH Agent if available.
func GetAgentAuthSigners() ([]ssh.Signer, func(), error) {
	ag, conn, err := GetSSHAgent()
	if err != nil {
		return nil, nil, err
	}

	cleanup := func() {
		if conn != nil {
			conn.Close()
		}
	}

	signers, err := ag.Signers()
	if err != nil {
		cleanup()
		return nil, nil, fmt.Errorf("failed to fetch signers from ssh agent: %w", err)
	}

	return signers, cleanup, nil
}
