import { models } from '../../wailsjs/go/models';

export interface ServerSession {
  sessionId: string;
  profile: models.ConnectionProfile;
  currentRemotePath: string;
  history: string[];
  historyIndex: number;
  remoteFiles: models.FileItem[];
  selectedRemoteFiles: string[];
  isLoadingRemote: boolean;
  remoteError: string | null;
}

export interface LocalState {
  currentLocalPath: string;
  history: string[];
  historyIndex: number;
  localFiles: models.FileItem[];
  selectedLocalFiles: string[];
  drives: models.DriveInfo[];
  currentDrive: string;
  isLoadingLocal: boolean;
  localError: string | null;
}

export interface TransferItem {
  id: string;
  sessionId: string;
  direction: 'upload' | 'download';
  sourcePath: string;
  destPath: string;
  fileName: string;
  bytesTotal: number;
  bytesTransferred: number;
  percentage: number;
  status: 'pending' | 'transferring' | 'completed' | 'error';
  errorMessage?: string;
  startedAt: number;
}
