// ChatSidebar.tsx
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { search } from '../../components/svg';
import { useAuth } from '@/hooks/use-auth';
import { X } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  contactId: string;
  messageType: 'DirectUser' | 'Group';
  groupId?: string;
  groupName?: string;
}

interface GroupMember {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface GroupInfo {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  creatorName: string;
  createdAt: string;
  isActive: boolean;
  memberCount: number;
  members: GroupMember[];
  data: {
    id: string;
    name: string;
    description: string;
  };
}

interface Props {
  activeTab: 'individual' | 'groups';
  setActiveTab: (tab: 'individual' | 'groups') => void;
  selectedChat: string | null;
  setSelectedChat: (name: string) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (value: boolean) => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedChatIndex?: number;
  setSelectedChatIndex?: (index: number) => void;
}

export default function ChatSidebar({
  activeTab,
  setActiveTab,
  selectedChat,
  setSelectedChat,
  isSidebarOpen,
  setIsSidebarOpen,
  searchTerm,
  setSearchTerm,
  selectedChatIndex = 0,
  setSelectedChatIndex,
}: Props) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [participantNames, setParticipantNames] = useState<Map<string, string>>(
    new Map(),
  );

  // Fetch contacts
  const {
    data: contacts = [],
    isLoading: contactsLoading,
    isError: contactsError,
  } = useQuery({
    queryKey: ['/api/contacts'],
    queryFn: async () => {
      const res = await fetch('/api/contacts');
      if (!res.ok) throw new Error('Failed to fetch contacts');
      return res.json();
    },
  });

  // Fetch all contacts for user info
  const { data: allContacts = [] } = useQuery({
    queryKey: ['/api/contacts/all'],
    queryFn: async () => {
      const res = await fetch('/api/contacts/all');
      if (!res.ok) throw new Error('Failed to fetch all contacts');
      return res.json();
    },
  });

  // Fetch user groups
  const { data: userGroups = [] } = useQuery({
    queryKey: ['user-groups', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch('/api/user-groups/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          pageNumber: 1,
          pageSize: 100,
        }),
      });
      if (!res.ok) throw new Error('Failed to fetch user groups');
      const result = await res.json();
      return result?.data?.data?.items ?? [];
    },
    enabled: !!user?.id,
  });

  // Fetch group details for each group
  const fetchGroupInfo = async (groupId: string, userId: string) => {
    try {
      const res = await fetch(`/api/UserGroups/${groupId}?userId=${userId}`);
      const result = await res.json();
      if (result.success) return result.data;
    } catch {}
    return null;
  };

  // Initialize participant names and groups
  useEffect(() => {
    const initializeData = async () => {
      if (!user?.id) return;

      // Build participant names map from all contacts
      const namesMap = new Map<string, string>();
      allContacts.forEach((contact: any) => {
        const displayName = `${contact.contactFirstName || ''} ${
          contact.contactLastName || ''
        }`.trim();
        if (displayName) {
          namesMap.set(contact.contactId, displayName);
        }
      });
      setParticipantNames(namesMap);

      // Fetch group details for each user group
      const groupDetails = await Promise.all(
        userGroups.map(async (group: any) => {
          const details = await fetchGroupInfo(group.id, user.id);
          return details;
        }),
      );

      const validGroups = groupDetails.filter(Boolean);
      setGroups(validGroups);
    };

    if (userGroups.length > 0) {
      initializeData();
    }
  }, [user?.id, allContacts.length, userGroups.length]);

  // Separate individual contacts and group contacts
  const individualContacts = contacts.filter(
    (contact: Contact) =>
      contact.messageType === 'DirectUser' || !contact.messageType,
  );

  const groupContacts = contacts.filter(
    (contact: Contact) => contact.messageType === 'Group',
  );

  // Filter contacts by search term
  const filteredIndividualContacts = individualContacts.filter(
    (contact: Contact) =>
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.phone?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredGroupContacts = groupContacts.filter(
    (contact: Contact) =>
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.groupName?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Handle contact selection
  const handleContactSelect = (contact: Contact, index: number) => {
    setSelectedChat(contact.name);
    if (setSelectedChatIndex) {
      setSelectedChatIndex(index);
    }
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  // Get display name for contact
  const getDisplayName = (contact: Contact) => {
    if (contact.messageType === 'Group') {
      return contact.groupName || contact.name;
    }
    return contact.name;
  };

  // Get initials for avatar
  const getInitials = (contact: Contact) => {
    const name = getDisplayName(contact);
    return name
      .split(' ')
      .map((n) => n[0])
      .join('');
  };

  // Get last message time (placeholder)
  const getLastMessageTime = (_contact: Contact) => 'Recently';

  // Get unread count (placeholder)
  const getUnreadCount = (_contact: Contact) => 0;

  return (
    <div
      className={cn(
        'bg-[#1D273E] text-white w-full sm:w-[350px] lg:w-[300px] h-full fixed inset-0 z-30 lg:relative lg:z-0 transition-transform duration-300 ease-in-out p-4 overflow-y-auto sm:rounded-md lg:rounded-l-3xl flex flex-row',
        {
          '-translate-x-full':
            !isSidebarOpen &&
            typeof window !== 'undefined' &&
            window.innerWidth < 1024,
          'translate-x-0':
            isSidebarOpen ||
            (typeof window !== 'undefined' && window.innerWidth >= 1024),
        },
      )}
    >
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'individual' | 'groups')}
        className="h-full w-full"
      >
        <TabsList className="grid grid-cols-2 bg-[#17224B] p-1 overflow-x-auto no-scrollbar">
          <TabsTrigger
            value="individual"
            className={cn(
              'text-gray-500 data-[state=active]:bg-[#3C4965] data-[state=active]:text-white',
              'text-white font-semibold flex items-center justify-center gap-1',
            )}
          >
            <span>Individual</span>
            <Badge className="bg-gray-400 text-white text-xs px-1.5 py-0.5 min-w-[20px] flex items-center justify-center">
              {individualContacts.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="groups"
            className={cn(
              'text-gray-500 data-[state=active]:bg-[#3C4965] data-[state=active]:text-white',
              'text-white font-semibold flex items-center justify-center gap-1',
            )}
          >
            <span>Groups</span>
            <Badge className="bg-gray-400 text-white text-xs px-1.5 py-0.5 min-w-[20px] flex items-center justify-center">
              {groups.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-2 p-3 border border-gray-50 rounded-lg mt-4">
          <img src={search} alt="search" className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search people, messages, docs..."
            className="flex-1 bg-transparent outline-none text-white placeholder-gray-400 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="mt-4 text-white text-sm font-semibold">
          {activeTab === 'individual' ? 'My People' : 'My Groups'}
        </div>

        <TabsContent value="individual">
          <div className="overflow-y-auto h-[clamp(300px,calc(100vh-12rem),900px)] pb-28 sm:pb-20 lg:pb-0">
            {contactsLoading ? (
              <div className="flex items-center justify-center text-gray-400 p-4">
                Loading contacts...
              </div>
            ) : contactsError ? (
              <div className="flex items-center justify-center text-red-400 p-4">
                Failed to load contacts.
              </div>
            ) : filteredIndividualContacts.length === 0 ? (
              <div className="flex items-center justify-center text-gray-400 p-4">
                No contacts found.
              </div>
            ) : (
              filteredIndividualContacts.map(
                (contact: Contact, index: number) => (
                  <div
                    key={contact.id}
                    className={cn(
                      'p-2 border-b border-gray-700 hover:bg-[#1A254C] cursor-pointer flex items-center gap-3',
                      selectedChat === contact.name && 'bg-[#1A254C]',
                    )}
                    onClick={() => handleContactSelect(contact, index)}
                  >
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{getInitials(contact)}</AvatarFallback>
                      </Avatar>
                      <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-green-400 border-2 border-[#10162F]" />
                    </div>
                    <div className="flex flex-row justify-between w-full gap-2 items-center">
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-white text-sm break-words whitespace-normal leading-tight">
                          {getDisplayName(contact)}
                        </span>
                        {contact.email && (
                          <span className="text-gray-400 text-xs">
                            {contact.email}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col items-end flex-shrink-0 min-w-[48px]">
                        {getUnreadCount(contact) > 0 && (
                          <Badge className="bg-gray-500 text-white px-2 py-0.5 text-xs rounded-full mb-0.5">
                            {getUnreadCount(contact)}
                          </Badge>
                        )}
                        <span className="text-xs text-gray-300 text-right leading-tight">
                          {getLastMessageTime(contact)}
                        </span>
                      </div>
                    </div>
                  </div>
                ),
              )
            )}
          </div>
        </TabsContent>

        <TabsContent value="groups">
          <div className="overflow-y-auto h-[clamp(300px,calc(100vh-12rem),900px)] pb-28 sm:pb-20 lg:pb-0">
            {contactsLoading ? (
              <div className="flex items-center justify-center text-gray-400 p-4">
                Loading groups...
              </div>
            ) : contactsError ? (
              <div className="flex items-center justify-center text-red-400 p-4">
                Failed to load groups.
              </div>
            ) : groups.length === 0 ? (
              <div className="flex items-center justify-center text-gray-400 p-4">
                No groups found.
              </div>
            ) : (
              groups.map((group: GroupInfo, index: number) => (
                <div
                  key={group?.data?.id}
                  className={cn(
                    'p-2 border-b border-gray-700 hover:bg-[#1A254C] cursor-pointer flex items-center gap-3',
                    selectedChat === (group?.data?.name || 'Unnamed Group') &&
                      'bg-[#1A254C]',
                  )}
                  onClick={() => {
                    setSelectedChat(group?.data?.name || 'Unnamed Group');
                    if (setSelectedChatIndex) setSelectedChatIndex(index);
                    if (
                      typeof window !== 'undefined' &&
                      window.innerWidth < 1024
                    ) {
                      setIsSidebarOpen(false);
                    }
                  }}
                >
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {group.name
                          ? group.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                          : 'G'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-green-400 border-2 border-[#10162F]" />
                  </div>
                  <div className="flex flex-row justify-between w-full gap-2 items-center">
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-white text-sm break-words whitespace-normal leading-tight">
                        {group?.data?.name || 'Unnamed Group'}
                      </span>
                      {group?.data?.description && (
                        <span className="text-gray-400 text-xs">
                          {group?.data?.description}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0 min-w-[48px]">
                      <Badge className="ml-0 mt-0.5 bg-gray-500 text-white px-2 py-0.5 text-xs rounded-full w-fit">
                        {group.memberCount}
                      </Badge>
                      <span className="text-xs text-gray-300 text-right leading-tight">
                        Recently
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
      {/* Close button for mobile */}
      <button
        onClick={() => setIsSidebarOpen(false)}
        className="lg:hidden absolute top-4 right-4 p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
        aria-label="Close sidebar"
      >
        <X className="w-5 h-5 text-white" />
      </button>
    </div>
  );
}
