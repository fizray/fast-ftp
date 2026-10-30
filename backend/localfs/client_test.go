package localfs

import (
	"fmt"
	"testing"
	"time"

	"golang.org/x/sys/windows"
)

func TestWindowsGetLogicalDrivesFast(t *testing.T) {
	start := time.Now()
	bitmask, err := windows.GetLogicalDrives()
	if err != nil {
		t.Fatalf("GetLogicalDrives failed: %v", err)
	}

	var drives []string
	for i := 0; i < 26; i++ {
		if bitmask&(1<<i) != 0 {
			drives = append(drives, fmt.Sprintf("%c:", 'A'+i))
		}
	}
	elapsed := time.Since(start)
	t.Logf("Drives found in %v: %v", elapsed, drives)
}
