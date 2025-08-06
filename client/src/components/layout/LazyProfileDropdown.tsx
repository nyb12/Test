import { useState, useEffect, lazy, Suspense } from "react";
import { User, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Lazy load the full profile content
const FullProfileContent = lazy(() => import("./FullProfileContent"));

interface LazyProfileDropdownProps {
  user: any;
  onLogout: () => void;
}

// Quick loading placeholder for profile dropdown
function ProfilePlaceholder({ onLogout }: { onLogout: () => void }) {
  return (
    <DropdownMenuContent align="end" className="w-56">
      <div className="p-2 space-y-2">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <span className="text-sm text-gray-600">Loading profile...</span>
        </div>
      </div>
      <DropdownMenuItem onClick={onLogout}>
        <LogOut className="mr-2 h-4 w-4" />
        Logout
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}

export default function LazyProfileDropdown({ user, onLogout }: LazyProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (isOpen && !isLoaded) {
      // Start loading the full profile when dropdown opens
      const timer = setTimeout(() => {
        setIsLoaded(true);
      }, 150); // Very quick load

      return () => clearTimeout(timer);
    }
  }, [isOpen, isLoaded]);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-8 w-8 rounded-full">
          <User className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      
      {!isLoaded ? (
        <ProfilePlaceholder onLogout={onLogout} />
      ) : (
        <Suspense fallback={<ProfilePlaceholder onLogout={onLogout} />}>
          <FullProfileContent user={user} onLogout={onLogout} />
        </Suspense>
      )}
    </DropdownMenu>
  );
}