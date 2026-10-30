import React, { useState, useEffect } from 'react';
import {
  Server,
  FolderSync,
  Terminal,
  KeyRound,
  ExternalLink
} from 'lucide-react';
import { models } from '../wailsjs/go/models';
import { EventsOn } from '../wailsjs/runtime/runtime';
import {
  GetLocalDrives,
  GetLocalHomeDir,
  SelectLocalDirectoryDialog,
  ListLocalFiles,
  CreateLocalDirectory,
  DeleteLocalPath,
  RenameLocalPath,
  ConnectSFTP,
  DisconnectSFTP,
  GetRemoteWorkingDir,
  ListRemoteFiles,
  ReadRemoteFile,
  WriteRemoteFile,
  CreateRemoteDirectory,
  DeleteRemotePath,
  RenameRemotePath,
  ChmodRemotePath,
  UploadFile,
  DownloadFile,
  LaunchSSHTerminal,
  GetSSHConfigProfiles,
  GetDiscoveredSSHKeys,
  IsSSHAgentAvailable,
  SaveProfile
} from '../wailsjs/go/main/App';

import { ServerSession, LocalState, TransferItem } from './types';
import { Header } from './components/Header';
import { LocalPane } from './components/LocalPane';
import { RemotePane } from './components/RemotePane';
import { TransferToolbar } from './components/TransferToolbar';
import { SiteManagerDrawer } from './components/SiteManagerDrawer';
import { ChmodModal } from './components/ChmodModal';
import { PasswordPromptModal } from './components/PasswordPromptModal';
import { TransferQueue } from './components/TransferQueue';
import { StatusBar } from './components/StatusBar';

export default function App() {
  // Local filesystem state
  const [localState, setLocalState] = useState<LocalState>({
    currentLocalPath: '',
    history: [],
    historyIndex: -1,
    localFiles: [],
    selectedLocalFiles: [],
    drives: [],
    currentDrive: 'C:',
    isLoadingLocal: false,
    localError: null,
  });

  // Single active remote SFTP session state
  const [activeSession, setActiveSession] = useState<ServerSession | null>(null);

  // Transfers queue & settings
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [isTransferDrawerOpen, setIsTransferDrawerOpen] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  // Slide-over Drawer & Modals state
  const [isSiteManagerOpen, setIsSiteManagerOpen] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Quick Discovery for welcome screen
  const [discoveredHosts, setDiscoveredHosts] = useState<models.ConnectionProfile[]>([]);
  const [discoveredKeys, setDiscoveredKeys] = useState<models.SSHKeyInfo[]>([]);
  const [agentAvailable, setAgentAvailable] = useState<boolean>(false);

  // In-place Remote Code Editor state
  const [editingFile, setEditingFile] = useState<{ path: string; content: string } | null>(null);

  // Chmod modal state
  const [chmodFile, setChmodFile] = useState<models.FileItem | null>(null);

  // Password prompt modal state
  const [passwordPrompt, setPasswordPrompt] = useState<{
    profile: models.ConnectionProfile;
    isPassphrase: boolean;
  } | null>(null);

  // Initial load
  useEffect(() => {
    initLocal();
    loadDiscovery();

    // Listen for backend transfer progress events
    EventsOn('transfer:progress', (data: any) => {
      setTransfers(prev => {
        const index = prev.findIndex(t => t.id === data.transferId);
        const item: TransferItem = {
          id: data.transferId,
          sessionId: data.sessionId,
          direction: data.direction,
          sourcePath: data.sourcePath,
          destPath: data.destPath,
          fileName: data.fileName,
          bytesTotal: data.bytesTotal,
          bytesTransferred: data.bytesTransferred,
          percentage: data.percentage,
          status: data.status,
          errorMessage: data.errorMessage,
          startedAt: index >= 0 ? prev[index].startedAt : Date.now(),
        };

        if (index >= 0) {
          const updated = [...prev];
          updated[index] = item;
          return updated;
        }
        return [...prev, item];
      });
    });
  }, []);

  const initLocal = async () => {
    try {
      const [drives, home] = await Promise.all([GetLocalDrives(), GetLocalHomeDir()]);
      const validDrives = drives && drives.length > 0 ? drives : [{ letter: 'C:', label: 'Local Disk (C:)' }];
      const initialPath = home || (validDrives[0].letter + '\\');
      const driveLetter = initialPath.length >= 2 && initialPath[1] === ':'
        ? initialPath.substring(0, 2).toUpperCase()
        : validDrives[0].letter;

      setLocalState(prev => ({
        ...prev,
        drives: validDrives,
        currentDrive: driveLetter,
        currentLocalPath: initialPath,
      }));

      loadLocalFiles(initialPath, showHidden);
    } catch (err) {
      console.error('Failed to init local fs:', err);
      const fallbackPath = 'C:\\';
      setLocalState(prev => ({
        ...prev,
        drives: [{ letter: 'C:', label: 'Local Disk (C:)' }],
        currentDrive: 'C:',
        currentLocalPath: fallbackPath,
      }));
      loadLocalFiles(fallbackPath, showHidden);
    }
  };

  const loadDiscovery = async () => {
    try {
      const [hosts, keys, agentOk] = await Promise.all([
        GetSSHConfigProfiles(),
        GetDiscoveredSSHKeys(),
        IsSSHAgentAvailable(),
      ]);
      setDiscoveredHosts(hosts || []);
      setDiscoveredKeys(keys || []);
      setAgentAvailable(agentOk);
    } catch (err) {
      console.error('Failed to load discovery data:', err);
    }
  };

  // Local navigation & operations
  const loadLocalFiles = async (path: string, hidden: boolean) => {
    const cleanPath = path.length === 2 && path[1] === ':' ? path + '\\' : path;
    const driveLetter = cleanPath.length >= 2 && cleanPath[1] === ':' ? cleanPath.substring(0, 2).toUpperCase() : 'C:';
    setLocalState(prev => ({ ...prev, isLoadingLocal: true, localError: null, currentDrive: driveLetter }));
    try {
      const files = await ListLocalFiles(cleanPath, hidden);
      setLocalState(prev => ({
        ...prev,
        currentLocalPath: cleanPath,
        currentDrive: driveLetter,
        localFiles: files || [],
        selectedLocalFiles: [],
        isLoadingLocal: false,
        localError: null,
      }));
    } catch (err: any) {
      setLocalState(prev => ({
        ...prev,
        isLoadingLocal: false,
        localError: err?.message || String(err),
      }));
    }
  };

  const handleLocalNavigate = (path: string) => {
    loadLocalFiles(path, showHidden);
  };

  const handleDriveChange = (driveLetter: string) => {
    const newPath = driveLetter.endsWith('\\') ? driveLetter : driveLetter + '\\';
    setLocalState(prev => ({ ...prev, currentDrive: driveLetter }));
    loadLocalFiles(newPath, showHidden);
  };

  const handleBrowseLocalFolder = async () => {
    try {
      const selected = await SelectLocalDirectoryDialog(localState.currentLocalPath);
      if (selected) {
        handleLocalNavigate(selected);
      }
    } catch (err) {
      console.error('Browse directory failed:', err);
    }
  };

  const handleLocalSelect = (paths: string[]) => {
    setLocalState(prev => ({ ...prev, selectedLocalFiles: paths }));
  };

  const handleCreateLocalFolder = async (folderName: string) => {
    const fullPath = localState.currentLocalPath.replace(/\\$/, '') + '\\' + folderName;
    try {
      await CreateLocalDirectory(fullPath);
      loadLocalFiles(localState.currentLocalPath, showHidden);
    } catch (err: any) {
      alert(`Failed to create folder: ${err}`);
    }
  };

  const handleDeleteLocal = async (path: string) => {
    try {
      await DeleteLocalPath(path);
      loadLocalFiles(localState.currentLocalPath, showHidden);
    } catch (err: any) {
      alert(`Failed to delete: ${err}`);
    }
  };

  const handleRenameLocal = async (oldPath: string, newName: string) => {
    const dir = oldPath.substring(0, oldPath.lastIndexOf('\\'));
    const newPath = dir + '\\' + newName;
    try {
      await RenameLocalPath(oldPath, newPath);
      loadLocalFiles(localState.currentLocalPath, showHidden);
    } catch (err: any) {
      alert(`Failed to rename: ${err}`);
    }
  };

  // Remote SFTP Operations
  const loadRemoteFiles = async (sessionId: string, path: string, hidden: boolean) => {
    setActiveSession(prev => (prev ? { ...prev, isLoadingRemote: true, remoteError: null } : null));
    try {
      const files = await ListRemoteFiles(sessionId, path, hidden);
      setActiveSession(prev =>
        prev && prev.sessionId === sessionId
          ? {
              ...prev,
              currentRemotePath: path,
              remoteFiles: files || [],
              selectedRemoteFiles: [],
              isLoadingRemote: false,
              remoteError: null,
            }
          : prev
      );
    } catch (err: any) {
      setActiveSession(prev =>
        prev && prev.sessionId === sessionId
          ? { ...prev, isLoadingRemote: false, remoteError: err?.message || String(err) }
          : prev
      );
    }
  };

  const handleRemoteNavigate = (path: string) => {
    if (!activeSession) return;
    loadRemoteFiles(activeSession.sessionId, path, showHidden);
  };

  const handleRemoteSelect = (paths: string[]) => {
    if (!activeSession) return;
    setActiveSession(prev => (prev ? { ...prev, selectedRemoteFiles: paths } : null));
  };

  const handleCreateRemoteFolder = async (folderName: string) => {
    if (!activeSession) return;
    const base = activeSession.currentRemotePath.endsWith('/')
      ? activeSession.currentRemotePath
      : activeSession.currentRemotePath + '/';
    const target = base + folderName;
    try {
      await CreateRemoteDirectory(activeSession.sessionId, target);
      loadRemoteFiles(activeSession.sessionId, activeSession.currentRemotePath, showHidden);
    } catch (err: any) {
      alert(`Failed to create remote directory: ${err}`);
    }
  };

  const handleDeleteRemote = async (path: string, isDir: boolean) => {
    if (!activeSession) return;
    try {
      await DeleteRemotePath(activeSession.sessionId, path, isDir);
      loadRemoteFiles(activeSession.sessionId, activeSession.currentRemotePath, showHidden);
    } catch (err: any) {
      alert(`Failed to delete remote item: ${err}`);
    }
  };

  const handleRenameRemote = async (oldPath: string, newName: string) => {
    if (!activeSession) return;
    const dir = oldPath.substring(0, oldPath.lastIndexOf('/'));
    const newPath = (dir === '' ? '/' : dir) + '/' + newName;
    try {
      await RenameRemotePath(activeSession.sessionId, oldPath, newPath);
      loadRemoteFiles(activeSession.sessionId, activeSession.currentRemotePath, showHidden);
    } catch (err: any) {
      alert(`Failed to rename: ${err}`);
    }
  };

  // In-place Remote Code Editor
  const handleOpenRemoteEditor = async (file: models.FileItem) => {
    if (!activeSession) return;
    try {
      const content = await ReadRemoteFile(activeSession.sessionId, file.path);
      setEditingFile({ path: file.path, content });
    } catch (err: any) {
      alert(`Failed to open remote file: ${err}`);
    }
  };

  const handleSaveRemoteEditor = async (path: string, content: string) => {
    if (!activeSession) return;
    await WriteRemoteFile(activeSession.sessionId, path, content);
    loadRemoteFiles(activeSession.sessionId, activeSession.currentRemotePath, showHidden);
  };

  const handleReloadRemoteEditor = async (path: string): Promise<string> => {
    if (!activeSession) return '';
    return await ReadRemoteFile(activeSession.sessionId, path);
  };

  // Chmod
  const handleSaveChmod = async (path: string, mode: number) => {
    if (!activeSession) return;
    await ChmodRemotePath(activeSession.sessionId, path, mode);
    loadRemoteFiles(activeSession.sessionId, activeSession.currentRemotePath, showHidden);
  };

  // Connection Handler
  const handleConnect = async (profile: models.ConnectionProfile, password?: string, passphrase?: string) => {
    setIsConnecting(true);

    // If an existing session is open, disconnect it cleanly first
    if (activeSession) {
      try {
        await DisconnectSFTP(activeSession.sessionId);
      } catch (err) {
        console.warn('Disconnect previous session warning:', err);
      }
    }

    try {
      const req = new models.ConnectRequest({
        profile,
        password,
        passphrase,
      });

      const sessionId = await ConnectSFTP(req);
      const initialWd = await GetRemoteWorkingDir(sessionId);

      const newSession: ServerSession = {
        sessionId,
        profile,
        currentRemotePath: initialWd || '/',
        history: [initialWd || '/'],
        historyIndex: 0,
        remoteFiles: [],
        selectedRemoteFiles: [],
        isLoadingRemote: false,
        remoteError: null,
      };

      setActiveSession(newSession);
      setIsSiteManagerOpen(false);
      setEditingProfileId(null);
      setPasswordPrompt(null);
      setEditingFile(null);

      // Load initial files
      loadRemoteFiles(sessionId, initialWd || '/', showHidden);
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      console.error('Connection error:', errMsg);

      if (
        (profile.authType === 'password' || profile.authType === 'agent') &&
        (errMsg.includes('handshake failed') || errMsg.includes('unable to authenticate') || errMsg.includes('no authentication method'))
      ) {
        setPasswordPrompt({ profile, isPassphrase: false });
      } else if (profile.authType === 'key' && errMsg.includes('passphrase')) {
        setPasswordPrompt({ profile, isPassphrase: true });
      } else {
        alert(`Connection Failed: ${errMsg}`);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect active session
  const handleDisconnectActiveSession = async () => {
    if (!activeSession) return;
    const sid = activeSession.sessionId;
    setActiveSession(null);
    setEditingFile(null);
    try {
      await DisconnectSFTP(sid);
    } catch (err) {
      console.error('Failed to disconnect SFTP:', err);
    }
  };

  // Edit active host in Site Manager drawer
  const handleEditActiveHost = () => {
    if (!activeSession) return;
    setEditingProfileId(activeSession.profile.id || activeSession.profile.name || activeSession.profile.host);
    setIsSiteManagerOpen(true);
  };

  // Transfers
  const handleUploadFiles = async (localFilePaths: string[]) => {
    if (!activeSession) return;
    for (const localPath of localFilePaths) {
      const fileName = localPath.split('\\').pop() || 'file';
      const baseRemote = activeSession.currentRemotePath.endsWith('/')
        ? activeSession.currentRemotePath
        : activeSession.currentRemotePath + '/';
      const remoteTarget = baseRemote + fileName;

      try {
        await UploadFile(activeSession.sessionId, localPath, remoteTarget);
      } catch (err: any) {
        console.error('Upload failed:', err);
      }
    }
    loadRemoteFiles(activeSession.sessionId, activeSession.currentRemotePath, showHidden);
  };

  const handleDownloadFiles = async (remoteFilePaths: string[]) => {
    if (!activeSession) return;
    for (const remotePath of remoteFilePaths) {
      const fileName = remotePath.split('/').pop() || 'file';
      const baseLocal = localState.currentLocalPath.endsWith('\\')
        ? localState.currentLocalPath
        : localState.currentLocalPath + '\\';
      const localTarget = baseLocal + fileName;

      try {
        await DownloadFile(activeSession.sessionId, remotePath, localTarget);
      } catch (err: any) {
        console.error('Download failed:', err);
      }
    }
    loadLocalFiles(localState.currentLocalPath, showHidden);
  };

  const handleLaunchTerminal = async () => {
    if (!activeSession) return;
    try {
      await LaunchSSHTerminal(activeSession.profile);
    } catch (err: any) {
      alert(`Terminal launch failed: ${err}`);
    }
  };

  const handleToggleHidden = () => {
    const next = !showHidden;
    setShowHidden(next);
    loadLocalFiles(localState.currentLocalPath, next);
    if (activeSession) {
      loadRemoteFiles(activeSession.sessionId, activeSession.currentRemotePath, next);
    }
  };

  const handleRefreshAll = () => {
    loadLocalFiles(localState.currentLocalPath, showHidden);
    if (activeSession) {
      loadRemoteFiles(activeSession.sessionId, activeSession.currentRemotePath, showHidden);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#09090b] text-zinc-100 overflow-hidden font-sans select-none">
      
      {/* Clean Frameless Window Header (Single session) */}
      <Header
        onOpenSiteManager={() => {
          setEditingProfileId(null);
          setIsSiteManagerOpen(true);
        }}
      />

      {/* Main Dual-Pane Area */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left: Local Filesystem Pane */}
        <LocalPane
          currentPath={localState.currentLocalPath}
          files={localState.localFiles}
          selectedFiles={localState.selectedLocalFiles}
          drives={localState.drives}
          currentDrive={localState.currentDrive}
          isLoading={localState.isLoadingLocal}
          localError={localState.localError}
          onNavigate={handleLocalNavigate}
          onDriveChange={handleDriveChange}
          onBrowseFolder={handleBrowseLocalFolder}
          onSelect={handleLocalSelect}
          onUpload={handleUploadFiles}
          onCreateFolder={handleCreateLocalFolder}
          onDelete={handleDeleteLocal}
          onRename={handleRenameLocal}
          onRefresh={() => loadLocalFiles(localState.currentLocalPath, showHidden)}
        />

        {/* Center: Transfer Action Toolbar */}
        <TransferToolbar
          canUpload={!!activeSession && localState.selectedLocalFiles.length > 0}
          canDownload={!!activeSession && (activeSession?.selectedRemoteFiles.length || 0) > 0}
          onUpload={() => handleUploadFiles(localState.selectedLocalFiles)}
          onDownload={() => activeSession && handleDownloadFiles(activeSession.selectedRemoteFiles)}
          onRefreshAll={handleRefreshAll}
          onLaunchTerminal={handleLaunchTerminal}
        />

        {/* Right: Remote SFTP Explorer OR Welcome Screen */}
        {activeSession ? (
          <RemotePane
            sessionProfile={activeSession.profile}
            currentPath={activeSession.currentRemotePath}
            files={activeSession.remoteFiles}
            selectedFiles={activeSession.selectedRemoteFiles}
            isLoading={activeSession.isLoadingRemote}
            onNavigate={handleRemoteNavigate}
            onSelect={handleRemoteSelect}
            onDownload={handleDownloadFiles}
            onChmod={file => setChmodFile(file)}
            onCreateFolder={handleCreateRemoteFolder}
            onDelete={handleDeleteRemote}
            onRename={handleRenameRemote}
            onRefresh={() => loadRemoteFiles(activeSession.sessionId, activeSession.currentRemotePath, showHidden)}
            onDropLocalFiles={handleUploadFiles}
            onDisconnect={handleDisconnectActiveSession}
            onEditHost={handleEditActiveHost}
            onLaunchTerminal={handleLaunchTerminal}
            editingFile={editingFile}
            onOpenEditor={handleOpenRemoteEditor}
            onCloseEditor={() => setEditingFile(null)}
            onSaveEditor={handleSaveRemoteEditor}
            onReloadEditor={handleReloadRemoteEditor}
          />
        ) : (
          /* Empty / Welcome State */
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#09090b] select-none">
            <div className="max-w-md w-full text-center space-y-6">
              
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-100 shadow-xs">
                <FolderSync className="w-6 h-6 text-zinc-200" />
              </div>

              <div>
                <h2 className="text-base font-bold text-zinc-100 font-mono tracking-tight">fast-ftp</h2>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Ultra-fast SFTP client with Windows OpenSSH Agent integration, .ssh auto-discovery, and DPAPI-encrypted storage.
                </p>
              </div>

              {/* Status pill: Keys count only */}
              {discoveredKeys.length > 0 && (
                <div className="flex items-center justify-center gap-2 text-[10px] font-mono">
                  <span className="px-2.5 py-0.5 rounded-full flex items-center gap-1.5 border bg-[#121214] border-zinc-800 text-zinc-300">
                    <KeyRound className="w-3 h-3 text-zinc-400" />
                    {discoveredKeys.length} Keys discovered in ~/.ssh
                  </span>
                </div>
              )}

              {/* Quick Connect to ~/.ssh/config */}
              {discoveredHosts.length > 0 && (
                <div className="text-left bg-[#121214] border border-[#27272a] rounded-xl p-3.5 space-y-2">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 flex items-center justify-between">
                    <span>Quick Connect (~/.ssh/config)</span>
                    <span className="text-[10px] text-zinc-500">{discoveredHosts.length} hosts</span>
                  </div>
                  <div className="space-y-1 max-h-44 overflow-y-auto">
                    {discoveredHosts.map(h => (
                      <div
                        key={h.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-[#09090b] hover:bg-zinc-800/60 border border-[#27272a] transition text-xs"
                      >
                        <div className="truncate">
                          <span className="font-semibold text-zinc-200 font-mono">{h.name}</span>
                          <span className="text-[10px] text-zinc-500 ml-2 font-mono">
                            {h.user ? `${h.user}@` : ''}{h.host}
                          </span>
                        </div>
                        <button
                          onClick={() => handleConnect(h)}
                          disabled={isConnecting}
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-200 hover:bg-white text-zinc-950 font-semibold text-[10px] transition shadow-xs disabled:opacity-50 cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Connect
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  setEditingProfileId(null);
                  setIsSiteManagerOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium text-xs bg-zinc-100 hover:bg-white text-zinc-950 transition cursor-pointer shadow-xs"
              >
                <Server className="w-3.5 h-3.5" />
                Open Site Manager / Add Host
              </button>

            </div>
          </div>
        )}

      </div>

      {/* Docked Transfer Queue Drawer (opens above Status Bar) */}
      <TransferQueue
        isOpen={isTransferDrawerOpen}
        onClose={() => setIsTransferDrawerOpen(false)}
        transfers={transfers}
        onClearCompleted={() => setTransfers(prev => prev.filter(t => t.status !== 'completed'))}
      />

      {/* Bottom Status Bar (VS Code / Zed style) */}
      <StatusBar
        activeHostName={activeSession ? (activeSession.profile.name || activeSession.profile.host) : null}
        activeRemotePath={activeSession ? activeSession.currentRemotePath : null}
        showHidden={showHidden}
        onToggleHidden={handleToggleHidden}
        transfers={transfers}
        isTransferDrawerOpen={isTransferDrawerOpen}
        onToggleTransferDrawer={() => setIsTransferDrawerOpen(prev => !prev)}
      />

      {/* Site Manager Slide-over Drawer */}
      <SiteManagerDrawer
        isOpen={isSiteManagerOpen}
        isConnecting={isConnecting}
        initialProfileId={editingProfileId}
        onClose={() => {
          setIsSiteManagerOpen(false);
          setEditingProfileId(null);
        }}
        onConnect={handleConnect}
      />

      {/* Permissions (Chmod) Modal */}
      {chmodFile && (
        <ChmodModal
          isOpen={!!chmodFile}
          file={chmodFile}
          onClose={() => setChmodFile(null)}
          onSave={handleSaveChmod}
        />
      )}

      {/* Password Prompt Modal */}
      {passwordPrompt && (
        <PasswordPromptModal
          isOpen={!!passwordPrompt}
          title={`Authentication required for "${passwordPrompt.profile.name || passwordPrompt.profile.host}" (${passwordPrompt.profile.user || 'user'})`}
          isPassphrase={passwordPrompt.isPassphrase}
          onConfirm={async (secret, remember) => {
            const p = { ...passwordPrompt.profile, rememberPassword: remember };
            if (remember) {
              await SaveProfile(
                p,
                passwordPrompt.isPassphrase ? '' : secret,
                passwordPrompt.isPassphrase ? secret : ''
              );
            }
            handleConnect(
              p,
              passwordPrompt.isPassphrase ? undefined : secret,
              passwordPrompt.isPassphrase ? secret : undefined
            );
          }}
          onCancel={() => setPasswordPrompt(null)}
        />
      )}

    </div>
  );
}
