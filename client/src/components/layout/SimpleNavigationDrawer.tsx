import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, User, MessageSquare, X, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

interface SimpleNavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SimpleNavigationDrawer({ isOpen, onClose }: SimpleNavigationDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        onClose();
        setLocation("/");
      }
    });
  };

  const handleProfileClick = () => {
    onClose();
    setLocation("/profile");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      <div className="relative w-80 bg-white h-full shadow-xl flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 mr-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-50 border-gray-200"
              />
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

        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="space-y-2">
              <div className="p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100">
                <div className="flex items-start space-x-3">
                  <div className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0">
                    <MessageSquare className="h-full w-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      Product Inquiry
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Asked about shipping options and pricing...
                    </p>
                    <p className="text-xs text-gray-400 mt-1">2 hours ago</p>
                  </div>
                </div>
              </div>
              
              <div className="p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100">
                <div className="flex items-start space-x-3">
                  <div className="h-4 w-4 text-green-600 mt-1 flex-shrink-0">
                    <MessageSquare className="h-full w-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      Technical Support
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Help with account setup and configuration...
                    </p>
                    <p className="text-xs text-gray-400 mt-1">1 day ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="space-y-2">
            <button 
              onClick={handleProfileClick}
              className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-white transition-colors text-left"
            >
              <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user ? `${(user as any).firstName || ''} ${(user as any).lastName || ''}`.trim() || 'User Profile' : 'Profile'}
                </p>
                <p className="text-xs text-gray-500">View and edit profile</p>
              </div>
            </button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="w-full justify-start h-auto p-3 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4 mr-3" />
              {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}