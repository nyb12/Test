import { Link } from 'wouter';
import {
  LogIn,
  ArrowLeft,
  Plane,
  X,
  Search,
  Edit3,
  Sparkles,
} from 'lucide-react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useQuery } from '@tanstack/react-query';
import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';

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

interface ChatbotHeaderProps {
  onNavigationToggle?: () => void;
  selectedAircraft?: Aircraft | null;
  onAircraftSelect?: (aircraft: Aircraft | null) => void;
  onNewChat?: () => void;
}

export default function ChatbotHeader({
  onNavigationToggle,
  selectedAircraft,
  onAircraftSelect,
  onNewChat,
}: ChatbotHeaderProps = {}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
      // Clear any existing search when opening
      setSearchQuery('');
      // Use a longer delay to ensure dropdown is fully rendered
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 200);
    }
  }, [isDropdownOpen]);

  // Status color mapping for visual indicators
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'operational':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm';
      case 'maintenance':
        return 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm';
      case 'grounded':
        return 'bg-rose-50 text-rose-700 border-rose-200 shadow-sm';
      case 'scheduled':
        return 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm';
      case 'monitor':
        return 'bg-orange-50 text-orange-700 border-orange-200 shadow-sm';
      case 'limited':
        return 'bg-purple-50 text-purple-700 border-purple-200 shadow-sm';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200 shadow-sm';
    }
  };

  const AircraftSelector = () => (
    <DropdownMenu
      open={isDropdownOpen}
      onOpenChange={(open) => {
        // Only allow closing if search input is not focused
        if (!open && searchInputRef.current === document.activeElement) {
          return; // Prevent closing
        }
        setIsDropdownOpen(open);
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-10 h-10 p-0 rounded-xl border-slate-200 bg-white/80 backdrop-blur-sm hover:bg-white hover:shadow-md transition-all duration-200 group"
        >
          <Plane className="h-4 w-4 text-slate-600 group-hover:text-blue-600 transition-colors" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 max-h-96 overflow-y-auto border-0 shadow-xl bg-white/95 backdrop-blur-md rounded-2xl"
        onCloseAutoFocus={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          if (
            searchQuery &&
            searchInputRef.current === document.activeElement
          ) {
            e.preventDefault();
            setSearchQuery('');
          }
        }}
        onPointerDownOutside={(e) => {
          // Prevent closing when clicking inside the content
          const target = e.target as Element;
          if (target && target.closest('[data-radix-dropdown-menu-content]')) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          // Prevent closing when interacting with the search input
          const target = e.target as Element;
          if (
            target &&
            (target.closest('input') ||
              target.closest('[data-radix-dropdown-menu-content]'))
          ) {
            e.preventDefault();
          }
        }}
      >
        <div className="p-4" onKeyDown={(e) => e.stopPropagation()}>
          {/* Search input */}
          <div className="relative mb-3" onClick={(e) => e.stopPropagation()}>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              ref={searchInputRef}
              placeholder="Search aircraft..."
              value={searchQuery}
              onChange={(e) => {
                e.stopPropagation();
                setSearchQuery(e.target.value);
              }}
              onKeyDown={(e) => {
                // Prevent dropdown from closing when typing
                e.stopPropagation();
                // Clear search on escape
                if (e.key === 'Escape' && searchQuery) {
                  e.preventDefault();
                  setSearchQuery('');
                }
              }}
              onFocus={(e) => {
                // Prevent dropdown from closing when focusing
                e.stopPropagation();
              }}
              onBlur={(e) => {
                // Prevent dropdown from closing when blurring
                e.stopPropagation();
              }}
              onClick={(e) => {
                // Prevent dropdown from closing when clicking in input
                e.stopPropagation();
              }}
              className="pl-10 h-10 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              autoFocus
            />
          </div>

          {aircraftLoading ? (
            <div className="text-sm text-slate-500 p-3 text-center">
              Loading aircraft...
            </div>
          ) : filteredAircraft.length === 0 ? (
            <div className="text-sm text-slate-500 p-3 text-center">
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
                  className={`flex cursor-pointer items-center gap-3 p-3 rounded-xl mb-2 transition-all ${
                    !selectedAircraft
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 shadow-sm'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-900">
                      All Aircraft
                    </span>
                    <span className="text-xs text-slate-500">
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
                  className={`flex cursor-pointer items-center gap-3 p-3 rounded-xl mb-2 transition-all ${
                    selectedAircraft?.id === plane.id
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 shadow-sm'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {plane.tail_number}
                      </span>
                      <span className="text-sm text-slate-500">
                        ({plane.model})
                      </span>
                    </div>
                    <div className="flex gap-1 mt-2">
                      {plane.status_tags ? (
                        plane.status_tags.split(',').map((tag, index) => (
                          <span
                            key={index}
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                              tag.trim(),
                            )}`}
                          >
                            {tag.trim()}
                          </span>
                        ))
                      ) : (
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                            plane.primary_status,
                          )}`}
                        >
                          {plane.primary_status}
                        </span>
                      )}
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <header className="border-b border-slate-200/60 py-4 bg-gradient-to-r from-slate-50 via-white to-slate-50 shadow-sm backdrop-blur-sm">
      <div className="flex justify-between items-center px-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          {onNavigationToggle && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onNavigationToggle}
              className="h-10 w-10 p-0 rounded-xl hover:bg-slate-100 hover:shadow-sm transition-all duration-200 group"
            >
              <ArrowLeft className="h-4 w-4 text-slate-600 group-hover:text-slate-900 transition-colors" />
            </Button>
          )}
          <Link href="/" className="flex items-center group">
            <div className="relative">
              <img
                src="/Ironfleet-LOGO-notagline.jpg"
                alt="Ironfleet Logo"
                className="h-10 w-auto logo-475 rounded-lg shadow-sm group-hover:shadow-md transition-all duration-200"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/10 group-hover:to-purple-500/10 rounded-lg transition-all duration-300" />
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {selectedAircraft && (
            <HoverCard>
              <HoverCardTrigger asChild>
                <div
                  className={`flex items-center rounded-xl px-4 py-2.5 gap-3 cursor-pointer transition-all duration-200 max-w-[220px] sm:max-w-none shadow-sm hover:shadow-md ${
                    selectedAircraft.primary_status === 'operational'
                      ? 'bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 hover:from-emerald-100 hover:to-green-100'
                      : selectedAircraft.primary_status === 'grounded'
                      ? 'bg-gradient-to-r from-rose-50 to-red-50 border border-rose-200 hover:from-rose-100 hover:to-red-100'
                      : 'bg-gradient-to-r from-slate-50 to-gray-50 border border-slate-200 hover:from-slate-100 hover:to-gray-100'
                  }`}
                >
                  <div className="flex flex-col min-w-0 flex-1">
                    <span
                      className={`text-sm font-semibold truncate ${
                        selectedAircraft.primary_status === 'operational'
                          ? 'text-emerald-900'
                          : selectedAircraft.primary_status === 'grounded'
                          ? 'text-rose-900'
                          : 'text-slate-900'
                      }`}
                    >
                      {selectedAircraft.tail_number}
                    </span>
                    <span
                      className={`text-xs truncate ${
                        selectedAircraft.primary_status === 'operational'
                          ? 'text-emerald-700'
                          : selectedAircraft.primary_status === 'grounded'
                          ? 'text-rose-700'
                          : 'text-slate-700'
                      }`}
                    >
                      ({selectedAircraft.model})
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAircraftSelect?.(null);
                    }}
                    className="h-5 w-5 rounded-full hover:bg-blue-200 flex items-center justify-center text-blue-600 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </HoverCardTrigger>
              <HoverCardContent
                className="w-80 p-6 border-0 shadow-2xl bg-white/95 backdrop-blur-md rounded-2xl"
                align="end"
              >
                <div className="space-y-5">
                  {/* Header */}
                  <div className="border-b border-slate-200 pb-4">
                    <h3 className="text-lg font-bold text-slate-900">
                      {selectedAircraft.tail_number} -{' '}
                      {selectedAircraft.manufacturer} {selectedAircraft.model}
                    </h3>
                  </div>

                  {/* Status Pills */}
                  <div className="flex flex-wrap gap-2">
                    {selectedAircraft.status_tags ? (
                      selectedAircraft.status_tags
                        .split(',')
                        .map((tag, index) => (
                          <span
                            key={index}
                            className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${getStatusColor(
                              tag.trim(),
                            )}`}
                          >
                            {tag.trim()}
                          </span>
                        ))
                    ) : (
                      <span
                        className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${getStatusColor(
                          selectedAircraft.primary_status,
                        )}`}
                      >
                        {selectedAircraft.primary_status}
                      </span>
                    )}
                  </div>

                  {/* Aircraft Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 rounded-xl p-4">
                    <div>
                      <span className="text-slate-500 font-medium">Year:</span>
                      <span className="ml-2 font-semibold text-slate-900">
                        {selectedAircraft.year_manufactured || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">
                        Flight Hours:
                      </span>
                      <span className="ml-2 font-semibold text-slate-900">
                        {selectedAircraft.flight_hours
                          ? Number(
                              selectedAircraft.flight_hours,
                            ).toLocaleString()
                          : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Grounding Reason - Show for grounded aircraft */}
                  {selectedAircraft.grounding_reason &&
                    selectedAircraft.grounding_reason.trim() !== '' && (
                      <div className="bg-gradient-to-r from-rose-50 to-red-50 border border-rose-200 rounded-xl p-4 shadow-sm">
                        <h4 className="font-semibold text-rose-900 mb-2 flex items-center gap-2">
                          <div className="w-2 h-2 bg-rose-500 rounded-full" />
                          Grounding Reason
                        </h4>
                        <p className="text-sm text-rose-800 leading-relaxed">
                          {selectedAircraft.grounding_reason}
                        </p>
                        {selectedAircraft.next_maintenance_date && (
                          <p className="text-xs text-rose-700 mt-2 font-medium">
                            Est. Return:{' '}
                            {new Date(
                              selectedAircraft.next_maintenance_date,
                            ).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    )}

                  {/* Limitation Details - Show for limited/monitor aircraft */}
                  {selectedAircraft.limitation_details &&
                    selectedAircraft.limitation_details.trim() !== '' && (
                      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4 shadow-sm">
                        <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                          <div className="w-2 h-2 bg-amber-500 rounded-full" />
                          Limited/Monitor Details
                        </h4>
                        <p className="text-sm text-amber-800 leading-relaxed">
                          {selectedAircraft.limitation_details}
                        </p>
                        {selectedAircraft.regulatory_reference && (
                          <p className="text-xs text-amber-700 mt-2 font-medium">
                            Ref: {selectedAircraft.regulatory_reference}
                          </p>
                        )}
                      </div>
                    )}

                  {/* Scheduled Service - Show when scheduled status or has scheduled secondary status */}
                  {(selectedAircraft.primary_status === 'scheduled' ||
                    selectedAircraft.secondary_statuses?.includes(
                      'scheduled',
                    )) &&
                    selectedAircraft.status_details &&
                    selectedAircraft.status_details.trim() !== '' && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 shadow-sm">
                        <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          Scheduled Service
                        </h4>
                        <p className="text-sm text-blue-800 leading-relaxed">
                          {selectedAircraft.status_details}
                        </p>
                        {selectedAircraft.next_maintenance_date && (
                          <p className="text-xs text-blue-700 mt-2 font-medium">
                            Date:{' '}
                            {new Date(
                              selectedAircraft.next_maintenance_date,
                            ).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    )}

                  {/* Operational Status - Show general status details for operational aircraft */}
                  {selectedAircraft.primary_status === 'operational' &&
                    selectedAircraft.status_details &&
                    selectedAircraft.status_details.trim() !== '' &&
                    !selectedAircraft.limitation_details && (
                      <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-4 shadow-sm">
                        <h4 className="font-semibold text-emerald-900 mb-2 flex items-center gap-2">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                          Status
                        </h4>
                        <p className="text-sm text-emerald-800 leading-relaxed">
                          {selectedAircraft.status_details}
                        </p>
                      </div>
                    )}
                </div>
              </HoverCardContent>
            </HoverCard>
          )}
          <AircraftSelector />
          {onNewChat && (
            <Button
              variant="outline"
              size="sm"
              onClick={onNewChat}
              className="w-10 h-10 p-0 rounded-xl border-slate-200 bg-white/80 backdrop-blur-sm hover:bg-white hover:shadow-md transition-all duration-200 group"
              title="Start New Chat"
            >
              <Sparkles className="h-4 w-4 text-slate-600 group-hover:text-purple-600 transition-colors" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
