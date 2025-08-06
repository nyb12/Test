// components/Dashboard/ChatSidebar.tsx
import { ChevronRight } from 'lucide-react';
import { expertguidence, recentchat, search } from '../../components/svg';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';

interface ChatSidebarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedChatIndex: number;
  setSelectedChatIndex: (index: number) => void;
  contacts: any[];
  contactsLoading: boolean;
  contactsError: boolean;
  selectedAircraft: any;
  onAircraftSelect: (aircraft: any) => void;
}

export default function ChatSidebar({
  searchTerm,
  setSearchTerm,
  selectedChatIndex,
  setSelectedChatIndex,
  contacts,
  contactsLoading,
  contactsError,
  selectedAircraft,
  onAircraftSelect,
}: ChatSidebarProps) {
  // Filter contacts by search term
  const filteredContacts = contacts.filter((contact: any) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (contact.name && contact.name.toLowerCase().includes(searchLower)) ||
      (contact.email && contact.email.toLowerCase().includes(searchLower)) ||
      (contact.phone && contact.phone.toLowerCase().includes(searchLower))
    );
  });

  if (contactsLoading) {
    return <div className="p-4 text-gray-500">Loading contacts...</div>;
  }
  if (contactsError) {
    return <div className="p-4 text-red-500">Failed to load contacts.</div>;
  }
  if (!contacts || contacts.length === 0) {
    return <div className="p-4 text-gray-500">No contacts found.</div>;
  }

  return (
    <div className="bg-white rounded-2xl lg:rounded-l-2xl lg:rounded-r-none shadow p-3 sm:p-4 md:p-6 w-full md:w-1/2 lg:w-2/5 xl:w-1/3 flex-1 min-w-0">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 sm:w-7 sm:h-7 hidden md:block">
            <img src={recentchat} alt="recentchat" className="w-full h-full" />
          </div>
          <span className="text-xs sm:text-sm font-semibold text-gray-500">
            <span className="block md:hidden text-black">Messaging</span>
            <span className="hidden md:block">Contacts</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            className="text-xs text-gray-500 flex items-center gap-1 justify-end md:hidden"
            href="/chats"
          >
            Open messages
            <ChevronRight className="w-4 h-4" />
          </Link>
          <button className="hidden items-center flex-row gap-1 hover:bg-gray-100 rounded-md p-1 md:flex">
            <img
              src={expertguidence}
              alt="expertguidence"
              className="w-5 h-5 cursor-pointer"
            />
            <div className="flex items-center text-[#CF8E24] text-xs sm:text-sm ">
              Expert Guidence
            </div>
          </button>
        </div>
      </div>

      <div className="relative w-full mb-4">
        <img
          src={search}
          alt="search"
          className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
        />
        <input
          type="text"
          placeholder="Search people, messages, docs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-8 pr-2 sm:pl-9 sm:pr-3 py-2 border rounded-md text-xs sm:text-sm flex items-center gap-2"
        />
      </div>

      <div className="divide-y divide-gray-200 h-44 sm:h-44 overflow-y-auto custom-scrollbar">
        {filteredContacts.map((contact: any, index: number) => (
          <div
            key={contact.id || contact.email || contact.phone || index}
            className={`flex items-center py-2 sm:py-3 cursor-pointer px-2 rounded-md ${
              selectedChatIndex === index ? 'bg-gray-100' : ''
            }`}
            onClick={() => setSelectedChatIndex(index)}
            style={{ minWidth: 0 }}
          >
            {/* Avatar or Initials */}
            {contact.avatar ? (
              <img
                src={contact.avatar}
                alt={contact.name || contact.email || 'Contact'}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full mr-3 flex-shrink-0 object-cover"
              />
            ) : (
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full mr-3 flex-shrink-0 bg-gray-300 flex items-center justify-center text-xs sm:text-sm font-semibold text-white uppercase">
                {(() => {
                  const n =
                    contact.name || contact.email || contact.phone || '';
                  const parts = n.split(/\s|@/).filter(Boolean);
                  if (parts.length === 1)
                    return parts[0].slice(0, 2).toUpperCase();
                  return (parts[0][0] + (parts[1][0] || '')).toUpperCase();
                })()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-800 text-xs sm:text-sm truncate">
                {contact.name || contact.email || contact.phone || 'Contact'}
              </div>
              <div className="text-gray-500 text-[10px] sm:text-xs truncate">
                {contact.email || contact.phone || ''}
              </div>
            </div>
            {/* Optionally, show a time or status here if available */}
          </div>
        ))}
      </div>
    </div>
  );
}
