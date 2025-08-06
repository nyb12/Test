import {
  ArrowLeft,
  Plane,
  Edit3,
  Search,
  User,
  LogOut,
  Settings,
  Bell,
  Menu,
  LockKeyhole,
  Ticket,
  Contact,
  Banknote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import {
  ironFleetLogo,
  mobileDashboard,
  mobileObservations,
  mobileAskquestions,
  mobileDocs,
  mobileChatwithother,
} from '@/components/svg';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar';
import { getUserInitials } from '@/utils/helper';
import * as Dialog from '@radix-ui/react-dialog';

interface Aircraft {
  id: number;
  tail_number: string;
  model: string;
  manufacturer: string;
  primary_status: string;
  secondary_statuses: string;
  status_details: string;
  limitation_details: string;
  grounding_reason: string;
  next_maintenance_date: string;
  regulatory_reference: string;
  flight_hours: number;
  year_manufactured: number;
  status_tags: string;
}

interface SimpleChatbotHeaderProps {
  onNavigationToggle?: () => void;
  selectedAircraft?: Aircraft | null;
  onAircraftSelect?: (aircraft: Aircraft | null) => void;
  onNewChat?: () => void;
}
interface NavItem {
  label: string;
  href: string;
  active?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Chat with Others', href: '/chats' },
  { label: 'Contacts', href: '/contacts' },
  { label: 'Chat with AI', href: '/chat-with-ai' },
  { label: 'Make Observation', href: '/observation' },
  { label: 'Docs', href: '/documentation' },
  { label: 'Fleetspan', href: '/fleetspan' },
];

export default function SimpleChatbotHeader({
  onNavigationToggle,
  selectedAircraft,
  onAircraftSelect,
  onNewChat,
}: SimpleChatbotHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [location, setLocation] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [currentContainer, setCurrentContainer] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  const [activeToolName, setActiveToolName] = useState<string | null>(null);

  // Track selected status filter for highlighting
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<
    string | null
  >(null);
  const { data: fleetspanPrompts = [] } = useQuery<any[]>({
    queryKey: ['/api/tools/1006/selective-prompts'],
    staleTime: 0, // No caching to get fresh data
    gcTime: 5 * 60 * 1000, // Keep in memory for 5 minutes only
    enabled: true,
  });

  const generateUniqueId = (prefix: string = 'section') => {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        window.location.reload();
      },
    });
    setLocation('/');
  };

  const handleProfile = () => {
    setLocation('/profile');
  };

  const handleContacts = () => {
    setLocation('/contacts');
  };

  const handleNavItemClick = (href: string) => {
    setLocation(href);
  };
  // Fetch aircraft data
  const { data: aircraft = [], isLoading: aircraftLoading } = useQuery<
    Aircraft[]
  >({
    queryKey: ['/api/aircraft'],
  });

  // Filter aircraft based on search query
  const filteredAircraft = (aircraft as Aircraft[]).filter(
    (plane) =>
      plane.tail_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plane.model.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (isDropdownOpen && searchInputRef.current) {
      setSearchQuery('');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 200);
    }
  }, [isDropdownOpen]);

  useEffect(() => {
    // Only proceed if we have meaningful changes
    const currentAircraft = selectedAircraft?.tail_number || 'null';
    const currentTool = currentContainer?.tool;

    // Clear status filter when aircraft selection changes
    if (
      activeToolName === 'FleetSpan' ||
      (currentContainer && currentContainer.tool === 'FleetSpan')
    ) {
      setSelectedStatusFilter(null);
    }

    // If FleetSpan is the active tool, update it with new aircraft context
    if (
      activeToolName === 'FleetSpan' ||
      (currentContainer && currentContainer.tool === 'FleetSpan')
    ) {
      setTimeout(() => {
        setCurrentContainer((prev: any) => {
          if (
            !prev ||
            (prev.tool !== 'FleetSpan' && activeToolName !== 'FleetSpan')
          ) {
            return prev;
          }

          // If aircraft is selected, show aircraft card directly
          if (selectedAircraft) {
            return {
              ...prev,
              tool: 'FleetSpan',
              messages: [
                {
                  text: `Here's your selected aircraft:`,
                  isUser: false,
                  isAircraftList: true,
                  filter: selectedAircraft.tail_number,
                  selectedAircraft: selectedAircraft,
                  toolOutputId: generateUniqueId('aircraft_card'),
                },
              ],
            };
          } else {
            return {
              ...prev,
              tool: 'FleetSpan',
              messages: [
                {
                  text: '',
                  isUser: false,
                  isSelectiveAction: true,
                  selectivePrompts: fleetspanPrompts,
                  primaryActionLabel: 'Filter by:',
                  toolOutputId: generateUniqueId('selective'),
                },
                {
                  text: 'All Aircraft:',
                  isUser: false,
                  isAircraftList: true,
                  filter: 'all',
                  toolOutputId: generateUniqueId('aircraft_list'),
                },
              ],
            };
          }
        });
      }, 100); // Small delay to ensure state is properly set
    }
  }, [
    selectedAircraft?.tail_number,
    fleetspanPrompts,
    activeToolName,
    currentContainer?.tool,
  ]);

  function AircraftSelectorBase({
    selectedAircraft,
    onAircraftSelect,
    isMobile = false,
  }: {
    selectedAircraft: Aircraft | null;
    onAircraftSelect: (aircraft: Aircraft | null) => void;
    isMobile?: boolean;
  }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const { data: aircraft = [], isLoading: aircraftLoading } = useQuery<
      Aircraft[]
    >({
      queryKey: ['/api/aircraft'],
    });

    const filteredAircraft = aircraft.filter(
      (plane) =>
        plane.tail_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plane.model.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    useEffect(() => {
      if (isDropdownOpen && searchInputRef.current) {
        setSearchQuery('');
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 200);
      }
    }, [isDropdownOpen]);

    return (
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`flex items-center gap-2 h-10 px-3 max-w-xs bg-gray-900 text-white`}
          >
            <Plane className="h-5 w-5" />
            {selectedAircraft ? (
              <div className="flex flex-col items-start min-w-0">
                <span className="text-sm font-medium truncate">
                  {selectedAircraft.tail_number}
                </span>
                <span className="text-xs text-gray-500 truncate">
                  {selectedAircraft.model}
                </span>
              </div>
            ) : (
              <span className="text-sm font-medium">Select Aircraft</span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto">
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                ref={searchInputRef}
                placeholder="Search aircraft..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-8"
                autoFocus
              />
            </div>
          </div>
          {aircraftLoading ? (
            <div className="text-sm text-gray-500 p-2">Loading aircraft...</div>
          ) : filteredAircraft.length === 0 ? (
            <div className="text-sm text-gray-500 p-2">
              {searchQuery
                ? 'No aircraft found matching your search'
                : 'No aircraft available'}
            </div>
          ) : (
            <>
              {!searchQuery && (
                <DropdownMenuItem
                  onClick={() => {
                    onAircraftSelect?.(null);
                    setIsDropdownOpen(false);
                  }}
                  className={`flex cursor-pointer items-center gap-3 p-3 ${
                    !selectedAircraft ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">All Aircraft</span>
                    <span className="text-xs text-gray-500">
                      General fleet overview
                    </span>
                  </div>
                </DropdownMenuItem>
              )}
              {filteredAircraft.map((plane: Aircraft) => (
                <DropdownMenuItem
                  key={plane.id}
                  onClick={() => {
                    onAircraftSelect?.(plane);
                    setIsDropdownOpen(false);
                  }}
                  className={`flex cursor-pointer items-center gap-3 p-3 ${
                    selectedAircraft?.id === plane.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-medium truncate">
                      {plane.tail_number}
                    </span>
                    <span className="text-xs text-gray-500 truncate">
                      {plane.model}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      plane.primary_status === 'operational'
                        ? 'bg-green-100 text-green-800'
                        : plane.primary_status === 'grounded'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {plane.primary_status}
                  </span>
                </DropdownMenuItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  const currentNavItems = navItems.map((item) => ({
    ...item,
    active: location === item.href,
  }));

  return (
    <header className="flex justify-between items-center px-4 sm:px-6 md:px-8 py-2 sm:py-3 md:py-4 bg-white border-b border-gray-200 w-full">
      {/* Show AircraftSelectorBase on mobile, logo on sm+ */}
      <div className="flex items-center min-w-0">
        {user ? (
          <>
            <div className="sm:hidden">
              <AircraftSelectorBase
                selectedAircraft={selectedAircraft ?? null}
                onAircraftSelect={onAircraftSelect ?? (() => {})}
                isMobile
              />
            </div>
            <Link
              href="/dashboard"
              className="hidden sm:flex items-center min-w-0"
            >
              <img
                src={ironFleetLogo}
                alt="Ironfleet Logo"
                className="h-7 w-auto sm:h-8 md:h-9"
              />
            </Link>
          </>
        ) : (
          <Link href="/dashboard" className="flex items-center min-w-0">
            <img
              src={ironFleetLogo}
              alt="Ironfleet Logo"
              className="h-7 w-auto sm:h-8 md:h-9"
            />
          </Link>
        )}
      </div>
      {/* Desktop/Tablet Navigation */}
      {user && (
        <div className="hidden lg:flex items-center justify-between w-full pl-4 sm:pl-8 md:pl-12 lg:pl-20">
          <div className="flex items-center flex-1">
            <nav className="flex flex-nowrap space-x-2 sm:space-x-4 md:space-x-6 flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
              {currentNavItems
                .filter((item) => item.label !== 'Contacts')
                .map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`nav-link font-medium relative text-xs sm:text-sm md:text-base px-3 py-1 ${
                      item.active
                        ? 'text-gray-900 rounded-xl bg-gray-100'
                        : 'text-gray-500'
                    } hover:text-gray-800 transition-colors duration-200 whitespace-nowrap`}
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
            {/* AircraftSelector only for lg and up */}
            <div className="hidden lg:flex ml-4">
              <AircraftSelectorBase
                selectedAircraft={selectedAircraft ?? null}
                onAircraftSelect={onAircraftSelect ?? (() => {})}
              />
            </div>
          </div>
          {/* Icons and User Profile Dropdown */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-4 ml-1 sm:ml-2 md:ml-4">
            <Settings className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-gray-500 hover:text-gray-700 cursor-pointer" />
            <Bell className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-gray-500 hover:text-gray-700 cursor-pointer" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex bg-primary items-center text-gray-600 hover:text-gray-900 transition-colors rounded-full">
                  <Avatar className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 rounded-full overflow-hidden">
                    <AvatarImage src={user?.profilePhoto || undefined} />
                    <AvatarFallback className="flex justify-center items-center text-white leading-8 text-sm">
                      {getUserInitials(user)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 sm:w-48 md:w-56">
                <DropdownMenuItem
                  // onClick={handleLogout}
                  className="cursor-pointer flex items-center justify-between"
                >
                  <span>Subscription</span>
                  <Banknote className="h-4 w-4" />
                </DropdownMenuItem>
                <DropdownMenuItem
                  // onClick={handleLogout}
                  className="cursor-pointer flex items-center justify-between"
                >
                  <span>Security</span>
                  <LockKeyhole className="h-4 w-4" />
                </DropdownMenuItem>
                <DropdownMenuItem
                  // onClick={handleLogout}
                  className="cursor-pointer flex items-center justify-between"
                >
                  <span>Expert Tickets</span>
                  <Ticket className="h-4 w-4" />
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleContacts}
                  className="cursor-pointer flex items-center justify-between"
                >
                  <span>Contacts</span>
                  <Contact className="h-4 w-4" />
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleProfile}
                  className="cursor-pointer flex items-center justify-between"
                >
                  <span>Profile</span>
                  <User className="h-4 w-4" />
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-red-600 flex items-center justify-between"
                >
                  <span>Logout</span>
                  <LogOut className="h-4 w-4" />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}
      {!user && (
        <div className="flex items-center justify-end w-full pr-4 sm:pr-8 md:pr-12 lg:pr-20">
          <Link href="/">
            <Button>Login</Button>
          </Link>
        </div>
      )}
      {/* Mobile/Tablet Drawer Menu using Radix Dialog */}
      <Dialog.Root open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <Dialog.Trigger asChild>
          <button
            className="lg:hidden text-gray-800 focus:outline-none p-2 rounded-md hover:bg-gray-100"
            aria-label="Open menu"
          >
            <Menu className="w-7 h-7 sm:w-8 sm:h-8" />
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-30 z-40" />
          <Dialog.Content
            className="fixed top-0 left-0 h-full w-64 sm:w-72 md:w-80 bg-white z-50 shadow-lg pt-16 sm:pt-20 transition-transform focus:outline-none flex flex-col"
            style={{ maxWidth: '100vw' }}
          >
            <button
              className="absolute top-4 right-4 text-gray-700 hover:text-gray-900 p-2 rounded-full focus:outline-none bg-gray-100"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            {/* Aircraft Selector for mobile view */}
            {user && (
              <>
                <div className="block lg:hidden px-6 mt-4">
                  <AircraftSelectorBase
                    selectedAircraft={selectedAircraft ?? null}
                    onAircraftSelect={onAircraftSelect ?? (() => {})}
                    isMobile
                  />
                </div>
                <nav className="flex flex-col gap-2 px-6 py-4 flex-1 overflow-y-auto">
                  {currentNavItems.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block py-2 px-2 rounded-md font-medium text-base transition-colors duration-200 ${
                        item.active
                          ? 'bg-gray-100 text-gray-900 '
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </>
            )}
            {/* User Profile and Logout */}
            {user && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center gap-3">
                <Avatar className="h-12 w-12 bg-primary rounded-full overflow-hidden">
                  <AvatarImage src={user?.profilePhoto || undefined} />
                  <AvatarFallback className="flex justify-center items-center text-white leading-10 text-sm">
                    {getUserInitials(user)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {user.email || 'User'}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {user.email}
                  </div>
                </div>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="ml-2 px-3 py-1 text-sm rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
            {!user && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center gap-3">
                <Link href="/">
                  <Button>Login</Button>
                </Link>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      {/* Mobile Bottom Navigation */}
      {user && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 text-white border-t border-gray-800 flex justify-around items-center py-2 lg:hidden">
          {currentNavItems
            .filter((item) => item.label !== 'Fleetspan')
            .map((item) => (
              <button
                key={item.label}
                onClick={() => handleNavItemClick(item.href)}
                className="flex flex-col items-center justify-center text-xs px-2"
              >
                {item.label === 'Dashboard' && (
                  <div className="mb-1">
                    <img
                      src={mobileDashboard}
                      alt="Dashboard"
                      className={`h-5 w-5 transition duration-300 ${
                        item.active ? 'brightness-200' : 'opacity-60'
                      }`}
                    />
                  </div>
                )}
                {item.label === 'Chat with Others' && (
                  <div className="mb-1">
                    <img
                      src={mobileChatwithother}
                      alt="Ask Question/Troubleshoot"
                      className={`h-5 w-5 transition duration-300 ${
                        item.active ? 'brightness-200' : 'opacity-60'
                      }`}
                    />
                  </div>
                )}
                {item.label === 'Chat with AI' && (
                  <div className="mb-1">
                    <img
                      src={mobileAskquestions}
                      alt="Ask Question/Troubleshoot"
                      className={`h-5 w-5 transition duration-300 ${
                        item.active ? 'brightness-200' : 'opacity-60'
                      }`}
                    />
                  </div>
                )}
                {item.label === 'Make Observation' && (
                  <div className="mb-1">
                    <img
                      src={mobileObservations}
                      alt="Make Observation"
                      className={`h-5 w-5 transition duration-300 ${
                        item.active ? 'brightness-200' : 'opacity-60'
                      }`}
                    />
                  </div>
                )}
                {item.label === 'Docs' && (
                  <div className="mb-1">
                    <img
                      src={mobileDocs}
                      alt="Docs"
                      className={`h-5 w-5 transition duration-300 ${
                        item.active ? 'brightness-200' : 'opacity-60'
                      }`}
                    />
                  </div>
                )}
                {item.label === 'Contacts' && (
                  <div className="mb-1">
                    <Contact
                      className={`h-5 w-5 transition duration-300 ${
                        item.active ? 'text-white' : 'text-gray-400'
                      }`}
                    />
                  </div>
                )}
                <span
                  className={`text-[10px] ${
                    item.active ? 'text-white font-semibold' : 'text-gray-400'
                  }`}
                >
                  {item.label.replace(
                    'Ask Question/Troubleshoot',
                    'Ask question',
                  )}
                </span>
              </button>
            ))}
        </div>
      )}
    </header>
  );
}
