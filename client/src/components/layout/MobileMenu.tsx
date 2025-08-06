import { useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { User, LogOut } from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  active?: boolean;
}

interface MobileMenuProps {
  isOpen: boolean;
  navItems: NavItem[];
  user?: any;
  onLogout?: () => void;
}

export default function MobileMenu({ isOpen, navItems, user, onLogout }: MobileMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (menuRef.current) {
      if (isOpen) {
        menuRef.current.classList.remove("hidden");
        setTimeout(() => {
          if (menuRef.current) {
            menuRef.current.style.maxHeight = `${menuRef.current.scrollHeight}px`;
          }
        }, 10);
      } else {
        if (menuRef.current) {
          menuRef.current.style.maxHeight = "0";
          const timeout = setTimeout(() => {
            if (menuRef.current) {
              menuRef.current.classList.add("hidden");
            }
          }, 300);
          return () => clearTimeout(timeout);
        }
      }
    }
  }, [isOpen]);

  return (
    <div 
      ref={menuRef}
      className="md:hidden hidden bg-white py-4 px-6 border-t border-gray-200 overflow-hidden transition-all duration-300"
      style={{ maxHeight: "0" }}
    >
      <div className="flex flex-col space-y-4">
        {navItems.map((item) => (
          <Link 
            key={item.label}
            href={item.href}
            className={`${item.active ? 'text-gray-800' : 'text-gray-500'} font-medium py-2`}
          >
            {item.label}
          </Link>
        ))}
        
        {/* User Profile and Logout options for authenticated users */}
        {user && (
          <>
            <hr className="border-gray-200 my-2" />
            <button
              onClick={() => setLocation('/profile')}
              className="flex items-center text-gray-500 font-medium py-2 text-left"
            >
              <User className="mr-3 h-4 w-4" />
              Profile
            </button>
            <button
              onClick={onLogout}
              className="flex items-center text-red-600 font-medium py-2 text-left"
            >
              <LogOut className="mr-3 h-4 w-4" />
              Logout
            </button>
          </>
        )}
      </div>
    </div>
  );
}
