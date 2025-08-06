import { useQuery } from '@tanstack/react-query';
import { Eye, Search } from 'lucide-react';
import { useState } from 'react';

function AircraftList({
  filter,
  onAircraftSelect,
  displayMode = 'list',
  headerText,
}: {
  filter?: string;
  onAircraftSelect?: (aircraft: any) => void;
  displayMode?: 'list' | 'single';
  headerText?: string;
}) {
  const [hoveredAircraft, setHoveredAircraft] = useState<any>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [searchTerm, setSearchTerm] = useState('');

  const { data: aircraft = [] } = useQuery({
    queryKey: ['/api/aircraft'],
    enabled: true,
  });

  // Filter aircraft based on selected status, tail number, and search term
  const filteredAircraft = (aircraft as any[]).filter((plane: any) => {
    // First apply status/tail number filter
    let matchesFilter = true;
    if (filter && filter !== 'all') {
      // Check if filter is a tail number (specific aircraft)
      if (plane.tail_number === filter) {
        matchesFilter = true;
      } else {
        // Otherwise filter by status tags
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

    // Then apply search term filter
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
    <div className="relative">
      {/* Header text and search input on the same line */}
      <div className="flex justify-between items-center mb-4">
        {headerText && (
          <p className="text-sm text-muted-foreground">{headerText}</p>
        )}
        <div className="relative w-64 gap-5">
          {/* <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-6 w-6 pointer-events-none"
            aria-hidden="true"
          /> */}
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search aircraft..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            // className="input-enhanced w-full pl-14 pr-4 py-2 text-sm border border-red-500"
            className="pl-10 h-10  rounded-xl ring-2 ring-blue-500/20 border-blue-500 transition-all"
            aria-label="Search aircraft"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3 max-h-64 overflow-y-auto scrollbar-thin">
        {filteredAircraft.map((plane: any) => (
          <div
            key={plane.id}
            className={`card-enhanced hover:border-accent cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
              displayMode === 'list' ? 'p-3' : 'p-4'
            }`}
            onClick={() => onAircraftSelect?.(plane)}
          >
            {displayMode === 'list' ? (
              // Limited card for aircraft selection lists
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                    {plane.tail_number}
                  </p>
                  <p className="text-sm text-muted-foreground">{plane.model}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex flex-wrap gap-1">
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
                      <span className="px-2 py-1 text-xs rounded-full bg-muted text-muted-foreground">
                        No Status
                      </span>
                    )}
                  </div>
                  <button
                    className="btn-enhanced p-1 text-muted-foreground hover:text-primary hover:bg-accent rounded"
                    onMouseEnter={(e) => {
                      setHoveredAircraft(plane);
                      setMousePosition({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseLeave={() => setHoveredAircraft(null)}
                    onMouseMove={(e) => {
                      setMousePosition({ x: e.clientX, y: e.clientY });
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAircraftSelect?.(plane);
                    }}
                  >
                    <Eye size={16} />
                  </button>
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
                    <span className="text-muted-foreground">Flight Hours:</span>{' '}
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
        ))}
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
    </div>
  );
}

export default AircraftList;
