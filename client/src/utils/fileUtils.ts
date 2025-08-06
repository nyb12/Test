export interface FileInfo {
  FileUrl: string;
  FileName: string;
  FileType: string;
}

export interface FileDisplayMetadata {
  // Legacy structure
  FileUrl?: string;
  FileName?: string;
  FileType?: string;
  // New structure
  Files?: FileInfo[];
  CorrelationId?: string;
  conversationId?: string;
}

export const FILE_TYPES = {
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  DOCUMENT: 'document',
  PDF: 'pdf',
  PRESENTATION: 'presentation',
  SPREADSHEET: 'spreadsheet',
  ARCHIVE: 'archive',
  CODE: 'code',
  OTHER: 'other',
} as const;

export type FileType = (typeof FILE_TYPES)[keyof typeof FILE_TYPES];

export const getFileType = (mimeType: string): FileType => {
  const type = mimeType.toLowerCase();

  if (type.startsWith('image/')) return FILE_TYPES.IMAGE;
  if (type.startsWith('video/')) return FILE_TYPES.VIDEO;
  if (type.startsWith('audio/')) return FILE_TYPES.AUDIO;
  if (type.includes('pdf')) return FILE_TYPES.PDF;
  if (
    type.includes('document') ||
    type.includes('word') ||
    type.includes('text')
  )
    return FILE_TYPES.DOCUMENT;
  if (type.includes('presentation') || type.includes('powerpoint'))
    return FILE_TYPES.PRESENTATION;
  if (type.includes('spreadsheet') || type.includes('excel'))
    return FILE_TYPES.SPREADSHEET;
  if (type.includes('zip') || type.includes('rar') || type.includes('tar'))
    return FILE_TYPES.ARCHIVE;
  if (type.includes('code') || type.includes('script') || type.includes('json'))
    return FILE_TYPES.CODE;

  return FILE_TYPES.OTHER;
};

export const isImage = (mimeType: string): boolean =>
  getFileType(mimeType) === FILE_TYPES.IMAGE;

export const isVideo = (mimeType: string): boolean =>
  getFileType(mimeType) === FILE_TYPES.VIDEO;

export const isAudio = (mimeType: string): boolean =>
  getFileType(mimeType) === FILE_TYPES.AUDIO;

export const isDocument = (mimeType: string): boolean =>
  getFileType(mimeType) === FILE_TYPES.DOCUMENT;

export const isPDF = (mimeType: string): boolean =>
  getFileType(mimeType) === FILE_TYPES.PDF;

export const getFileExtension = (fileName: string): string => {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFilesFromMetadata = (
  metadata?: FileDisplayMetadata,
): FileInfo[] => {
  if (metadata?.Files && metadata.Files.length > 0) {
    return metadata.Files;
  }
  // Legacy structure
  if (metadata?.FileUrl && metadata?.FileName) {
    return [
      {
        FileUrl: metadata.FileUrl,
        FileName: metadata.FileName,
        FileType: metadata.FileType || 'application/octet-stream',
      },
    ];
  }
  return [];
};

export const downloadFile = (fileUrl: string, fileName?: string): void => {
  const link = document.createElement('a');
  link.href = fileUrl;
  link.download = fileName || '';
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
