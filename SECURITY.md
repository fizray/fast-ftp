# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

---

## Security Architecture

fast-ftp is designed with security as a core tenet:

1. **Zero Plaintext Credentials**:
   - Connection credentials (passwords, key passphrases) are never stored in plaintext.
   - On Windows, secrets are encrypted using the **Windows Data Protection API (DPAPI)** via `CryptProtectData`. Ciphertexts are bound to the local user's account and cannot be decrypted by unauthorized users or transferred between machines.

2. **SSH Agent & Key Authentication**:
   - fast-ftp integrates with the standard Windows OpenSSH Agent named pipe (`\\.\pipe\openssh-ssh-agent`), eliminating the need to expose private key passphrases to the application.

3. **Memory Safety**:
   - The backend is written in Go, providing memory safety and buffer-overflow protection against malicious network inputs.

---

## Reporting a Vulnerability

If you discover a security vulnerability within fast-ftp, please do **NOT** open a public issue.

Instead, please send an advisory or report directly to the repository maintainer. Please include:
- A description of the vulnerability.
- Steps to reproduce or proof-of-concept.
- Potential impact and affected components.

We will acknowledge receipt within 48 hours and work with you to patch and release a fix promptly.

