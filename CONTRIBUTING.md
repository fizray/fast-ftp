# Contributing to fast-ftp

Thank you for considering contributing to fast-ftp! We welcome contributions from developers of all skill levels.

---

## Code of Conduct

Please be respectful, constructive, and polite when engaging in discussions, opening issues, or submitting pull requests.

---

## Getting Started

### Prerequisites

Make sure you have installed:
- **Go 1.24+**: [golang.org](https://golang.org)
- **Bun** (or Node.js 18+): [bun.sh](https://bun.sh)
- **Wails CLI v2.17+**:
  ```bash
  go install github.com/wailsapp/wails/v2/cmd/wails@latest
  ```

### Setting Up the Environment

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/fizray/fast-ftp.git
   cd fast-ftp
   ```

2. Install frontend dependencies:
   ```bash
   cd frontend
   bun install
   cd ..
   ```

3. Run the development server:
   ```bash
   wails dev
   ```

---

## Development Workflow

### Testing and Validation

Before submitting any pull request, ensure all checks pass:

- **Using PowerShell (Windows)**:
  ```powershell
  .\scripts\build.ps1 -Task check
  ```

- **Using Make (Unix/Git Bash)**:
  ```bash
  make check
  ```

- **Manual Commands**:
  ```bash
  go fmt ./...
  go vet ./...
  go test -v ./...
  cd frontend && bun run typecheck && bun run build
  ```

---

## Commit Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) convention:

- `feat:` A new feature
- `fix:` A bug fix
- `docs:` Documentation-only changes
- `style:` Changes that do not affect the meaning of the code (formatting, white-space)
- `refactor:` A code change that neither fixes a bug nor adds a feature
- `perf:` A code change that improves performance
- `test:` Adding missing tests or correcting existing tests
- `chore:` Changes to the build process or auxiliary tools and libraries

**Example**:
```bash
git commit -m "feat(terminal): add support for opening remote path in Windows Terminal"
```

---

## Pull Request Process

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Make your changes and commit with descriptive messages.
3. Verify that all automated tests and typechecks succeed.
4. Push to your fork and submit a Pull Request describing your changes and referencing any related issues.

