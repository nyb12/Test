import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FileDrawer({ isOpen, onClose }: FileDrawerProps) {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}
      
      {/* Drawer */}
      <div className={`fixed top-0 left-0 h-full w-80 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header with close button */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Files</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* My Files Section */}
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-sm font-medium text-gray-700 mb-3">My Files</h3>
              <div className="text-sm text-gray-500">
                No files available
              </div>
            </div>
            
            {/* Shared with Me Section */}
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Shared with Me</h3>
              <div className="text-sm text-gray-500">
                No shared files available
              </div>
            </div>
            
            {/* Fleet Files Section */}
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Fleet Files</h3>
              <div className="text-sm text-gray-500">
                No fleet files available
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}