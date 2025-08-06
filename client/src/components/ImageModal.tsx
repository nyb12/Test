import React, { useEffect } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageName: string;
  onDownload?: () => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  imageName,
  onDownload,
}) => {
  const [scale, setScale] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);

  // Drag state
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState<{
    x: number;
    y: number;
  } | null>(null);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });

  // Touch state
  const [touchStart, setTouchStart] = React.useState<{
    x: number;
    y: number;
  } | null>(null);
  const [lastTouchDistance, setLastTouchDistance] = React.useState<
    number | null
  >(null);

  // Reset zoom, rotation, and position when modal opens
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
      setIsLoading(true);
      setHasError(false);
    }
  }, [isOpen]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case '+':
        case '=':
          e.preventDefault();
          setScale((prev) => Math.min(prev + 0.25, 3));
          break;
        case '-':
          e.preventDefault();
          setScale((prev) => Math.max(prev - 0.25, 0.25));
          break;
        case 'r':
          e.preventDefault();
          setRotation((prev) => prev + 90);
          break;
        case '0':
          e.preventDefault();
          setScale(1);
          setRotation(0);
          setPosition({ x: 0, y: 0 });
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = imageName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.25));
  const handleRotate = () => setRotation((prev) => prev + 90);
  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && dragStart && scale > 1) {
      e.preventDefault();
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      setPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  // Touch gesture handlers for mobile
  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return null;
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2),
    );
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setTouchStart({ x: touch.clientX, y: touch.clientY });
      if (scale > 1) {
        setIsDragging(true);
        setDragStart({
          x: touch.clientX - position.x,
          y: touch.clientY - position.y,
        });
      }
    } else if (e.touches.length === 2) {
      const distance = getTouchDistance(e.touches);
      setLastTouchDistance(distance);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();

    if (e.touches.length === 1 && isDragging && dragStart && scale > 1) {
      const touch = e.touches[0];
      const newX = touch.clientX - dragStart.x;
      const newY = touch.clientY - dragStart.y;
      setPosition({ x: newX, y: newY });
    } else if (e.touches.length === 2 && lastTouchDistance !== null) {
      const currentDistance = getTouchDistance(e.touches);
      if (currentDistance !== null) {
        const scaleChange = currentDistance / lastTouchDistance;
        setScale((prev) => Math.max(0.25, Math.min(3, prev * scaleChange)));
        setLastTouchDistance(currentDistance);
      }
    }
  };

  const handleTouchEnd = () => {
    setTouchStart(null);
    setLastTouchDistance(null);
    setIsDragging(false);
    setDragStart(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      {/* Modal Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-75"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative z-10 w-full h-full sm:max-w-[95vw] sm:max-h-[95vh] sm:rounded-lg flex flex-col bg-white">
        {/* Header - Mobile Responsive */}
        <div className="flex items-center justify-between bg-white px-3 sm:px-4 py-2 sm:py-3 border-b sm:rounded-t-lg">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <h3 className="text-sm sm:text-lg font-medium text-gray-900 truncate">
              {imageName}
            </h3>
            <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
              {Math.round(scale * 100)}%
            </span>
          </div>

          {/* Desktop Controls */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              disabled={scale <= 0.25}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <button
              onClick={handleZoomIn}
              disabled={scale >= 3}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <button
              onClick={handleRotate}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              title="Rotate (R)"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            <button
              onClick={handleReset}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              title="Reset (0)"
            >
              <span className="text-sm font-medium">Reset</span>
            </button>

            <button
              onClick={handleDownload}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Close Button */}
          <button
            onClick={onClose}
            className="sm:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Image Container - Mobile Responsive */}
        <div className="flex-1 bg-white overflow-hidden relative">
          <div
            className="flex items-center justify-center p-2 sm:p-4 h-full min-h-[300px] sm:min-h-[400px]"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {isLoading && (
              <div className="flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-gray-600 text-sm sm:text-base mt-2">
                  Loading image...
                </span>
              </div>
            )}

            {hasError && (
              <div className="flex flex-col items-center justify-center text-center p-4">
                <div className="text-red-500 text-4xl sm:text-6xl mb-4">⚠️</div>
                <p className="text-gray-600 mb-2 text-sm sm:text-base">
                  Failed to load image
                </p>
                <button
                  onClick={() => {
                    setHasError(false);
                    setIsLoading(true);
                  }}
                  className="text-blue-500 hover:text-blue-700 underline text-sm sm:text-base"
                >
                  Try again
                </button>
              </div>
            )}

            <img
              src={imageUrl}
              alt={imageName}
              className={`max-w-full max-h-full object-contain transition-transform duration-200 ${
                isLoading || hasError ? 'hidden' : ''
              }`}
              style={{
                transform: `scale(${scale}) rotate(${rotation}deg) translate(${position.x}px, ${position.y}px)`,
                cursor:
                  scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none',
              }}
              draggable={false}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setHasError(true);
              }}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            />
          </div>
        </div>

        {/* Mobile Controls - Bottom Sheet */}
        <div className="sm:hidden bg-white border-t px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={handleZoomOut}
                disabled={scale <= 0.25}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                title="Zoom Out"
              >
                <ZoomOut className="w-5 h-5" />
              </button>

              <button
                onClick={handleZoomIn}
                disabled={scale >= 3}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                title="Zoom In"
              >
                <ZoomIn className="w-5 h-5" />
              </button>

              <button
                onClick={handleRotate}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                title="Rotate"
              >
                <RotateCw className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                title="Reset"
              >
                Reset
              </button>

              <button
                onClick={handleDownload}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                title="Download"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Mobile Instructions */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Pinch to zoom • Drag to pan • Tap outside to close
            </p>
          </div>
        </div>

        {/* Keyboard Shortcuts Help - Desktop Only */}
        <div className="hidden sm:block mt-2 text-center pb-2">
          <p className="text-xs text-gray-400">
            Use + / - to zoom, R to rotate, 0 to reset, Esc to close • Drag to
            pan when zoomed
          </p>
        </div>
      </div>
    </div>
  );
};

export default ImageModal;
