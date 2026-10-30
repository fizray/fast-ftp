export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i < 0) return `${bytes} B`;
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i] || 'TB'}`;
}

export function formatDate(dateStr: string | Date): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '-';
  }
}

export function isTextFile(ext: string, name?: string): boolean {
  const textExtensions = [
    '.txt', '.md', '.json', '.js', '.ts', '.jsx', '.tsx', '.go', '.py', '.php',
    '.html', '.css', '.scss', '.yaml', '.yml', '.xml', '.sql', '.sh', '.bash',
    '.conf', '.ini', '.env', '.log', '.toml', '.rs', '.c', '.cpp', '.h', '.java'
  ];
  if (name && (name.startsWith('.env') || name === 'Dockerfile' || name === 'Makefile')) {
    return true;
  }
  return textExtensions.includes(ext.toLowerCase());
}
