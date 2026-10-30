package localfs

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"syscall"

	"fast-ftp/backend/models"
	"golang.org/x/sys/windows"
)

// GetDrives returns available Windows drive letters using fast Win32 API.
func GetDrives() ([]models.DriveInfo, error) {
	bitmask, err := windows.GetLogicalDrives()
	if err != nil {
		// Fallback to C:
		return []models.DriveInfo{
			{Letter: "C:", Label: "Local Disk (C:)"},
		}, nil
	}

	var drives []models.DriveInfo
	for i := 0; i < 26; i++ {
		if bitmask&(1<<i) != 0 {
			letter := fmt.Sprintf("%c:", 'A'+i)
			drives = append(drives, models.DriveInfo{
				Letter: letter,
				Label:  fmt.Sprintf("Local Disk (%s)", letter),
			})
		}
	}
	return drives, nil
}

// GetHomeDir returns the user home directory.
func GetHomeDir() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return `C:\`
	}
	return home
}

// CleanPath ensures Windows drive roots have a trailing backslash e.g. "C:\" instead of "C:"
func CleanPath(dirPath string) string {
	if dirPath == "" {
		return GetHomeDir()
	}
	// "C:" -> "C:\"
	if len(dirPath) == 2 && dirPath[1] == ':' {
		return dirPath + `\`
	}
	if len(dirPath) == 3 && dirPath[1] == ':' && (dirPath[2] == '/' || dirPath[2] == '\\') {
		return fmt.Sprintf("%c:\\", dirPath[0])
	}
	return filepath.Clean(dirPath)
}

// ListDirectory lists files and folders inside a local directory.
func ListDirectory(dirPath string, showHidden bool) ([]models.FileItem, error) {
	dirPath = CleanPath(dirPath)

	entries, err := os.ReadDir(dirPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read local directory %s: %w", dirPath, err)
	}

	var items []models.FileItem
	for _, entry := range entries {
		info, err := entry.Info()
		if err != nil {
			continue
		}

		name := entry.Name()
		fullPath := joinPath(dirPath, name)
		isHidden := strings.HasPrefix(name, ".") || isWindowsHidden(fullPath)
		if isHidden && !showHidden {
			continue
		}

		isDir := entry.IsDir()
		isSymlink := (info.Mode() & os.ModeSymlink) != 0
		var linkTarget string
		if isSymlink {
			target, _ := os.Readlink(fullPath)
			linkTarget = target
		}

		mode := info.Mode().String()
		octalMode := fmt.Sprintf("%04o", info.Mode().Perm())

		items = append(items, models.FileItem{
			Name:        name,
			Path:        fullPath,
			Size:        info.Size(),
			Mode:        mode,
			OctalMode:   octalMode,
			NumericMode: uint32(info.Mode().Perm()),
			IsDir:       isDir,
			IsSymlink:   isSymlink,
			LinkTarget:  linkTarget,
			ModTime:     info.ModTime(),
			Extension:   strings.ToLower(filepath.Ext(name)),
			IsHidden:    isHidden,
		})
	}

	return items, nil
}

func joinPath(dirPath, name string) string {
	if strings.HasSuffix(dirPath, `\`) || strings.HasSuffix(dirPath, `/`) {
		return dirPath + name
	}
	return dirPath + `\` + name
}

func isWindowsHidden(path string) bool {
	pointer, err := syscall.UTF16PtrFromString(path)
	if err != nil {
		return false
	}
	attributes, err := syscall.GetFileAttributes(pointer)
	if err != nil {
		return false
	}
	return attributes&syscall.FILE_ATTRIBUTE_HIDDEN != 0
}

// CreateDirectory creates a new local directory.
func CreateDirectory(dirPath string) error {
	return os.MkdirAll(dirPath, 0755)
}

// DeletePath deletes a local file or directory.
func DeletePath(path string) error {
	return os.RemoveAll(path)
}

// RenamePath renames a local file or directory.
func RenamePath(oldPath, newPath string) error {
	return os.Rename(oldPath, newPath)
}
