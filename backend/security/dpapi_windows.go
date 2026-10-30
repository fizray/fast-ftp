package security

import (
	"encoding/base64"
	"unsafe"

	"golang.org/x/sys/windows"
)

// EncryptString encrypts a sensitive string using Windows DPAPI CryptProtectData.
func EncryptString(plain string) (string, error) {
	if plain == "" {
		return "", nil
	}
	data := []byte(plain)
	var inBlob windows.DataBlob
	inBlob.Size = uint32(len(data))
	inBlob.Data = &data[0]

	var outBlob windows.DataBlob
	err := windows.CryptProtectData(&inBlob, nil, nil, 0, nil, windows.CRYPTPROTECT_UI_FORBIDDEN, &outBlob)
	if err != nil {
		return "", err
	}
	defer windows.LocalFree(windows.Handle(unsafe.Pointer(outBlob.Data)))

	out := make([]byte, outBlob.Size)
	copy(out, unsafe.Slice(outBlob.Data, outBlob.Size))
	return base64.StdEncoding.EncodeToString(out), nil
}

// DecryptString decrypts a base64 encoded DPAPI ciphertext string.
func DecryptString(encryptedBase64 string) (string, error) {
	if encryptedBase64 == "" {
		return "", nil
	}
	data, err := base64.StdEncoding.DecodeString(encryptedBase64)
	if err != nil {
		return "", err
	}
	if len(data) == 0 {
		return "", nil
	}

	var inBlob windows.DataBlob
	inBlob.Size = uint32(len(data))
	inBlob.Data = &data[0]

	var outBlob windows.DataBlob
	err = windows.CryptUnprotectData(&inBlob, nil, nil, 0, nil, windows.CRYPTPROTECT_UI_FORBIDDEN, &outBlob)
	if err != nil {
		return "", err
	}
	defer windows.LocalFree(windows.Handle(unsafe.Pointer(outBlob.Data)))

	out := make([]byte, outBlob.Size)
	copy(out, unsafe.Slice(outBlob.Data, outBlob.Size))
	return string(out), nil
}
