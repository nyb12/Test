import { useState, useEffect, lazy, Suspense, startTransition } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// Use the full navigation drawer with authentication features
const SimpleNavigationDrawer = lazy(() => import("./SimpleNavigationDrawer"));

interface LazyNavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

// Quick loading placeholder while the full drawer loads
function DrawerPlaceholder({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Quick Drawer Shell */}
      <div className="relative w-80 bg-white h-full shadow-xl flex flex-col">
        {/* Header with Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 mr-3">
              <input
                placeholder="Search conversations..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm"
                disabled
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 bg-gray-300 rounded"></div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 rounded-full hover:bg-gray-100"
            >
              <X className="h-4 w-4 text-gray-600" />
            </Button>
          </div>
        </div>

        {/* Loading content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
            <p className="text-sm text-gray-600">Loading navigation...</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LazyNavigationDrawer({ isOpen, onClose }: LazyNavigationDrawerProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (isOpen && !isLoaded) {
      // Use startTransition to avoid synchronous input suspension error
      startTransition(() => {
        setIsLoaded(true);
      });
    }
  }, [isOpen, isLoaded]);

  if (!isOpen) return null;

  if (!isLoaded) {
    return <DrawerPlaceholder onClose={onClose} />;
  }

  return (
    <Suspense fallback={<DrawerPlaceholder onClose={onClose} />}>
      <SimpleNavigationDrawer isOpen={isOpen} onClose={onClose} />
    </Suspense>
  );
}