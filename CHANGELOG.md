# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **Project Rebranding**: Renamed project to `fast-ftp` for higher performance focus and developer clarity.
- **Monochrome Dark Theme**: Overhauled entire UI to a clean, high-contrast monochrome design (Zinc 950 / neutral charcoal) eliminating saturated accent glows.

## [0.1.0] - 2026-10-29

### Added
- **Dual-Pane File Manager**: Side-by-side local disk and remote SFTP browsing with breadcrumbs and fast sorting.
- **SSH Config Discovery**: Automatic detection and import of host configurations from `~/.ssh/config`.
- **Windows DPAPI Security**: Cryptographic protection for stored passwords and key passphrases via native Windows DPAPI.
- **SSH Key & Agent Support**: Native discovery of private keys in `~/.ssh` and OpenSSH Agent pipe support (`\\.\pipe\openssh-ssh-agent`).
- **Interactive Remote Editor**: In-app Monaco/text editing modal for remote configuration and script files with live save.
- **Transfer Queue & Progress**: Real-time progress bar, speed estimation, error handling, and status feedback for uploads and downloads.
- **Terminal Integration**: Direct launcher for Windows Terminal / PowerShell SSH sessions targeting current remote server directory.
- **Obsidian Dark Theme**: Modern desktop UI built with Tailwind CSS, Lucide icons, and frameless window controls.

