import React, { useState, useEffect } from 'react';
import {
  Server,
  Plus,
  Trash2,
  Save,
  KeyRound,
  ShieldCheck,
  Lock,
  Search,
  X,
  Terminal,
  ExternalLink,
  Check
} from 'lucide-react';
import { models } from '../../wailsjs/go/models';
import {
  GetSSHConfigProfiles,
  GetSavedProfiles,
  SaveProfile,
  DeleteSavedProfile,
  GetDiscoveredSSHKeys,
  IsSSHAgentAvailable,
  LaunchSSHTerminal
} from '../../wailsjs/go/main/App';

interface SiteManagerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (profile: models.ConnectionProfile, password?: string, passphrase?: string) => void;
  isConnecting?: boolean;
  initialProfileId?: string | null;
}

export const SiteManagerDrawer: React.FC<SiteManagerDrawerProps> = ({
  isOpen,
  onClose,
  onConnect,
  isConnecting = false,
  initialProfileId,
}) => {
  const [sshConfigHosts, setSshConfigHosts] = useState<models.ConnectionProfile[]>([]);
  const [savedHosts, setSavedHosts] = useState<models.ConnectionProfile[]>([]);
  const [discoveredKeys, setDiscoveredKeys] = useState<models.SSHKeyInfo[]>([]);
  const [agentAvailable, setAgentAvailable] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [selectedId, setSelectedId] = useState<string>('');
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState<number>(22);
  const [user, setUser] = useState('');
  const [authType, setAuthType] = useState<string>('agent');
  const [keyPath, setKeyPath] = useState('');
  const [password, setPassword] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [rememberPassword, setRememberPassword] = useState(true);
  const [syncToSSHConfig, setSyncToSSHConfig] = useState(false);
  const [isSSHConfigSource, setIsSSHConfigSource] = useState(false);

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      const [configHosts, customHosts, keys, agentOk] = await Promise.all([
        GetSSHConfigProfiles(),
        GetSavedProfiles(),
        GetDiscoveredSSHKeys(),
        IsSSHAgentAvailable(),
      ]);

      setSshConfigHosts(configHosts || []);
      setSavedHosts(customHosts || []);
      setDiscoveredKeys(keys || []);
      setAgentAvailable(agentOk);

      const allHosts = [...(customHosts || []), ...(configHosts || [])];
      if (initialProfileId) {
        const found = allHosts.find(p => p.id === initialProfileId || p.name === initialProfileId || p.host === initialProfileId);
        if (found) {
          selectProfile(found);
          return;
        }
      }

      if (!selectedId && allHosts.length > 0) {
        const first = (customHosts && customHosts.length > 0) ? customHosts[0] : configHosts[0];
        selectProfile(first);
      }
    } catch (err: any) {
      console.error('Failed to load host profiles:', err);
    }
  };

  const selectProfile = (p: models.ConnectionProfile) => {
    setSelectedId(p.id);
    setName(p.name);
    setHost(p.host);
    setPort(p.port || 22);
    setUser(p.user || '');
    setAuthType(p.authType || 'agent');
    setKeyPath(p.keyPath || '');
    setPassword('');
    setPassphrase('');
    setRememberPassword(!!p.rememberPassword);
    setSyncToSSHConfig(!!p.syncToSSHConfig);
    setIsSSHConfigSource(p.source === 'ssh_config');
    setMessage(null);
  };

  const handleNewProfile = () => {
    setSelectedId('');
    setName('New Server');
    setHost('');
    setPort(22);
    setUser('');
    setAuthType(agentAvailable ? 'agent' : 'key');
    setKeyPath(discoveredKeys.length > 0 ? discoveredKeys[0].path : '');
    setPassword('');
    setPassphrase('');
    setRememberPassword(true);
    setSyncToSSHConfig(false);
    setIsSSHConfigSource(false);
    setMessage(null);
  };

  const handleSave = async () => {
    if (!host.trim()) {
      setMessage({ text: 'Host Name / IP cannot be empty', type: 'error' });
      return;
    }

    try {
      const profileToSave = new models.ConnectionProfile({
        id: selectedId.startsWith('ssh_config_') ? '' : selectedId,
        name: name.trim(),
        host: host.trim(),
        port: Number(port) || 22,
        user: user.trim(),
        authType: authType,
        keyPath: authType === 'key' ? keyPath : '',
        rememberPassword: rememberPassword,
        syncToSSHConfig: syncToSSHConfig,
        source: 'custom',
      });

      const saved = await SaveProfile(profileToSave, password, passphrase);
      setMessage({ text: 'Host configuration saved successfully!', type: 'success' });
      await loadData();
      if (saved) {
        setSelectedId(saved.id);
        setIsSSHConfigSource(false);
      }
    } catch (err: any) {
      setMessage({ text: `Failed to save: ${err}`, type: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!selectedId || isSSHConfigSource) return;
    if (!confirm(`Are you sure you want to delete session "${name}"?`)) return;

    try {
      await DeleteSavedProfile(selectedId);
      await loadData();
      handleNewProfile();
    } catch (err: any) {
      setMessage({ text: `Failed to delete: ${err}`, type: 'error' });
    }
  };

  const handleConnectClick = () => {
    if (!host.trim()) {
      setMessage({ text: 'Hostname is required to connect', type: 'error' });
      return;
    }

    const currentProfile = new models.ConnectionProfile({
      id: selectedId || 'temp_' + Date.now(),
      name: name || host,
      host: host.trim(),
      port: Number(port) || 22,
      user: user.trim(),
      authType: authType,
      keyPath: authType === 'key' ? keyPath : '',
      rememberPassword: rememberPassword,
      source: isSSHConfigSource ? 'ssh_config' : 'custom',
    });

    onConnect(currentProfile, password, passphrase);
  };

  const handleTerminalLaunch = async () => {
    try {
      const p = new models.ConnectionProfile({
        name,
        host,
        port: Number(port) || 22,
        user,
        keyPath: authType === 'key' ? keyPath : '',
      });
      await LaunchSSHTerminal(p);
    } catch (err: any) {
      alert(`Terminal launch error: ${err}`);
    }
  };

  const filteredSshConfig = sshConfigHosts.filter(
    h => h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
         h.host.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSaved = savedHosts.filter(
    h => h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
         h.host.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/70 backdrop-blur-xs transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Slide-over Drawer Panel */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-3xl bg-[#09090b] border-l border-[#27272a] shadow-2xl flex flex-col transition-transform duration-300 ease-in-out text-zinc-200 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#27272a] bg-[#121214]">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-zinc-300" />
            <h2 className="font-semibold text-sm text-zinc-100">Site Manager</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Content: Two columns */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Column: Host List */}
          <div className="w-72 border-r border-[#27272a] flex flex-col bg-[#121214]">
            <div className="p-3 border-b border-[#27272a] flex flex-col gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Filter hosts..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
                />
              </div>
              <button
                onClick={handleNewProfile}
                className="flex items-center justify-center gap-1.5 w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 text-xs font-medium py-1.5 px-3 rounded-lg transition shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                New Connection
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-3">
              {/* SSH Config Section */}
              <div>
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 flex items-center justify-between font-mono">
                  <span>~/.ssh/config ({filteredSshConfig.length})</span>
                  <span className="bg-zinc-800 text-zinc-400 px-1 py-0.2 rounded text-[9px]">auto</span>
                </div>
                <div className="space-y-0.5 mt-1">
                  {filteredSshConfig.map(p => (
                    <button
                      key={p.id}
                      onClick={() => selectProfile(p)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition cursor-pointer ${
                        selectedId === p.id
                          ? 'bg-zinc-800 text-white font-medium border-l-2 border-zinc-200 shadow-xs'
                          : 'text-zinc-300 hover:bg-zinc-800/50'
                      }`}
                    >
                      <div className="truncate">
                        <div className="truncate font-medium">{p.name}</div>
                        <div className={`text-[10px] font-mono truncate ${selectedId === p.id ? 'text-zinc-300' : 'text-zinc-500'}`}>
                          {p.user ? `${p.user}@` : ''}{p.host}:{p.port || 22}
                        </div>
                      </div>
                      <span className={`text-[9px] px-1 py-0.5 rounded font-mono ${
                        selectedId === p.id ? 'bg-zinc-700 text-white' : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
                      }`}>
                        SSH
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Saved Custom Connections */}
              <div>
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 font-mono">
                  <span>Saved Sites ({filteredSaved.length})</span>
                </div>
                <div className="space-y-0.5 mt-1">
                  {filteredSaved.map(p => (
                    <button
                      key={p.id}
                      onClick={() => selectProfile(p)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition cursor-pointer ${
                        selectedId === p.id
                          ? 'bg-zinc-800 text-white font-medium border-l-2 border-zinc-200 shadow-xs'
                          : 'text-zinc-300 hover:bg-zinc-800/50'
                      }`}
                    >
                      <div className="truncate">
                        <div className="truncate font-medium">{p.name}</div>
                        <div className={`text-[10px] font-mono truncate ${selectedId === p.id ? 'text-zinc-300' : 'text-zinc-500'}`}>
                          {p.user ? `${p.user}@` : ''}{p.host}:{p.port || 22}
                        </div>
                      </div>
                      <span className={`text-[9px] px-1 py-0.5 rounded font-mono ${
                        selectedId === p.id ? 'bg-zinc-700 text-white' : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
                      }`}>
                        Custom
                      </span>
                    </button>
                  ))}
                  {filteredSaved.length === 0 && (
                    <div className="text-[11px] text-zinc-500 px-3 py-2 italic font-mono">No custom sites saved</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Host Settings Form */}
          <div className="flex-1 flex flex-col overflow-y-auto p-5 bg-[#09090b]">
            {message && (
              <div className={`mb-3 px-3 py-2 rounded-lg text-xs flex items-center gap-2 ${
                message.type === 'success'
                  ? 'bg-zinc-900 border border-zinc-700 text-zinc-200'
                  : 'bg-red-950/60 border border-red-900/80 text-red-200'
              }`}>
                {message.type === 'success' ? <Check className="w-3.5 h-3.5 text-zinc-200" /> : <X className="w-3.5 h-3.5 text-red-400" />}
                {message.text}
              </div>
            )}

            {isSSHConfigSource && (
              <div className="mb-3 bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-300 flex items-center justify-between">
                <span>Discovered from <code className="font-mono text-zinc-200">~/.ssh/config</code></span>
                <button
                  type="button"
                  onClick={handleTerminalLaunch}
                  className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-2.5 py-1 rounded text-[11px] border border-zinc-700 transition cursor-pointer"
                >
                  <Terminal className="w-3 h-3" />
                  Terminal
                </button>
              </div>
            )}

            <div className="space-y-3.5 flex-1">
              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-2">
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Session / Host Alias</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. staging-server, prod-01"
                    className="w-full bg-[#121214] border border-[#27272a] rounded px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Port</label>
                  <input
                    type="number"
                    value={port}
                    onChange={e => setPort(parseInt(e.target.value) || 22)}
                    className="w-full bg-[#121214] border border-[#27272a] rounded px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Host Name / IP</label>
                  <input
                    type="text"
                    value={host}
                    onChange={e => setHost(e.target.value)}
                    placeholder="192.168.1.100 or server.net"
                    className="w-full bg-[#121214] border border-[#27272a] rounded px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">User Name</label>
                  <input
                    type="text"
                    value={user}
                    onChange={e => setUser(e.target.value)}
                    placeholder="e.g. root, ubuntu"
                    className="w-full bg-[#121214] border border-[#27272a] rounded px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-500 font-mono"
                  />
                </div>
              </div>

              {/* Auth selector */}
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">Authentication Method</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAuthType('agent')}
                    className={`py-1.5 px-2 rounded border text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      authType === 'agent'
                        ? 'border-zinc-400 bg-zinc-800 text-white'
                        : 'border-[#27272a] bg-[#121214] text-zinc-400 hover:bg-zinc-800/60'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-zinc-300" />
                    SSH Agent
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuthType('key')}
                    className={`py-1.5 px-2 rounded border text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      authType === 'key'
                        ? 'border-zinc-400 bg-zinc-800 text-white'
                        : 'border-[#27272a] bg-[#121214] text-zinc-400 hover:bg-zinc-800/60'
                    }`}
                  >
                    <KeyRound className="w-3.5 h-3.5 text-zinc-300" />
                    Private Key
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuthType('password')}
                    className={`py-1.5 px-2 rounded border text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      authType === 'password'
                        ? 'border-zinc-400 bg-zinc-800 text-white'
                        : 'border-[#27272a] bg-[#121214] text-zinc-400 hover:bg-zinc-800/60'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5 text-zinc-300" />
                    Password
                  </button>
                </div>
              </div>

              {authType === 'agent' && (
                <div className="p-2.5 bg-[#121214] border border-[#27272a] rounded text-xs text-zinc-300 space-y-1">
                  <div className="font-medium text-zinc-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-zinc-300" />
                    Passwordless SSH Agent
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed font-mono">
                    Connects using Windows OpenSSH Agent named pipe (<code>\\.\pipe\openssh-ssh-agent</code>) or discovered keys in <code>~/.ssh/</code>.
                  </p>
                </div>
              )}

              {authType === 'key' && (
                <div className="space-y-2.5 p-2.5 bg-[#121214] border border-[#27272a] rounded">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">Private Key Path</label>
                    {discoveredKeys.length > 0 && (
                      <div className="mb-1.5 flex flex-wrap gap-1">
                        {discoveredKeys.map(k => (
                          <button
                            key={k.path}
                            type="button"
                            onClick={() => setKeyPath(k.path)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 border transition cursor-pointer ${
                              keyPath === k.path
                                ? 'bg-zinc-800 border-zinc-500 text-white'
                                : 'bg-[#09090b] border-[#27272a] text-zinc-400 hover:bg-zinc-800'
                            }`}
                          >
                            <KeyRound className="w-3 h-3 text-zinc-300" />
                            {k.name}
                          </button>
                        ))}
                      </div>
                    )}
                    <input
                      type="text"
                      value={keyPath}
                      onChange={e => setKeyPath(e.target.value)}
                      placeholder="C:\Users\username\.ssh\id_ed25519"
                      className="w-full bg-[#09090b] border border-[#27272a] rounded px-2.5 py-1.5 text-xs text-zinc-100 font-mono focus:outline-none focus:border-zinc-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">Key Passphrase (Optional)</label>
                    <input
                      type="password"
                      value={passphrase}
                      onChange={e => setPassphrase(e.target.value)}
                      placeholder="Leave empty if key is unencrypted"
                      className="w-full bg-[#09090b] border border-[#27272a] rounded px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {authType === 'password' && (
                <div className="space-y-2.5 p-2.5 bg-[#121214] border border-[#27272a] rounded">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">SSH Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter password..."
                      className="w-full bg-[#09090b] border border-[#27272a] rounded px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-500 font-mono"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="rememberPass"
                      checked={rememberPassword}
                      onChange={e => setRememberPassword(e.target.checked)}
                      className="rounded bg-[#09090b] border-[#27272a] accent-zinc-500"
                    />
                    <label htmlFor="rememberPass" className="text-xs text-zinc-400 cursor-pointer select-none">
                      Remember password via <strong className="text-zinc-200">Windows DPAPI</strong>
                    </label>
                  </div>
                </div>
              )}

              {!isSSHConfigSource && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="syncConfigDrawer"
                    checked={syncToSSHConfig}
                    onChange={e => setSyncToSSHConfig(e.target.checked)}
                    className="rounded bg-[#09090b] border-[#27272a] accent-zinc-500"
                  />
                  <label htmlFor="syncConfigDrawer" className="text-xs text-zinc-400 cursor-pointer select-none">
                    Sync changes to <code className="font-mono text-zinc-300">~/.ssh/config</code>
                  </label>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-[#27272a] flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                {!isSSHConfigSource && selectedId && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium bg-red-950/40 hover:bg-red-900/60 border border-red-900/80 text-red-400 hover:text-red-200 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium bg-[#121214] hover:bg-zinc-800 border border-[#27272a] text-zinc-200 transition cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Site
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConnectClick}
                  disabled={isConnecting}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-semibold bg-zinc-100 hover:bg-white text-zinc-950 shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {isConnecting ? (
                    <>
                      <div className="w-3 h-3 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-3.5 h-3.5" />
                      Connect
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </>
  );
};
