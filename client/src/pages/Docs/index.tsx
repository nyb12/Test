import React, { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  getFilteredRowModel,
  getPaginationRowModel,
  ColumnFiltersState,
} from '@tanstack/react-table';
import {
  FileText,
  FileVideo,
  FileImage,
  FileSpreadsheet,
  LayoutGrid,
  LayoutList,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

const docs = [
  {
    title: 'Landing Gear Pressure Drop Report - EN12345.pdf',
    date: 'Jan 13, 2025',
    location: 'Shared with AI',
  },
  {
    title: 'Cabin Smoke Event - Audio Transcript.docx',
    date: 'Jan 13, 2025',
    location: 'From Messaging',
  },
  {
    title: 'Video Inspection - APU Compartment - Oct 2024.mp4',
    date: 'Jan 13, 2025',
    location: 'Observation Upload',
  },
  {
    title: 'Hydraulic System Diagram - Fleet Overview.jpg',
    date: 'Jan 12, 2025',
    location: 'Shared with AI',
  },
  {
    title: 'EN78910 - Fuel Leak Observation Summary.jpg',
    date: 'Jan 12, 2025',
    location: 'From Messaging',
  },
  {
    title: 'Maintenance Checklist - Q3 Review.xlsx',
    date: 'Jan 12, 2025',
    location: 'Observation Upload',
  },
];

const badgeColor = (location: string) => {
  if (location === 'Shared with AI') return 'bg-[#F5F5F5] text-[#414651]';
  if (location === 'From Messaging') return 'bg-[#F5F5F5] text-[#414651]';
  if (location === 'Observation Upload') return 'bg-[#F5F5F5] text-[#414651]';
  return '';
};

const columnHelper = createColumnHelper<(typeof docs)[0]>();

const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return <FileText className="text-red-600 w-5 h-5" />;
    case 'doc':
    case 'docx':
      return <FileText className="text-blue-600 w-5 h-5" />;
    case 'mp4':
      return <FileVideo className="text-sky-600 w-5 h-5" />;
    case 'jpg':
    case 'jpeg':
    case 'png':
      return <FileImage className="text-green-600 w-5 h-5" />;
    case 'xlsx':
    case 'xls':
      return <FileSpreadsheet className="text-green-700 w-5 h-5" />;
    default:
      return <FileText className="text-gray-400 w-5 h-5" />;
  }
};

const columns = [
  columnHelper.accessor('title', {
    header: 'Document Title',
    enableColumnFilter: true,
    cell: (info) => {
      const filename = info.getValue();
      return (
        <div className="flex items-center gap-3">
          {getFileIcon(filename)}
          <span className="text-sm font-medium text-[#181D27]">{filename}</span>
        </div>
      );
    },
  }),
  columnHelper.accessor('date', {
    header: 'Date',
    enableColumnFilter: true,
    cell: (info) => (
      <span className="text-sm text-[#535862]">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('location', {
    header: 'Location',
    enableColumnFilter: true,
    cell: (info) => (
      <span
        className={`rounded-full px-2 py-1 text-xs font-medium ${badgeColor(
          info.getValue(),
        )}`}
      >
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.display({
    id: 'view',
    header: '',
    cell: () => (
      <div className="flex justify-end w-full">
        <button className="text-[#4E6FA8] font-semibold text-sm flex items-center gap-1">
          View
        </button>
      </div>
    ),
  }),
  columnHelper.display({
    id: 'share',
    header: '',
    cell: () => (
      <div className="flex justify-end w-full">
        <button className="text-[#4E6FA8] font-semibold text-sm flex items-center gap-1">
          Share
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g clip-path="url(#clip0_729_34177)">
              <path
                d="M10.8335 3.33301V6.66634C5.35432 7.52301 3.31682 12.323 2.50016 16.6663C2.46932 16.838 6.98682 11.698 10.8335 11.6663V14.9997L17.5002 9.16634L10.8335 3.33301Z"
                stroke="#4E6FA8"
                stroke-width="1.7"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </g>
            <defs>
              <clipPath id="clip0_729_34177">
                <rect width="20" height="20" fill="white" />
              </clipPath>
            </defs>
          </svg>
        </button>
      </div>
    ),
  }),
];

const Docs = () => {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const columnWidths = {
    title: '50%',
    date: '15%',
    location: '15%',
    view: '10%',
    share: '10%',
  };
  const table = useReactTable({
    data: docs,
    columns,
    state: {
      columnFilters,
      globalFilter,
    },
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, columnId, filterValue) => {
      return Object.values(row.original)
        .join(' ')
        .toLowerCase()
        .includes(filterValue.toLowerCase());
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <>
      <div className="flex flex-col items-center min-h-screen bg-[#E6EBF9]">
        <div className="w-full max-w-[1286px]  mx-auto mt-6 px-4 md:px-6 lg:px-0 ">
          {/* Top Header */}
          <div className="flex flex-col justify-start md:flex-row md:items-center md:justify-between gap-3 bg-inherit px-4">
            <h2 className="text-lg font-semibold text-[#101828]">
              All Documents
            </h2>
            {/* View Toggle + Upload */}
          </div>
          {/* Tab Buttons */}
          <div className="flex flex-col justify-start md:flex-row md:items-center md:justify-between gap-3 ">
            <Tabs defaultValue="my-docs" className="mb-4">
              <TabsList className="grid w-[30rem] grid-cols-4 mx-4 mt-4">
                <TabsTrigger value="my-docs">My Docs</TabsTrigger>
                <TabsTrigger value="shared">Shared with me</TabsTrigger>
                <TabsTrigger value="fleet">Fleet Docs</TabsTrigger>
                <TabsTrigger value="public">Public Docs</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-3 px-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-1 px-3 py-2 text-sm rounded-lg border ${
                    viewMode === 'grid'
                      ? 'bg-[#344054] text-white'
                      : 'bg-white text-[#344054] border-[#D0D5DD]'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-1 px-3 py-2 text-sm rounded-lg border ${
                    viewMode === 'list'
                      ? 'bg-[#344054] text-white'
                      : 'bg-white text-[#344054] border-[#D0D5DD]'
                  }`}
                >
                  <LayoutList className="w-4 h-4" />
                </button>
              </div>
              <button className="px-4 py-2 bg-[#344054] text-white rounded-lg text-sm font-medium">
                Upload Document
              </button>
            </div>
          </div>
          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 px-4">
            {/* Search Bar */}
            <input
              type="text"
              placeholder="Search for documents"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full sm:w-[320px] px-4 py-2 border border-[#D0D5DD] rounded-lg text-sm placeholder:text-[#98A2B3]"
            />
            {/* Right Filters */}
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {/* Date Range Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-2 px-4 py-2 border border-[#D0D5DD] rounded-lg text-sm text-[#344054] bg-white">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-4 h-4"
                    >
                      <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                      <path
                        fillRule="evenodd"
                        d="M1.5 9a9 9 0 1018 0 9 9 0 00-18 0zm12 5.293l-4-4A1 1 0 009 10v4a1 1 0 002 0v-2.707l4 4zM5.293 7L7 5.293a1 1 0 00-1.414 1.414L4 8.586V12a1 1 0 102 0V8.586l1.293-1.293a1 1 0 000-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Jan 6, 2025 – Jan 13, 2025
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="range"
                    selected={undefined}
                    onSelect={() => {}}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
              {/* Aircraft Filter */}
              <button className="px-4 py-2 border border-[#D0D5DD] rounded-lg text-sm text-[#344054] bg-white flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-4 h-4"
                >
                  <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                  <path
                    fillRule="evenodd"
                    d="M1.5 9a9 9 0 1018 0 9 9 0 00-18 0zm12 5.293l-4-4A1 1 0 009 10v4a1 1 0 002 0v-2.707l4 4zM5.293 7L7 5.293a1 1 0 00-1.414 1.414L4 8.586V12a1 1 0 102 0V8.586l1.293-1.293a1 1 0 000-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                Aircraft
              </button>
              {/* Type Filter */}
              <button className="px-4 py-2 border border-[#D0D5DD] rounded-lg text-sm text-[#344054] bg-white flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-4 h-4"
                >
                  <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                  <path
                    fillRule="evenodd"
                    d="M1.5 9a9 9 0 1018 0 9 9 0 00-18 0zm12 5.293l-4-4A1 1 0 009 10v4a1 1 0 002 0v-2.707l4 4zM5.293 7L7 5.293a1 1 0 00-1.414 1.414L4 8.586V12a1 1 0 102 0V8.586l1.293-1.293a1 1 0 000-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                Type
              </button>
            </div>
          </div>
        </div>
        {/* Top-right Pagination Controls */}
        <div className="flex justify-end items-center gap-4 px-4 max-w-[1286px] mx-auto mt-6">
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#D5D7DA] text-[#414651] text-sm disabled:opacity-50"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            ← Previous
          </button>
          <span className="text-sm text-[#414651]">
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </span>
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#D5D7DA] text-[#414651] text-sm disabled:opacity-50"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next →
          </button>
        </div>
        {/* Table Container */}
        {viewMode === 'list' ? (
          <div className="bg-white rounded-xl shadow-lg border border-[#E9EAEB] overflow-hidden w-full my-8">
            <div className="overflow-x-auto w-full">
              <div>
                {/* Table Header */}
                <div className="flex w-full">
                  {table.getHeaderGroups().map((headerGroup) =>
                    headerGroup.headers.map((header) => {
                      const colId = header.column
                        .id as keyof typeof columnWidths;
                      return (
                        <div
                          key={header.id}
                          className="flex flex-col justify-center gap-1 px-6 py-3 bg-white"
                          style={{ width: columnWidths[colId] }}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                        </div>
                      );
                    }),
                  )}
                </div>
                {/* Table Rows */}
                {table.getRowModel().rows.map((row) => (
                  <div
                    key={row.id}
                    className="flex w-full border-b border-[#E9EAEB]"
                    style={{
                      backgroundColor:
                        row.index % 2 === 0 ? '#F9FAFB' : 'white',
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <div
                        key={cell.id}
                        className="flex items-center px-6 py-4 text-sm"
                        style={{
                          width:
                            columnWidths[
                              cell.column.id as keyof typeof columnWidths
                            ],
                        }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </div>
                    ))}
                  </div>
                ))}
                {/* Pagination */}
                <div className="flex justify-between items-center px-6 py-4 border-t border-[#E9EAEB] bg-white">
                  <button
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#D5D7DA] text-[#414651] text-sm disabled:opacity-50"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    ← Previous
                  </button>
                  <span className="text-sm text-[#414651]">
                    Page {table.getState().pagination.pageIndex + 1} of{' '}
                    {table.getPageCount()}
                  </span>
                  <button
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#D5D7DA] text-[#414651] text-sm disabled:opacity-50"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    Next →
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 p-4 max-w-[1286px] mx-auto">
            {docs.map((doc, index) => (
              <div
                key={index}
                className="border border-gray-200 bg-white rounded-lg shadow-sm p-4 flex flex-col gap-2 hover:shadow-md transition"
              >
                <div className="h-28 bg-gray-100 rounded-md flex items-center justify-center">
                  {getFileIcon(doc.title)}
                </div>
                <div className="font-medium text-sm text-[#101828] line-clamp-2">
                  {doc.title}
                </div>
                <div className="text-xs text-[#667085]">
                  {doc.location}
                  <br />
                  {doc.date}
                </div>
                <div className="mt-auto flex gap-3">
                  <button className="text-sm text-[#4E6FA8] font-semibold">
                    View
                  </button>
                  <button className="text-sm text-[#4E6FA8] font-semibold">
                    Share
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default Docs;
