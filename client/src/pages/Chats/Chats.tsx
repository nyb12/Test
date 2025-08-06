import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { ArrowUp, Menu } from 'lucide-react';
import { useState } from 'react';
import {
  aiassist,
  call,
  clip,
  emoji,
  expertguidence,
  mic,
  search,
  threehorizontaldots,
  videocall,
} from '../../components/svg';

import EmojiPicker from 'emoji-picker-react';
import { useDashboardState } from '../Dashboard/useDashboardState';
import ChatInput from './ChatInput';
import { LoadingSpinner } from '@/components/ui/loading-states';

export default function MobileFirstChatUI() {
  const [activeTab, setActiveTab] = useState<'individual' | 'groups'>(
    'individual',
  );
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [tabView, setTabView] = useState('chat'); // New state for tab view
  const {
    showEmojiPicker,
    setShowEmojiPicker,
    handleEmojiClick,
    fileInputRef,
    pickerRef,
    emojiBtnRef,
    handleUploadClick,
    setMessage,
    message,
  } = useDashboardState();
  const people = [
    {
      name: 'Babak Shammas',
      expert: true,
      unread: 0,
      online: true,
      time: '10:15 AM',
    },
    {
      name: 'Joshua Vanburen',
      expert: false,
      unread: 1,
      online: true,
      time: '09:50 AM',
    },
    {
      name: 'Adi Kapoor',
      expert: false,
      unread: 0,
      online: true,
      time: 'Yesterday',
    },
    {
      name: 'Cassandra Dunn',
      expert: false,
      unread: 0,
      online: true,
      time: 'Yesterday',
    },
    {
      name: 'Emily James',
      expert: false,
      unread: 0,
      online: true,
      time: '08:30 AM',
    },
    {
      name: 'Eric Ishida',
      expert: false,
      unread: 1,
      online: true,
      time: '07:20 AM',
    },
    {
      name: 'Marie Beaudouin',
      expert: false,
      unread: 0,
      online: true,
      time: 'Monday',
    },
    {
      name: 'Reta Taylor',
      expert: false,
      unread: 0,
      online: true,
      time: 'Monday',
    },
  ];

  const filteredPeople = people.filter((person) =>
    person.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const groups = [
    { name: 'Engineering Group', time: '09:00 AM' },
    { name: 'Maintenance Group', time: 'Yesterday' },
  ];
  const filteredGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Helper to get the time for the selected chat
  const getSelectedChatTime = () => {
    if (!selectedChat) return '';
    const person = people.find((p) => p.name === selectedChat);
    if (person) return person.time;
    const group = groups.find((g) => g.name === selectedChat);
    if (group) return group.time;
    return '';
  };

  return (
    <>
      <div className="flex w-full mx-auto justify-between items-center p-4 md:pl-14 md:pr-12 rounded-xl mb-1">
        <h1 className="font-semibold text-gray-800">Messages</h1>
        <button className="flex items-center flex-row gap-1 hover:bg-gray-100 rounded-md p-1">
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
      <div className="flex h-screen w-full flex-col lg:flex-row px-2 pt-2 lg:px-10 lg:pt-4 relative">
        <div className="lg:hidden flex justify-between items-center p-4 bg-white border-b rounded-xl mb-1">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-gray-700"
          >
            <Menu />
          </button>
          <h1 className="font-semibold text-gray-800">Messages</h1>
        </div>

        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-40 z-20 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <div
          className={cn(
            'bg-[#1D273E] text-white w-full sm:w-[350px] lg:w-[300px] h-full fixed inset-0 z-30 lg:relative lg:z-0 transition-transform duration-300 ease-in-out p-4 overflow-y-auto sm:rounded-md lg:rounded-l-3xl',
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
            className="h-full"
          >
            <TabsList className="grid grid-cols-2 bg-[#17224B] p-1 overflow-x-auto no-scrollbar">
              <TabsTrigger
                value="individual"
                className={cn(
                  'text-gray-500 data-[state=active]:bg-[#3C4965] data-[state=active]:text-white',
                  'text-white font-semibold',
                )}
              >
                Individual &nbsp;
                <Badge className="bg-gray-400 active:bg-[#17224B] text-white">
                  {people.filter((p) => !p.name.includes('Group')).length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="groups"
                className={cn(
                  'text-gray-500 data-[state=active]:bg-[#3C4965] data-[state=active]:text-white',
                  'text-white font-semibold',
                )}
              >
                Groups &nbsp;
                <Badge className="bg-gray-400 active:bg-[#17224B] text-white">
                  2
                </Badge>
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2 p-3 border border-gray-50 rounded-lg mt-4">
              <img
                src={search}
                alt="search"
                className="w-4 h-4 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search people, messages, docs..."
                className="flex-1 bg-transparent outline-none text-white placeholder-gray-400 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-row gap-2 mt-4">
              {activeTab === 'individual' ? (
                <div className="text-white text-sm font-semibold">
                  My People
                </div>
              ) : (
                <div className="text-white text-sm font-semibold">
                  My Groups
                </div>
              )}
            </div>

            <TabsContent value="individual">
              <div className="overflow-y-auto h-[clamp(300px,calc(100vh-12rem),900px)] pb-28 sm:pb-20 lg:pb-0">
                {filteredPeople.map((person) => (
                  <div
                    key={person.name}
                    className={cn(
                      'p-2 border-b border-gray-700 hover:bg-[#1A254C] cursor-pointer flex items-center gap-3',
                      selectedChat === person.name && 'bg-[#1A254C]',
                    )}
                    onClick={() => {
                      setSelectedChat(person.name);
                      if (
                        typeof window !== 'undefined' &&
                        window.innerWidth < 1024
                      )
                        setIsSidebarOpen(false);
                    }}
                  >
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {person.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </AvatarFallback>
                      </Avatar>
                      {person.online && (
                        <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-green-400 border-2 border-[#10162F]" />
                      )}
                    </div>
                    <div className="flex flex-row justify-between w-full gap-2 items-center">
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-white text-sm break-words whitespace-normal leading-tight">
                          {person.name}
                        </span>
                        {person.expert && (
                          <Badge className="ml-0 mt-0.5 bg-yellow-400 text-black px-1.5 py-0.5 text-[10px] w-fit">
                            Expert
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-col items-end flex-shrink-0 min-w-[48px]">
                        {person.unread > 0 && (
                          <Badge className="bg-gray-500 text-white px-2 py-0.5 text-xs rounded-full mb-0.5">
                            {person.unread}
                          </Badge>
                        )}
                        <span className="text-xs text-gray-300 text-right leading-tight">
                          {person.time}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="groups">
              <div className="overflow-y-auto h-[clamp(300px,calc(100vh-12rem),900px)] pb-28 sm:pb-20 lg:pb-0">
                {filteredGroups.map((group) => (
                  <div
                    key={group.name}
                    className={cn(
                      'p-2 border-b border-gray-700 hover:bg-[#1A254C] cursor-pointer flex items-center gap-3',
                      selectedChat === group.name && 'bg-[#1A254C]',
                    )}
                    onClick={() => {
                      setSelectedChat(group.name);
                      if (
                        typeof window !== 'undefined' &&
                        window.innerWidth < 1024
                      )
                        setIsSidebarOpen(false);
                    }}
                  >
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {group.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-green-400 border-2 border-[#10162F]" />
                    </div>
                    <div className="flex flex-row justify-between w-full gap-2 items-center">
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-white text-sm break-words whitespace-normal leading-tight">
                          {group.name}
                        </span>
                      </div>
                      <div className="flex flex-col items-end flex-shrink-0 min-w-[48px]">
                        <Badge className="ml-0 mt-0.5 bg-gray-500 text-white px-2 py-0.5 text-xs rounded-full w-fit">
                          1
                        </Badge>
                        <span className="text-xs text-gray-300 text-right leading-tight">
                          {group.time}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex-1 flex flex-col bg-white min-h-0 rounded-2xl lg:rounded-l-none relative overflow-hidden">
          {selectedChat ? (
            <>
              {/* Tabs: only on top for mobile */}
              <div className="block sm:hidden border-b bg-white ">
                <Tabs value={tabView} onValueChange={setTabView}>
                  <TabsList className="bg-gray-100 rounded-md p-0.5 h-8 w-full flex justify-center">
                    <TabsTrigger
                      value="chat"
                      className="px-3 py-1 text-xs font-medium"
                    >
                      Chat
                    </TabsTrigger>
                    <TabsTrigger
                      value="docs"
                      className="px-3 py-1 text-xs font-medium"
                    >
                      Docs
                    </TabsTrigger>
                    <TabsTrigger
                      value="summary"
                      className="px-3 py-1 text-xs font-medium"
                    >
                      Summary
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Header with avatar, name, and icons; tabs inline for sm+ */}
              <div className="flex justify-between items-center p-4 border-b bg-white">
                <div className="flex items-center gap-4">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {selectedChat
                        ?.split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col max-w-[120px] sm:max-w-none">
                    <span className="font-semibold text-gray-800 truncate">
                      {selectedChat}
                    </span>
                    <span className="text-sm text-gray-500">Engineer</span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 text-gray-600 items-center w-full sm:w-auto">
                  <div className="flex flex-row gap-2 w-full sm:w-auto justify-end items-center sm:justify-center">
                    <img
                      src={call}
                      alt="call"
                      className="w-15 h-15 cursor-pointer hover:bg-gray-100 rounded-full p-1 sm:p-2 "
                    />
                    <img
                      src={videocall}
                      alt="videocall"
                      className="w-15 h-15 cursor-pointer hover:bg-gray-100 rounded-full p-1 sm:p-2 "
                    />
                    {/* Tabs inline only for sm+ */}
                    <div className="hidden sm:flex w-auto sm:w-auto mt-2 sm:mt-0 justify-center sm:justify-start">
                      <Tabs value={tabView} onValueChange={setTabView}>
                        <TabsList className="bg-gray-100 rounded-md p-0.5 h-8 w-auto">
                          <TabsTrigger
                            value="chat"
                            className="px-3 py-1 text-xs font-medium"
                          >
                            Chat
                          </TabsTrigger>
                          <TabsTrigger
                            value="docs"
                            className="px-3 py-1 text-xs font-medium"
                          >
                            Docs
                          </TabsTrigger>
                          <TabsTrigger
                            value="summary"
                            className="px-3 py-1 text-xs font-medium"
                          >
                            Summary
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                    <img
                      src={threehorizontaldots}
                      alt="more"
                      className="w-15 h-15 cursor-pointer hover:bg-gray-100 rounded-full p-1 sm:p-2 "
                    />
                  </div>
                </div>
              </div>

              {/* Tab Content Below Header */}
              <Tabs value={tabView} onValueChange={setTabView}>
                <TabsContent value="chat">
                  {/* <div className="flex-1 px-4 pt-4 sm:px-4 space-y-3 sm:space-y-4 overflow-y-auto max-w-full h-[clamp(300px,calc(100vh-12rem),900px)] pb-20">
                    <div className="flex items-start gap-2">
                      <Avatar className="h-8 w-8 mt-1">
                        <AvatarFallback>
                          {selectedChat
                            ?.split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-sm text-gray-700 bg-white p-2 sm:p-3 rounded-xl shadow-sm w-max max-w-full break-words">
                        Hey {selectedChat}, did you already troubleshoot the
                        hydraulic pressure issue on N775AS?
                        <div className="text-xs flex text-gray-400 mt-1 justify-end">
                          {getSelectedChatTime()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <img
                        src={aiassist}
                        alt="AI Assist"
                        className="w-8 h-8 mt-1 rounded-full bg-blue-100 p-1"
                      />
                      <div className="text-sm bg-blue-50 border border-blue-300 p-2 sm:p-3 rounded-xl shadow-sm max-w-full break-words">
                        <span className="font-semibold text-blue-800 mb-1 block">
                          Guardline Agent
                        </span>
                        <p>Detected Mismatch</p>
                        <p>
                          Your question seems related to aircraft N775AS. Want
                          to switch?
                        </p>
                        <div className="mt-2 space-x-2">
                          <button className="text-blue-600 underline">
                            Switch to N775AS
                          </button>
                          <button className="text-gray-500 underline">
                            I'll do it manually
                          </button>
                        </div>
                      </div>
                    </div>
                  </div> */}
                  <div className="flex items-center justify-center h-full">
                    <LoadingSpinner />
                  </div>
                </TabsContent>
                <TabsContent value="docs">
                  <div className="flex-1 flex items-center justify-center text-gray-500 h-[clamp(300px,calc(100vh-12rem),900px)] pb-20">
                    <span>Docs content goes here.</span>
                  </div>
                </TabsContent>
                <TabsContent value="summary">
                  <div className="flex-1 flex items-center justify-center text-gray-500 h-[clamp(300px,calc(100vh-12rem),900px)] pb-20">
                    <span>Summary content goes here.</span>
                  </div>
                </TabsContent>
              </Tabs>

              <ChatInput
                dashboardState={{
                  showEmojiPicker,
                  setShowEmojiPicker,
                  handleEmojiClick,
                  fileInputRef,
                  pickerRef,
                  emojiBtnRef,
                  handleUploadClick,
                }}
                message={message}
                setMessage={setMessage}
                sendMessage={(
                  conversationId,
                  recipientUserIds,
                  recipientEmails,
                  groupIds,
                  files,
                ) => {
                  // Handle sending message here
                  console.log('Sending message:', {
                    conversationId,
                    recipientUserIds,
                    recipientEmails,
                    groupIds,
                    files,
                  });
                }}
                contacts={people}
                groups={[]}
                selectedChatIndex={
                  selectedChat
                    ? people.findIndex((p) => p.name === selectedChat)
                    : 0
                }
                activeTab={activeTab}
                currentUserId="current-user-id"
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 text-center">
              Select a conversation to start chatting.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
