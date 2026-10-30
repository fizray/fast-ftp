package models

import "time"

type FileItem struct {
	Name        string    `json:"name"`
	Path        string    `json:"path"`
	Size        int64     `json:"size"`
	Mode        string    `json:"mode"`        // e.g. "-rw-r--r--"
	OctalMode   string    `json:"octalMode"`   // e.g. "0644"
	NumericMode uint32    `json:"numericMode"` // raw os.FileMode uint32
	IsDir       bool      `json:"isDir"`
	IsSymlink   bool      `json:"isSymlink"`
	LinkTarget  string    `json:"linkTarget,omitempty"`
	ModTime     time.Time `json:"modTime"`
	Extension   string    `json:"extension"`
	IsHidden    bool      `json:"isHidden"`
}

type DriveInfo struct {
	Letter string `json:"letter"` // e.g. "C:"
	Label  string `json:"label"`  // e.g. "Local Disk (C:)"
}

type TransferProgress struct {
	SessionID        string  `json:"sessionId"`
	TransferID       string  `json:"transferId"`
	Direction        string  `json:"direction"` // "upload" or "download"
	SourcePath       string  `json:"sourcePath"`
	DestPath         string  `json:"destPath"`
	FileName         string  `json:"fileName"`
	BytesTotal       int64   `json:"bytesTotal"`
	BytesTransferred int64   `json:"bytesTransferred"`
	Percentage       float64 `json:"percentage"`
	Speed            string  `json:"speed"`
	Status           string  `json:"status"` // "transferring", "completed", "error"
	ErrorMessage     string  `json:"errorMessage,omitempty"`
}
