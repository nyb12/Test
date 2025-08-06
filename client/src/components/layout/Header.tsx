import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import MobileMenu from './MobileMenu';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut } from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  active?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Home', href: '/' },
  // { label: 'Dashboard', href: '/dashboard' },
  // { label: 'Chats', href: '/chats' },
  { label: 'About', href: '/about' },
  { label: 'avi.OS', href: '/features' },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const { user, logoutMutation } = useAuth();

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        window.location.reload();
      },
    });
  };

  const handleProfile = () => {
    setLocation('/profile');
  };

  const getUserInitials = (user: any) => {
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    if (user?.phone) {
      return user.phone.slice(-2).toUpperCase();
    }
    return 'U';
  };

  // Update navItems to mark the active item based on current location
  const currentNavItems = navItems.map((item) => ({
    ...item,
    active: location === item.href,
  }));

  return (
    <header
      className="border-b border-gray-200 py-4"
      style={{ backgroundColor: '#E2E2E2' }}
    >
      <div className="container mx-auto px-6 flex justify-between items-center">
        <Link href="/" className="flex items-center">
          <img
            src="/Ironfleet-LOGO-notagline.jpg"
            alt="Ironfleet Logo"
            className="h-8 w-auto"
          />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center">
          <nav className="flex space-x-8 mr-8">
            {currentNavItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`nav-link font-medium relative ${
                  item.active ? 'text-gray-800' : 'text-gray-500'
                } hover:text-gray-800 transition-colors duration-200`}
              >
                {item.label}
                <span
                  className={`absolute bottom-[-4px] left-0 h-[2px] bg-primary transition-all duration-300 ${
                    item.active ? 'w-full' : 'w-0'
                  } group-hover:w-full`}
                ></span>
              </Link>
            ))}
          </nav>

          {/* User Profile Dropdown */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center text-gray-600 hover:text-gray-900 transition-colors">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.profilePhoto || undefined} />
                    <AvatarFallback className="bg-primary text-white text-sm">
                      {getUserInitials(user)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={handleProfile}
                  className="cursor-pointer"
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-gray-600 focus:outline-none"
          onClick={toggleMobileMenu}
          aria-label="Toggle mobile menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h16M4 18h16"
            ></path>
          </svg>
        </button>
      </div>

      {/* Mobile Navigation */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        navItems={currentNavItems}
        user={user}
        onLogout={handleLogout}
      />
    </header>
  );
}
