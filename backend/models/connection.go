package models

type AuthType string

const (
	AuthTypeAgent    AuthType = "agent"
	AuthTypeKeyFile  AuthType = "key"
	AuthTypePassword AuthType = "password"
)

type ConnectionProfile struct {
	ID                  string   `json:"id"`
	Name                string   `json:"name"`
	Host                string   `json:"host"`
	Port                int      `json:"port"`
	User                string   `json:"user"`
	AuthType            AuthType `json:"authType"`
	KeyPath             string   `json:"keyPath,omitempty"`
	EncryptedPassword   string   `json:"encryptedPassword,omitempty"`
	EncryptedPassphrase string   `json:"encryptedPassphrase,omitempty"`
	RememberPassword    bool     `json:"rememberPassword"`
	Source              string   `json:"source"` // "ssh_config" or "custom"
	SyncToSSHConfig     bool     `json:"syncToSSHConfig,omitempty"`
	Group               string   `json:"group,omitempty"`
	ColorBadge          string   `json:"colorBadge,omitempty"`
}

type ConnectRequest struct {
	Profile    ConnectionProfile `json:"profile"`
	Password   string            `json:"password,omitempty"`   // Provided interactively if not remembered
	Passphrase string            `json:"passphrase,omitempty"` // For encrypted private key
}

type SSHKeyInfo struct {
	Name      string `json:"name"`
	Path      string `json:"path"`
	Type      string `json:"type"` // e.g., "ED25519", "RSA"
	IsPrivate bool   `json:"isPrivate"`
}
