import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { Plane, Camera, Video, Mic, File, X, Search } from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import MultimediaInput from '@/components/MultimediaInput';

// Helper to group aircraft by manufacturer
function groupByManufacturer(aircraft: any[]): Record<string, any[]> {
  return aircraft.reduce((acc: Record<string, any[]>, plane: any) => {
    const key = plane.manufacturer || 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(plane);
    return acc;
  }, {});
}

interface MobileFleetspanProps {
  onViewInfo?: (plane: any) => void;
}

const MobileFleetspan: React.FC<MobileFleetspanProps> = ({ onViewInfo }) => {
  const { data: aircraft = [] } = useQuery({
    queryKey: ['/api/aircraft'],
    enabled: true,
  });

  // Filter state
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedManufacturer, setSelectedManufacturer] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showObservationMenu, setShowObservationMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [showMultimediaInput, setShowMultimediaInput] = useState(false);
  const [multimediaMode, setMultimediaMode] = useState<
    'photo' | 'video' | 'audio' | undefined
  >();

  // Observation menu close on outside click
  useEffect(() => {
    if (!showObservationMenu) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowObservationMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showObservationMenu]);

  // Filter logic (same as desktop)
  const filteredAircraft = (aircraft as any[]).filter((plane: any) => {
    if (selectedStatus) {
      const tags =
        plane.status_tags
          ?.toLowerCase()
          .split(',')
          .map((s: string) => s.trim()) || [];
      if (!tags.includes(selectedStatus.toLowerCase())) return false;
    }
    if (selectedType && plane.model !== selectedType) return false;
    if (selectedManufacturer && plane.manufacturer !== selectedManufacturer)
      return false;

    // Search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        plane.tail_number?.toLowerCase().includes(search) ||
        plane.model?.toLowerCase().includes(search) ||
        plane.manufacturer?.toLowerCase().includes(search);
      if (!matchesSearch) return false;
    }

    return true;
  });

  const grouped = groupByManufacturer(filteredAircraft);
  const manufacturers = Object.keys(grouped);

  // Mobile-friendly dropdown menu for Make Observation
  // Remove dropdownMenu and instead open MultimediaInput in the correct mode

  return (
    <div className="bg-[#DAE0F2] min-h-screen pb-2">
      {/* Mobile Header */}
      <div className="flex flex-col gap-2 items-stretch bg-gradient-to-r from-[#4D67A4] to-[#5BA5C7] py-4 px-3 rounded-b-xl">
        {/* Filter Accordion */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="filter" className="border-none">
            <AccordionTrigger className="text-white hover:no-underline py-2">
              <span className="text-sm font-medium">Filter</span>
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pt-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-white font-medium">Status</label>
                <Select
                  value={selectedStatus}
                  onValueChange={setSelectedStatus}
                >
                  <SelectTrigger className="h-9 w-full bg-white text-sm ">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(
                      new Set(
                        (aircraft as any[]).flatMap(
                          (plane: any) =>
                            plane.status_tags
                              ?.split(',')
                              .map((s: string) => s.trim()) || [],
                        ),
                      ),
                    ).map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-white font-medium">
                  Aircraft type
                </label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="h-9 w-full bg-white text-sm rounded-md">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(
                      new Set(
                        (aircraft as any[]).map((plane: any) => plane.model),
                      ),
                    ).map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-white font-medium">
                  Manufacturer
                </label>
                <Select
                  value={selectedManufacturer}
                  onValueChange={setSelectedManufacturer}
                >
                  <SelectTrigger className="h-9 w-full bg-white text-sm rounded-md">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(
                      new Set(
                        (aircraft as any[]).map(
                          (plane: any) => plane.manufacturer,
                        ),
                      ),
                    ).map((manufacturer) => (
                      <SelectItem key={manufacturer} value={manufacturer}>
                        {manufacturer}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Search input */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-white font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search aircraft..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-9 w-full rounded-md ring-2 ring-blue-500/20 border-blue-500 transition-all text-sm"
                    aria-label="Search aircraft"
                  />
                </div>
              </div>
              {(selectedStatus ||
                selectedType ||
                selectedManufacturer ||
                searchTerm) && (
                <button
                  className="h-9 px-4 text-sm text-white bg-[#5BA5C7] rounded-full mt-1 self-end"
                  onClick={() => {
                    setSelectedStatus('');
                    setSelectedType('');
                    setSelectedManufacturer('');
                    setSearchTerm('');
                  }}
                >
                  <X className="w-4 h-4 inline-block mr-1" /> Clear Filters
                </button>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        {/* Action Buttons */}
        <div className="flex gap-2 mt-2">
          <button className="flex-1 bg-white text-sm text-[#3b82f6] font-medium px-4 py-2 rounded-md shadow">
            Troubleshoot
          </button>
          <div className="relative flex-1">
            <button
              onClick={() => setShowObservationMenu((prev) => !prev)}
              className="w-full bg-[#0f172a] text-white text-sm font-medium px-4 py-2 rounded-md"
            >
              Make Observation
            </button>
            {showObservationMenu && (
              <div
                ref={menuRef}
                className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-md shadow-lg z-10"
              >
                <ul className="py-1 text-sm text-gray-700">
                  <li
                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer justify-between"
                    onClick={() => {
                      setShowObservationMenu(false);
                      setMultimediaMode('photo');
                      setShowMultimediaInput(true);
                    }}
                  >
                    Take Photo
                    <Camera className="w-4 h-4" />
                  </li>
                  <li
                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer justify-between"
                    onClick={() => {
                      setShowObservationMenu(false);
                      setMultimediaMode('video');
                      setShowMultimediaInput(true);
                    }}
                  >
                    Record Video
                    <Video className="w-4 h-4" />
                  </li>
                  <li
                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer justify-between"
                    onClick={() => {
                      setShowObservationMenu(false);
                      setMultimediaMode('audio');
                      setShowMultimediaInput(true);
                    }}
                  >
                    Record Audio
                    <Mic className="w-4 h-4" />
                  </li>
                  <li
                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer justify-between"
                    onClick={() => {
                      setShowObservationMenu(false);
                      setMultimediaMode(undefined); // undefined triggers upload mode
                      setShowMultimediaInput(true);
                    }}
                  >
                    Upload File
                    <File className="w-4 h-4" />
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Results count */}
      <div className="px-3 pt-3 pb-1">
        <div className="text-sm font-medium text-foreground">
          Showing {filteredAircraft.length} results
        </div>
      </div>
      {/* Aircraft accordion */}
      <Accordion type="multiple" className="space-y-2 px-2">
        {manufacturers.map((manufacturer: string) => (
          <AccordionItem
            key={manufacturer}
            value={manufacturer}
            className="rounded-xl bg-white shadow border border-gray-200"
          >
            <AccordionTrigger className="flex items-center px-4 py-3 gap-2 border-b border-gray-200">
              <span className="font-semibold text-base flex-1 text-left">
                {manufacturer}
              </span>
              <span className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center text-xs font-bold mr-[4.5rem]">
                icon
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">
                  {grouped[manufacturer].length} Aircrafts
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="divide-y divide-gray-100 px-2 pb-2">
              {grouped[manufacturer].map((plane: any) => (
                <div key={plane.id} className="py-3 flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-sm">{plane.model}</span>
                      <span className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                        <Plane className="w-4 h-4 text-gray-400" />
                        {plane.tail_number}
                      </span>
                    </div>
                    <button
                      className="border border-gray-300 rounded px-3 py-1 text-xs font-medium text-gray-700 bg-white"
                      onClick={() => onViewInfo && onViewInfo(plane)}
                    >
                      View Info
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Scheduled service:{' '}
                    {plane.next_maintenance_date
                      ? new Date(
                          plane.next_maintenance_date,
                        ).toLocaleDateString()
                      : 'N/A'}
                  </div>
                  <div className="text-xs text-gray-500">
                    Last service:{' '}
                    {plane.last_service_date
                      ? new Date(plane.last_service_date).toLocaleDateString()
                      : 'N/A'}
                  </div>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {plane.status_tags ? (
                      plane.status_tags
                        .split(',')
                        .map((status: string, i: number) => {
                          const trimmed = status.trim().toLowerCase();
                          let color = 'bg-muted text-muted-foreground';
                          if (trimmed === 'operational')
                            color = 'bg-green-100 text-green-800';
                          else if (trimmed === 'grounded')
                            color = 'bg-red-100 text-red-800';
                          else if (trimmed === 'scheduled')
                            color = 'bg-blue-100 text-blue-800';
                          else if (
                            trimmed.includes('limited') ||
                            trimmed.includes('monitor')
                          )
                            color = 'bg-yellow-100 text-yellow-800';
                          return (
                            <span
                              key={i}
                              className={`px-2 py-0.5 text-xs rounded-full ${color}`}
                            >
                              {trimmed.charAt(0).toUpperCase() +
                                trimmed.slice(1)}
                            </span>
                          );
                        })
                    ) : (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
                        No Status
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      {/* MultimediaInput Modal */}
      <MultimediaInput
        isOpen={showMultimediaInput}
        onClose={() => setShowMultimediaInput(false)}
        onContentGenerated={(content) => {
          // TODO: handle the generated content (e.g., upload, display, etc.)
          console.log('Generated content:', content);
        }}
        initialMode={multimediaMode}
      />
    </div>
  );
};

export default MobileFleetspan;
