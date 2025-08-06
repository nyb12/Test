import { useQuery } from '@tanstack/react-query';
import {
  Camera,
  Eye,
  File,
  Info,
  Mic,
  Plane,
  Search,
  Video,
  X,
  ChevronDown,
  EyeIcon,
} from 'lucide-react';
import { airplane } from '@/components/svg';
import { useState, useRef, useEffect } from 'react';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import MultimediaInput from '@/components/MultimediaInput';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import MobileFleetspan from './mobileFleetspan';
type AircraftOptions = {
  statusOptions?: string[];
  typeOptions?: string[];
  manufacturerOptions?: string[];
};

const dropdownMenu = ({
  openMultimediaInput,
  handleUploadFile,
  menuRef,
}: {
  openMultimediaInput: (mode: 'photo' | 'video' | 'audio') => void;
  handleUploadFile: () => void;
  menuRef: React.RefObject<HTMLDivElement>;
}) => {
  return (
    <div
      ref={menuRef}
      className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-md shadow-lg z-10"
    >
      <ul className="py-1 text-sm text-gray-700">
        <li
          className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer justify-between"
          onClick={() => openMultimediaInput('photo')}
        >
          Take Photo
          <Camera className="w-4 h-4" />
        </li>
        <li
          className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer justify-between"
          onClick={() => openMultimediaInput('video')}
        >
          Record Video
          <Video className="w-4 h-4" />
        </li>
        <li
          className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer justify-between"
          onClick={() => openMultimediaInput('audio')}
        >
          Record Audio
          <Mic className="w-4 h-4" />
        </li>
        <li
          className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer justify-between"
          onClick={handleUploadFile}
        >
          Upload File
          <File className="w-4 h-4" />
        </li>
      </ul>
    </div>
  );
};

function DesktopFleetspan({
  filter,
  onAircraftSelect,
  displayMode = 'list',
  headerText,
  selectedAircraft,
  onViewInfo,
}: {
  filter?: string;
  onAircraftSelect?: (aircraft: any) => void;
  displayMode?: 'list' | 'single';
  headerText?: string;
  selectedAircraft?: any;
  onViewInfo?: (aircraft: any) => void;
}) {
  const [hoveredAircraft, setHoveredAircraft] = useState<any>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [showObservationMenu, setShowObservationMenu] = useState(false);
  // State for filter selects
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedManufacturer, setSelectedManufacturer] = useState('');
  const [isMultimediaOpen, setIsMultimediaOpen] = useState(false);
  const [multimediaMode, setMultimediaMode] = useState<
    'photo' | 'video' | 'audio' | undefined
  >(undefined);
  const [openModal, setOpenModal] = useState(false);
  const [aircraftById, setAircraftById] = useState<any>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (openModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [openModal]);

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

  const openMultimediaInput = (mode: 'photo' | 'video' | 'audio') => {
    setMultimediaMode(mode);
    setIsMultimediaOpen(true);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // For now, just close the menu or show a toast
    setShowObservationMenu(false);
    // TODO: Optionally open in MultimediaInput modal or process file
  };

  const { data: aircraft = [] } = useQuery({
    queryKey: ['/api/aircraft'],
    enabled: true,
  });

  // Filter aircraft based on selected status, type, manufacturer, tail number, and search term
  const filteredAircraft = (aircraft as any[]).filter((plane: any) => {
    let matchesFilter = true;
    if (filter && filter !== 'all') {
      if (plane.tail_number === filter) {
        matchesFilter = true;
      } else {
        if (!plane.status_tags) {
          matchesFilter = false;
        } else {
          const statuses = plane.status_tags
            .toLowerCase()
            .split(',')
            .map((s: string) => s.trim());
          matchesFilter = statuses.includes(filter.toLowerCase());
        }
      }
    }

    // Additional filters
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

    let matchesSearch = true;
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      matchesSearch =
        plane.tail_number?.toLowerCase().includes(search) ||
        plane.model?.toLowerCase().includes(search) ||
        plane.manufacturer?.toLowerCase().includes(search);
    }

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="relative bg-[#DAE0F2]  h-full flex flex-col">
      <div className="flex flex-wrap gap-2 items-end justify-start bg-gradient-to-r from-[#4D67A4] to-[#5BA5C7]  py-4 px-4">
        <div className="relative w-[36rem] gap-5">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search aircraft..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-9  rounded-sm ring-2 ring-blue-500/20 border-blue-500 transition-all"
            aria-label="Search aircraft"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-white font-medium">Status</label>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="h-9 w-40 bg-[#2E4373] text-white text-sm rounded-sm border-none">
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
            <SelectTrigger className="h-9 w-40 bg-[#2E4373] text-white text-sm rounded-md border-none">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {Array.from(
                new Set((aircraft as any[]).map((plane: any) => plane.model)),
              ).map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-white font-medium">Manufacturer</label>
          <Select
            value={selectedManufacturer}
            onValueChange={setSelectedManufacturer}
          >
            <SelectTrigger className="h-9 w-40 bg-[#2E4373] text-white text-sm rounded-md border-none">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {Array.from(
                new Set(
                  (aircraft as any[]).map((plane: any) => plane.manufacturer),
                ),
              ).map((manufacturer) => (
                <SelectItem key={manufacturer} value={manufacturer}>
                  {manufacturer}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(selectedStatus || selectedType || selectedManufacturer) && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <button className="h-9 px-4 text-sm text-white hover:bg-[#5BA5C7] rounded-full">
                  <X
                    className="w-4 h-4"
                    onClick={() => {
                      setSelectedStatus('');
                      setSelectedType('');
                      setSelectedManufacturer('');
                    }}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Clear Filters</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <div className="ml-0 md:ml-auto flex items-center">
          <button className="bg-white text-sm text-[#3b82f6] font-medium px-4 py-2 rounded-md shadow">
            Troubleshoot
          </button>
          {/* Make Observation dropdown */}
          <div className="relative inline-block ml-2">
            <button
              onClick={() => setShowObservationMenu((prev) => !prev)}
              className="ml-2 bg-[#0f172a] text-white text-sm font-medium px-4 py-2 rounded-md"
            >
              Make Observation
            </button>
            {showObservationMenu &&
              dropdownMenu({
                openMultimediaInput,
                handleUploadFile,
                menuRef,
              })}
          </div>
        </div>
      </div>
      <div className="px-4 sm:px-6 md:px-10 lg:px-16 mb-4">
        <div className="pt-3 rounded-b-xl flex justify-between items-center">
          <div className="text-sm sm:text-base font-medium text-foreground">
            Showing {filteredAircraft.length} results
          </div>
        </div>
      </div>
      {/* <hr className="border-t border-border mb-4" /> */}
      {/* Header text and search input on the same line */}
      <div className="flex justify-between items-center mb-4 pl-4 md:pl-16">
        {headerText && (
          <p className="text-sm text-muted-foreground">{headerText}</p>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 px-4 sm:px-6 md:px-10 lg:px-16 pt-3 pb-6">
          {filteredAircraft.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground col-span-full py-8">
              No aircraft found for selected filters.
            </div>
          ) : (
            (selectedAircraft
              ? filteredAircraft.filter(
                  (plane: any) => plane.id === selectedAircraft.id,
                )
              : filteredAircraft
            ).map((plane: any) => (
              <div
                key={plane.id}
                className={`card-enhanced rounded-xl bg-white shadow-md border border-gray-200 cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
                  displayMode === 'list'
                    ? 'p-4 sm:p-5 lg:p-6'
                    : 'p-4 sm:p-5 lg:p-6'
                } ${
                  selectedAircraft?.id === plane.id
                    ? 'ring-2 ring-blue-500 bg-blue-50'
                    : ''
                }`}
                // onClick={() => onAircraftSelect?.(plane)}
                onClick={() => onViewInfo?.(plane)}
              >
                {displayMode === 'list' ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gray-200 rounded text-[10px] flex items-center justify-center">
                          icon
                        </div>
                      </div>
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-2 flex-row">
                        <Plane className="w-4 h-4 text-gray-500" />{' '}
                        {plane.tail_number}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground flex flex-col gap-1">
                      <div className="flex flex-col">
                        <p className="text-sm font-semibold text-foreground">
                          {plane.model}
                        </p>
                        {/* <p className="text-xs text-muted-foreground">
                          {plane.manufacturer}
                        </p> */}
                      </div>
                      <p>
                        Scheduled service:{' '}
                        {new Date(
                          plane.next_maintenance_date,
                        ).toLocaleDateString()}
                      </p>
                      <p>
                        Last service:{' '}
                        {plane.last_service_date
                          ? new Date(
                              plane.last_service_date,
                            ).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </div>
                    <hr className="my-2 border-t border-border" />
                    <div className="flex justify-between items-center">
                      <div className="flex gap-1 flex-wrap">
                        {plane.status_tags ? (
                          plane.status_tags
                            .split(',')
                            .map((status: string, index: number) => {
                              const trimmedStatus = status.trim();
                              return (
                                <span
                                  key={index}
                                  className={`px-2 py-1 text-xs rounded-full ${
                                    trimmedStatus === 'operational'
                                      ? 'bg-green-100 text-green-800'
                                      : trimmedStatus === 'grounded'
                                      ? 'bg-red-100 text-red-800'
                                      : trimmedStatus === 'scheduled'
                                      ? 'bg-blue-100 text-blue-800'
                                      : trimmedStatus.includes('limited') ||
                                        trimmedStatus.includes('monitor')
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-muted text-muted-foreground'
                                  }`}
                                >
                                  {trimmedStatus.charAt(0).toUpperCase() +
                                    trimmedStatus.slice(1)}
                                </span>
                              );
                            })
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-muted text-muted-foreground">
                            No Status
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Broader detailed card for single aircraft view
                  <>
                    {/* Header with tail number and model */}
                    <div className="mb-3">
                      <h3 className="text-lg font-semibold text-foreground">
                        {plane.tail_number} - {plane.model}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {plane.manufacturer}
                      </p>
                    </div>

                    {/* Status tags */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {plane.status_tags ? (
                        plane.status_tags
                          .split(',')
                          .map((status: string, index: number) => {
                            const trimmedStatus = status.trim();
                            return (
                              <span
                                key={index}
                                className={`px-3 py-1 text-sm rounded-full ${
                                  trimmedStatus === 'operational'
                                    ? 'status-operational'
                                    : trimmedStatus === 'grounded'
                                    ? 'status-grounded'
                                    : trimmedStatus === 'scheduled'
                                    ? 'status-scheduled'
                                    : trimmedStatus.includes('limited') ||
                                      trimmedStatus.includes('monitor')
                                    ? 'status-monitor'
                                    : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                {trimmedStatus.charAt(0).toUpperCase() +
                                  trimmedStatus.slice(1)}
                              </span>
                            );
                          })
                      ) : (
                        <span className="px-3 py-1 text-sm rounded-full bg-muted text-muted-foreground">
                          No Status
                        </span>
                      )}
                    </div>

                    {/* Aircraft details */}
                    <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Year:</span>{' '}
                        <span className="font-medium text-foreground">
                          {plane.year_manufactured || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Flight Hours:
                        </span>{' '}
                        <span className="font-medium text-foreground">
                          {plane.flight_hours || 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Limitation details */}
                    {plane.limitation_details && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                        <h4 className="font-medium text-yellow-800 mb-1">
                          Limited/Monitor Details:
                        </h4>
                        <p className="text-sm text-yellow-700">
                          {plane.limitation_details}
                        </p>
                        {plane.regulatory_reference && (
                          <p className="text-xs text-yellow-600 mt-1">
                            Ref: {plane.regulatory_reference}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Grounding details */}
                    {plane.grounding_reason && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                        <h4 className="font-medium text-red-800 mb-1">
                          Grounding Details:
                        </h4>
                        <p className="text-sm text-red-700">
                          {plane.grounding_reason}
                        </p>
                        {plane.regulatory_reference && (
                          <p className="text-xs text-red-600 mt-1">
                            Ref: {plane.regulatory_reference}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Scheduled service */}
                    {plane.next_maintenance_date && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                        <h4 className="font-medium text-blue-800 mb-1">
                          Scheduled Service:
                        </h4>
                        <p className="text-sm text-blue-700">
                          {plane.status_details || 'Maintenance scheduled'}
                        </p>
                        <p className="text-xs text-blue-600">
                          Date:{' '}
                          {new Date(
                            plane.next_maintenance_date,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-2">
                      <button
                        className="btn-enhanced flex-1 px-3 py-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => onAircraftSelect?.(plane)}
                      >
                        Select Aircraft
                      </button>
                      <button
                        className="btn-enhanced px-3 py-2 text-sm border border-border hover:bg-accent"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle view details action
                        }}
                      >
                        View Details
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Enhanced tooltip for aircraft details */}
      {hoveredAircraft && (
        <div
          className="fixed z-50 bg-popover border border-border rounded-lg p-3 shadow-enhanced-lg max-w-xs"
          style={{
            left: mousePosition.x + 10,
            top: mousePosition.y - 10,
          }}
        >
          <h4 className="font-medium text-popover-foreground mb-1">
            {hoveredAircraft.tail_number}
          </h4>
          <p className="text-sm text-muted-foreground mb-2">
            {hoveredAircraft.model} - {hoveredAircraft.manufacturer}
          </p>
          <div className="text-xs text-muted-foreground">
            <p>Year: {hoveredAircraft.year_manufactured || 'N/A'}</p>
            <p>Flight Hours: {hoveredAircraft.flight_hours || 'N/A'}</p>
            {hoveredAircraft.status_tags && (
              <p>Status: {hoveredAircraft.status_tags}</p>
            )}
          </div>
        </div>
      )}
      <MultimediaInput
        isOpen={isMultimediaOpen}
        onClose={() => setIsMultimediaOpen(false)}
        initialMode={multimediaMode}
        onContentGenerated={() => setIsMultimediaOpen(false)}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Drawer */}
      {openModal && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black bg-opacity-30"
            onClick={() => setOpenModal(false)}
          />

          <div className="relative bg-white w-[420px] h-full shadow-lg p-6 animate-slide-in-right translate-x-10 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="flex flex-row items-center gap-2 text-lg font-bold">
                <Info className="w-5 h-5 text-blue-500" /> FleetSpan
              </h2>
              <button
                className="pr-6 hover:bg-gray-100 rounded-full transition-colors"
                onClick={() => setOpenModal(false)}
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            {aircraftById ? (
              <div className="space-y-4">
                <div>
                  <div className="flex flex-row items-center gap-4 w-full">
                    <h3 className="text-lg font-bold truncate overflow-hidden whitespace-nowrap">
                      {aircraftById.model} - {aircraftById.id}
                    </h3>
                    <div className="w-6 h-6 bg-gray-200 rounded text-[10px] flex items-center justify-center ml-2">
                      icon
                    </div>
                  </div>
                  <p className="flex flex-row gap-2 items-center text-sm text-gray-500">
                    <Plane className="w-4 h-4 text-gray-500" />{' '}
                    {aircraftById.tail_number}
                  </p>
                </div>

                <div className="flex gap-2 flex-wrap ">
                  {aircraftById.status_tags
                    ?.split(',')
                    .map((tag: string, i: number) => {
                      const trimmed = tag.trim();
                      return (
                        <span
                          key={i}
                          className={`px-2 py-1 text-xs rounded-full ${
                            trimmed === 'operational'
                              ? 'bg-green-100 text-green-800'
                              : trimmed === 'grounded'
                              ? 'bg-red-100 text-red-800'
                              : trimmed === 'scheduled'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {trimmed.charAt(0).toUpperCase() + trimmed.slice(1)}
                        </span>
                      );
                    })}
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    Next scheduled service:
                  </p>
                  <p className="text-sm font-medium">
                    {new Date(
                      aircraftById.next_maintenance_date,
                    ).toLocaleDateString()}
                  </p>
                </div>

                <div className="border-t border-gray-200 pt-4 space-y-6 h-[35rem] overflow-y-auto text-sm text-gray-700">
                  <Accordion type="multiple" className="space-y-4">
                    <AccordionItem value="summary">
                      <AccordionTrigger className="w-full flex justify-between items-center">
                        Summary
                        {/* <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-aria-expanded:rotate-180 mr-5" /> */}
                      </AccordionTrigger>
                      <AccordionContent className="flex flex-col gap-4 text-balance">
                        <p>
                          Last Service Date: <strong>03 Jul 2025</strong>
                        </p>
                        <p>
                          Total Flights (Last 30 Days): <strong>12</strong>
                        </p>
                        <p>
                          Last Known Issue: <strong>Brake actuator wear</strong>
                        </p>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="repairs">
                      <AccordionTrigger className="w-full flex justify-between items-center">
                        Service Repairs & Fixes
                        {/* <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-aria-expanded:rotate-180 mr-5" /> */}
                      </AccordionTrigger>
                      <AccordionContent className="flex flex-col gap-4 text-balance">
                        <ul className="divide-y divide-gray-100">
                          <li className="flex justify-between py-1">
                            <span>Brake system replaced</span>
                            <span className="pr-6 text-gray-500">
                              14 Jul 2025
                            </span>
                          </li>
                          <li className="flex justify-between py-1">
                            <span>Avionics module recalibrated</span>
                            <span className="pr-6 text-gray-500">
                              12 Jul 2025
                            </span>
                          </li>
                          <li className="flex justify-between py-1">
                            <span>Landing gear sensor replaced</span>
                            <span className="pr-6 text-gray-500">
                              9 May 2025
                            </span>
                          </li>
                          <li className="flex justify-between py-1">
                            <span>Hydraulic system pressure calibrated</span>
                            <span className="pr-6 text-gray-500">
                              6 Mar 2025
                            </span>
                          </li>
                          <li className="flex justify-between py-1">
                            <span>Avionics software update completed</span>
                            <span className="pr-6 text-gray-500">
                              27 Dec 2024
                            </span>
                          </li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="history">
                      <AccordionTrigger className="w-full flex justify-between items-center">
                        Ride History
                        {/* <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-aria-expanded:rotate-180 mr-5" /> */}
                      </AccordionTrigger>
                      <AccordionContent className="flex flex-col gap-4 text-balance max-w-full">
                        <ul className="space-y-6">
                          <li className="flex items-center  min-w-0">
                            {/* Origin */}
                            <div className="flex flex-col items-start w-20 flex-none">
                              <span className="font-bold text-gray-700 text-lg">
                                MUM
                              </span>
                              <span className="text-xs text-gray-400">
                                Mumbai
                              </span>
                            </div>
                            {/* Center: plane and time */}
                            <div className="flex flex-col items-center w-44 overflow-hidden flex-shrink-0 flex-grow-0">
                              {/* Airplane icon above the line */}
                              <img
                                src={airplane}
                                alt="airplane"
                                className="w-6 h-6"
                              />
                              {/* Dotted line with dots at both ends */}
                              <div className="flex items-center w-full">
                                <span className="w-2 h-2 bg-black rounded-full mr-1 flex-none" />
                                <span className="flex-1 border-t border-dashed border-gray-300 mx-1" />
                                <span className="w-2 h-2 border border-gray-400 rounded-full ml-1 flex-none" />
                              </div>
                              {/* Time below the line */}
                              <span className="text-xs text-gray-400 mt-2">
                                6:45 PM, 14 Jul 2025
                              </span>
                            </div>
                            {/* Destination */}
                            <div className="flex flex-col items-end w-20 flex-none">
                              <span className="font-bold text-gray-700 text-lg">
                                GOA
                              </span>
                              <span className="text-xs text-gray-400">Goa</span>
                            </div>
                          </li>
                          <li className="flex items-center  min-w-0">
                            <div className="flex flex-col items-start w-20 flex-none">
                              <span className="font-bold text-gray-700 text-lg">
                                HYD
                              </span>
                              <span className="text-xs text-gray-400">
                                Hyderabad
                              </span>
                            </div>
                            <div className="flex flex-col items-center w-44 overflow-hidden flex-shrink-0 flex-grow-0">
                              <img
                                src={airplane}
                                alt="airplane"
                                className="w-6 h-6"
                              />
                              <div className="flex items-center w-full">
                                <span className="w-2 h-2 bg-black rounded-full mr-1 flex-none" />
                                <span className="flex-1 border-t border-dashed border-gray-300 mx-1" />
                                <span className="w-2 h-2 border border-gray-400 rounded-full ml-1 flex-none" />
                              </div>
                              <span className="text-xs text-gray-400 mt-2">
                                11:30 AM, 14 Jul 2025
                              </span>
                            </div>
                            <div className="flex flex-col items-end w-20 flex-none">
                              <span className="font-bold text-gray-700 text-lg">
                                MUM
                              </span>
                              <span className="text-xs text-gray-400">
                                Mumbai
                              </span>
                            </div>
                          </li>
                          <li className="flex items-center  min-w-0">
                            <div className="flex flex-col items-start w-20 flex-none">
                              <span className="font-bold text-gray-700 text-lg">
                                KOL
                              </span>
                              <span className="text-xs text-gray-400">
                                Kolkata
                              </span>
                            </div>
                            <div className="flex flex-col items-center w-44 overflow-hidden flex-shrink-0 flex-grow-0">
                              <img
                                src={airplane}
                                alt="airplane"
                                className="w-6 h-6"
                              />
                              <div className="flex items-center w-full">
                                <span className="w-2 h-2 bg-black rounded-full mr-1 flex-none" />
                                <span className="flex-1 border-t border-dashed border-gray-300 mx-1" />
                                <span className="w-2 h-2 border border-gray-400 rounded-full ml-1 flex-none" />
                              </div>
                              <span className="text-xs text-gray-400 mt-2">
                                5:30 AM, 14 Jul 2025
                              </span>
                            </div>
                            <div className="flex flex-col items-end w-20 flex-none">
                              <span className="font-bold text-gray-700 text-lg">
                                HYD
                              </span>
                              <span className="text-xs text-gray-400">
                                Hyderabad
                              </span>
                            </div>
                          </li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="observations">
                      <AccordionTrigger className="w-full flex justify-between items-center">
                        Observations Logged
                        {/* <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-aria-expanded:rotate-180 mr-5" /> */}
                      </AccordionTrigger>
                      <AccordionContent className="flex flex-col gap-4 text-balance">
                        <div className="space-y-4 text-sm">
                          <div>
                            <p className="font-medium text-gray-800">
                              Joshua Lee{' '}
                              <span className="pr-6 text-xs text-gray-500">
                                • 40m ago
                              </span>
                            </p>
                            <p className="break-words whitespace-normal max-w-xs text-sm text-gray-700">
                              Uploaded a video of landing gear noise
                            </p>
                            <a href="#" className="text-blue-600 font-medium">
                              Play Video
                            </a>
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">
                              Eric Ishida{' '}
                              <span className="pr-6 text-xs text-gray-500">
                                • July 10, 9:10 AM
                              </span>
                            </p>
                            <p className="break-words whitespace-normal max-w-xs text-sm text-gray-700">
                              Uploaded a photo of hydraulic fluid leak during
                              preflight inspection
                            </p>
                            <a href="#" className="text-blue-600 font-medium">
                              View Photo
                            </a>
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">
                              Emily James{' '}
                              <span className="pr-6 text-xs text-gray-500">
                                • Jun 22, 11:40 AM
                              </span>
                            </p>
                            <p className="break-words whitespace-normal max-w-xs text-sm text-gray-700">
                              Uploaded a video of cabin temperature fluctuation
                              noted during climb phase
                            </p>
                            <a href="#" className="text-blue-600 font-medium">
                              Play Video
                            </a>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                  <div className="ml-auto flex items-center">
                    <button className="bg-white text-sm text-[#3b82f6] font-medium px-4 py-2 rounded-md shadow">
                      Troubleshoot
                    </button>
                    {/* Make Observation dropdown */}
                    <div className="relative inline-block mr-2">
                      <button
                        onClick={() => setShowObservationMenu((prev) => !prev)}
                        className="ml-2 bg-[#0f172a] flex flex-row items-center gap-2 text-white text-sm font-medium px-4 py-2 rounded-md"
                      >
                        <EyeIcon className="w-4 h-4 text-white" />
                        Make Observation
                      </button>
                      {showObservationMenu &&
                        dropdownMenu({
                          openMultimediaInput,
                          handleUploadFile,
                          menuRef,
                        })}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No data available.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FleetspanWrapper(props: any) {
  const isMobile = useMediaQuery('(max-width: 640px)');
  const [openModal, setOpenModal] = useState(false);
  const [aircraftById, setAircraftById] = useState<any>(null);
  const [showObservationMenu, setShowObservationMenu] = useState(false);
  const [isMultimediaOpen, setIsMultimediaOpen] = useState(false);
  const [multimediaMode, setMultimediaMode] = useState<
    'photo' | 'video' | 'audio' | undefined
  >(undefined);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handler to fetch aircraft by ID and open drawer
  const handleViewInfo = async (aircraft: any) => {
    try {
      const response = await fetch(`/api/aircraft/${aircraft.id}`);
      const data = await response.json();
      setAircraftById(data);
      setOpenModal(true);
    } catch (error) {
      console.error('Failed to fetch aircraft by ID', error);
    }
  };

  // Multimedia handlers
  const openMultimediaInput = (mode: 'photo' | 'video' | 'audio') => {
    setMultimediaMode(mode);
    setIsMultimediaOpen(true);
  };

  const handleUploadFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setShowObservationMenu(false);
  };

  return (
    <>
      {isMobile ? (
        <MobileFleetspan onViewInfo={handleViewInfo} />
      ) : (
        <DesktopFleetspan {...props} onViewInfo={handleViewInfo} />
      )}
      {/* Drawer rendering here, using openModal, setOpenModal, aircraftById */}
      {openModal && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black bg-opacity-30"
            onClick={() => setOpenModal(false)}
          />
          <div className="relative bg-white w-[420px] h-full shadow-lg p-6 animate-slide-in-right translate-x-10 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="flex flex-row items-center gap-2 text-lg font-bold">
                <Info className="w-5 h-5 text-blue-500" /> FleetSpan
              </h2>
              <button
                className="pr-6 hover:bg-gray-100 rounded-full transition-colors"
                onClick={() => setOpenModal(false)}
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            {aircraftById ? (
              <div className="space-y-4">
                <div>
                  <div className="flex flex-row items-center gap-4 w-full">
                    <h3 className="text-lg font-bold truncate overflow-hidden whitespace-nowrap">
                      {aircraftById.model} - {aircraftById.id}
                    </h3>
                    <div className="w-6 h-6 bg-gray-200 rounded text-[10px] flex items-center justify-center ml-2">
                      icon
                    </div>
                  </div>
                  <p className="flex flex-row gap-2 items-center text-sm text-gray-500">
                    <Plane className="w-4 h-4 text-gray-500" />{' '}
                    {aircraftById.tail_number}
                  </p>
                </div>

                <div className="flex gap-2 flex-wrap ">
                  {aircraftById.status_tags
                    ?.split(',')
                    .map((tag: string, i: number) => {
                      const trimmed = tag.trim();
                      return (
                        <span
                          key={i}
                          className={`px-2 py-1 text-xs rounded-full ${
                            trimmed === 'operational'
                              ? 'bg-green-100 text-green-800'
                              : trimmed === 'grounded'
                              ? 'bg-red-100 text-red-800'
                              : trimmed === 'scheduled'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {trimmed.charAt(0).toUpperCase() + trimmed.slice(1)}
                        </span>
                      );
                    })}
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    Next scheduled service:
                  </p>
                  <p className="text-sm font-medium">
                    {new Date(
                      aircraftById.next_maintenance_date,
                    ).toLocaleDateString()}
                  </p>
                </div>

                <div className="border-t border-gray-200 pt-4 space-y-6 h-[35rem] overflow-y-auto text-sm text-gray-700">
                  <Accordion type="multiple" className="space-y-4">
                    <AccordionItem value="summary">
                      <AccordionTrigger className="w-full flex justify-between items-center">
                        Summary
                        {/* <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-aria-expanded:rotate-180 mr-5" /> */}
                      </AccordionTrigger>
                      <AccordionContent className="flex flex-col gap-4 text-balance">
                        <p>
                          Last Service Date: <strong>03 Jul 2025</strong>
                        </p>
                        <p>
                          Total Flights (Last 30 Days): <strong>12</strong>
                        </p>
                        <p>
                          Last Known Issue: <strong>Brake actuator wear</strong>
                        </p>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="repairs">
                      <AccordionTrigger className="w-full flex justify-between items-center">
                        Service Repairs & Fixes
                        {/* <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-aria-expanded:rotate-180 mr-5" /> */}
                      </AccordionTrigger>
                      <AccordionContent className="flex flex-col gap-4 text-balance">
                        <ul className="divide-y divide-gray-100">
                          <li className="flex justify-between py-1">
                            <span>Brake system replaced</span>
                            <span className="pr-6 text-gray-500">
                              14 Jul 2025
                            </span>
                          </li>
                          <li className="flex justify-between py-1">
                            <span>Avionics module recalibrated</span>
                            <span className="pr-6 text-gray-500">
                              12 Jul 2025
                            </span>
                          </li>
                          <li className="flex justify-between py-1">
                            <span>Landing gear sensor replaced</span>
                            <span className="pr-6 text-gray-500">
                              9 May 2025
                            </span>
                          </li>
                          <li className="flex justify-between py-1">
                            <span>Hydraulic system pressure calibrated</span>
                            <span className="pr-6 text-gray-500">
                              6 Mar 2025
                            </span>
                          </li>
                          <li className="flex justify-between py-1">
                            <span>Avionics software update completed</span>
                            <span className="pr-6 text-gray-500">
                              27 Dec 2024
                            </span>
                          </li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="history">
                      <AccordionTrigger className="w-full flex justify-between items-center">
                        Ride History
                        {/* <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-aria-expanded:rotate-180 mr-5" /> */}
                      </AccordionTrigger>
                      <AccordionContent className="flex flex-col gap-4 text-balance max-w-full">
                        <ul className="space-y-6">
                          <li className="flex items-center  min-w-0">
                            {/* Origin */}
                            <div className="flex flex-col items-start w-20 flex-none">
                              <span className="font-bold text-gray-700 text-lg">
                                MUM
                              </span>
                              <span className="text-xs text-gray-400">
                                Mumbai
                              </span>
                            </div>
                            {/* Center: plane and time */}
                            <div className="flex flex-col items-center w-44 overflow-hidden flex-shrink-0 flex-grow-0">
                              {/* Airplane icon above the line */}
                              <img
                                src={airplane}
                                alt="airplane"
                                className="w-6 h-6"
                              />
                              {/* Dotted line with dots at both ends */}
                              <div className="flex items-center w-full">
                                <span className="w-2 h-2 bg-black rounded-full mr-1 flex-none" />
                                <span className="flex-1 border-t border-dashed border-gray-300 mx-1" />
                                <span className="w-2 h-2 border border-gray-400 rounded-full ml-1 flex-none" />
                              </div>
                              {/* Time below the line */}
                              <span className="text-xs text-gray-400 mt-2">
                                6:45 PM, 14 Jul 2025
                              </span>
                            </div>
                            {/* Destination */}
                            <div className="flex flex-col items-end w-20 flex-none">
                              <span className="font-bold text-gray-700 text-lg">
                                GOA
                              </span>
                              <span className="text-xs text-gray-400">Goa</span>
                            </div>
                          </li>
                          <li className="flex items-center  min-w-0">
                            <div className="flex flex-col items-start w-20 flex-none">
                              <span className="font-bold text-gray-700 text-lg">
                                HYD
                              </span>
                              <span className="text-xs text-gray-400">
                                Hyderabad
                              </span>
                            </div>
                            <div className="flex flex-col items-center w-44 overflow-hidden flex-shrink-0 flex-grow-0">
                              <img
                                src={airplane}
                                alt="airplane"
                                className="w-6 h-6"
                              />
                              <div className="flex items-center w-full">
                                <span className="w-2 h-2 bg-black rounded-full mr-1 flex-none" />
                                <span className="flex-1 border-t border-dashed border-gray-300 mx-1" />
                                <span className="w-2 h-2 border border-gray-400 rounded-full ml-1 flex-none" />
                              </div>
                              <span className="text-xs text-gray-400 mt-2">
                                11:30 AM, 14 Jul 2025
                              </span>
                            </div>
                            <div className="flex flex-col items-end w-20 flex-none">
                              <span className="font-bold text-gray-700 text-lg">
                                MUM
                              </span>
                              <span className="text-xs text-gray-400">
                                Mumbai
                              </span>
                            </div>
                          </li>
                          <li className="flex items-center  min-w-0">
                            <div className="flex flex-col items-start w-20 flex-none">
                              <span className="font-bold text-gray-700 text-lg">
                                KOL
                              </span>
                              <span className="text-xs text-gray-400">
                                Kolkata
                              </span>
                            </div>
                            <div className="flex flex-col items-center w-44 overflow-hidden flex-shrink-0 flex-grow-0">
                              <img
                                src={airplane}
                                alt="airplane"
                                className="w-6 h-6"
                              />
                              <div className="flex items-center w-full">
                                <span className="w-2 h-2 bg-black rounded-full mr-1 flex-none" />
                                <span className="flex-1 border-t border-dashed border-gray-300 mx-1" />
                                <span className="w-2 h-2 border border-gray-400 rounded-full ml-1 flex-none" />
                              </div>
                              <span className="text-xs text-gray-400 mt-2">
                                5:30 AM, 14 Jul 2025
                              </span>
                            </div>
                            <div className="flex flex-col items-end w-20 flex-none">
                              <span className="font-bold text-gray-700 text-lg">
                                HYD
                              </span>
                              <span className="text-xs text-gray-400">
                                Hyderabad
                              </span>
                            </div>
                          </li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="observations">
                      <AccordionTrigger className="w-full flex justify-between items-center">
                        Observations Logged
                        {/* <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-aria-expanded:rotate-180 mr-5" /> */}
                      </AccordionTrigger>
                      <AccordionContent className="flex flex-col gap-4 text-balance">
                        <div className="space-y-4 text-sm">
                          <div>
                            <p className="font-medium text-gray-800">
                              Joshua Lee{' '}
                              <span className="pr-6 text-xs text-gray-500">
                                • 40m ago
                              </span>
                            </p>
                            <p className="break-words whitespace-normal max-w-xs text-sm text-gray-700">
                              Uploaded a video of landing gear noise
                            </p>
                            <a href="#" className="text-blue-600 font-medium">
                              Play Video
                            </a>
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">
                              Eric Ishida{' '}
                              <span className="pr-6 text-xs text-gray-500">
                                • July 10, 9:10 AM
                              </span>
                            </p>
                            <p className="break-words whitespace-normal max-w-xs text-sm text-gray-700">
                              Uploaded a photo of hydraulic fluid leak during
                              preflight inspection
                            </p>
                            <a href="#" className="text-blue-600 font-medium">
                              View Photo
                            </a>
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">
                              Emily James{' '}
                              <span className="pr-6 text-xs text-gray-500">
                                • Jun 22, 11:40 AM
                              </span>
                            </p>
                            <p className="break-words whitespace-normal max-w-xs text-sm text-gray-700">
                              Uploaded a video of cabin temperature fluctuation
                              noted during climb phase
                            </p>
                            <a href="#" className="text-blue-600 font-medium">
                              Play Video
                            </a>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                  <div className="ml-auto flex items-center">
                    <button className="bg-white text-sm text-[#3b82f6] font-medium px-4 py-2 rounded-md shadow">
                      Troubleshoot
                    </button>
                    {/* Make Observation dropdown */}
                    <div className="relative inline-block mr-2">
                      <button
                        onClick={() => setShowObservationMenu((prev) => !prev)}
                        className="ml-2 bg-[#0f172a] flex flex-row items-center gap-2 text-white text-sm font-medium px-4 py-2 rounded-md"
                      >
                        <EyeIcon className="w-4 h-4 text-white" />
                        Make Observation
                      </button>
                      {showObservationMenu &&
                        dropdownMenu({
                          openMultimediaInput,
                          handleUploadFile,
                          menuRef,
                        })}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No data available.</p>
            )}
          </div>
        </div>
      )}
      <MultimediaInput
        isOpen={isMultimediaOpen}
        onClose={() => setIsMultimediaOpen(false)}
        initialMode={multimediaMode}
        onContentGenerated={() => setIsMultimediaOpen(false)}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </>
  );
}
