import React, { useState } from 'react';
import {
  Download,
  File,
  Image,
  FileText,
  Video,
  Music,
  Archive,
  Code,
  Presentation,
} from 'lucide-react';
import {
  FileInfo,
  FileDisplayMetadata,
  getFilesFromMetadata,
  getFileType,
  isImage,
  isVideo,
  isAudio,
  downloadFile,
  FILE_TYPES,
} from '@/utils/fileUtils';
import ImageModal from './ImageModal';

interface FileDisplayProps {
  metadata?: FileDisplayMetadata;
  className?: string;
}

export const FileDisplay: React.FC<FileDisplayProps> = ({
  metadata,
  className = '',
}) => {
  const [modalImage, setModalImage] = useState<{
    url: string;
    name: string;
  } | null>(null);

  const files = getFilesFromMetadata(metadata);
  if (files.length === 0) return null;

  const getFileIcon = (fileType: string) => {
    const type = getFileType(fileType);

    switch (type) {
      case FILE_TYPES.IMAGE:
        return <Image className="w-4 h-4" />;
      case FILE_TYPES.VIDEO:
        return <Video className="w-4 h-4" />;
      case FILE_TYPES.AUDIO:
        return <Music className="w-4 h-4" />;
      case FILE_TYPES.PDF:
      case FILE_TYPES.DOCUMENT:
      case FILE_TYPES.SPREADSHEET:
        return <FileText className="w-4 h-4" />;
      case FILE_TYPES.PRESENTATION:
        return <Presentation className="w-4 h-4" />;
      case FILE_TYPES.ARCHIVE:
        return <Archive className="w-4 h-4" />;
      case FILE_TYPES.CODE:
        return <Code className="w-4 h-4" />;
      default:
        return <File className="w-4 h-4" />;
    }
  };

  const handleDownload = (fileUrl: string, fileName?: string) => {
    downloadFile(fileUrl, fileName);
  };

  const renderFile = (file: FileInfo, index: number) => {
    const fileType = file.FileType.toLowerCase();

    if (isImage(fileType)) {
      return (
        <div key={index} className="max-w-xs mb-2">
          <img
            src={file.FileUrl}
            alt={
              file.FileName.length > 10
                ? file.FileName.slice(0, 10) + '...'
                : file.FileName
            }
            className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() =>
              setModalImage({ url: file.FileUrl, name: file.FileName })
            }
            loading="lazy"
            onError={(e) => {
              console.error('Image failed to load:', file.FileUrl, e);
            }}
            // onLoad={() => {
            //   console.log('Image loaded successfully:', file.FileUrl);
            // }}
          />
          <p
            className="text-xs text-gray-500 mt-1 truncate"
            title={file.FileName}
          >
            {file.FileName.length > 10
              ? file.FileName.slice(0, 10) + '...'
              : file.FileName}
          </p>
        </div>
      );
    }

    if (isVideo(fileType)) {
      return (
        <div key={index} className="max-w-xs mb-2">
          <video
            src={file.FileUrl}
            controls
            className="rounded-lg max-w-full h-auto"
            preload="metadata"
          />
          <p
            className="text-xs text-gray-500 mt-1 truncate"
            title={file.FileName}
          >
            {file.FileName.length > 10
              ? file.FileName.slice(0, 10) + '...'
              : file.FileName}
          </p>
        </div>
      );
    }

    if (isAudio(fileType)) {
      return (
        <div key={index} className="mb-2">
          <audio
            src={file.FileUrl}
            controls
            className="w-full"
            preload="metadata"
          />
          <p
            className="text-xs text-gray-500 mt-1 truncate"
            title={file.FileName}
          >
            {file.FileName.length > 10
              ? file.FileName.slice(0, 10) + '...'
              : file.FileName}
          </p>
        </div>
      );
    }

    // For documents and other files
    return (
      <div
        key={index}
        className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border cursor-pointer hover:bg-gray-100 transition-colors mb-2"
        onClick={() => handleDownload(file.FileUrl, file.FileName)}
      >
        {getFileIcon(file.FileType)}
        <span
          className="text-sm text-gray-700 truncate flex-1"
          title={file.FileName}
        >
          {file.FileName.length > 10
            ? file.FileName.slice(0, 10) + '...'
            : file.FileName}
        </span>
        <Download className="w-4 h-4 text-gray-500" />
      </div>
    );
  };

  return (
    <>
      <div className={`mt-2 space-y-1 ${className}`}>
        {files.map((file, index) => renderFile(file, index))}
      </div>

      <ImageModal
        isOpen={!!modalImage}
        onClose={() => setModalImage(null)}
        imageUrl={modalImage?.url || ''}
        imageName={modalImage?.name || ''}
        onDownload={() =>
          modalImage && handleDownload(modalImage.url, modalImage.name)
        }
      />
    </>
  );
};

export default FileDisplay;
