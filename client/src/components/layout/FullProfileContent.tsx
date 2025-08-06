import { User, LogOut, Settings, MessageSquare } from "lucide-react";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Link } from "wouter";

interface FullProfileContentProps {
  user: any;
  onLogout: () => void;
}

export default function FullProfileContent({ user, onLogout }: FullProfileContentProps) {
  // Get display name from user data
  const displayName = user?.email || user?.phone || "User";
  const contactMethod = user?.signUpMethod?.toLowerCase() || "email";

  return (
    <DropdownMenuContent align="end" className="w-56">
      <DropdownMenuLabel className="flex flex-col space-y-1">
        <span className="text-sm font-medium">My Account</span>
        <span className="text-xs text-gray-500 truncate">{displayName}</span>
      </DropdownMenuLabel>
      
      <DropdownMenuSeparator />
      
      <DropdownMenuItem asChild>
        <Link href="/profile" className="flex w-full">
          <User className="mr-2 h-4 w-4" />
          Profile Settings
        </Link>
      </DropdownMenuItem>
      
      <DropdownMenuItem asChild>
        <Link href="/chatbot" className="flex w-full">
          <MessageSquare className="mr-2 h-4 w-4" />
          Chat History
        </Link>
      </DropdownMenuItem>
      
      <DropdownMenuSeparator />
      
      <DropdownMenuItem onClick={onLogout}>
        <LogOut className="mr-2 h-4 w-4" />
        Logout
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}