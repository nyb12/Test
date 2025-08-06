// ChatHeader.tsx
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { call, videocall, threehorizontaldots } from '../../components/svg';

interface ChatHeaderProps {
  selectedChat: string;
  tabView: string;
  setTabView: (view: string) => void;
  activeTab?: 'individual' | 'groups';
  selectedChatIndex?: number;
  contacts?: any[];
  groups?: any[];
}

export default function ChatHeader({
  selectedChat,
  tabView,
  setTabView,
  activeTab = 'individual',
  selectedChatIndex = 0,
  contacts = [],
  groups = [],
}: ChatHeaderProps) {
  // Determine if current chat is a group and get member count
  const isGroup = activeTab === 'groups';
  const selectedGroup =
    isGroup && groups.length > 0 ? groups[selectedChatIndex] : null;
  const memberCount =
    selectedGroup?.memberCount || selectedGroup?.members?.length || 0;

  // Get subtitle text
  const getSubtitle = () => {
    if (isGroup && memberCount > 0) {
      return `${memberCount} member${memberCount === 1 ? '' : 's'}`;
    }
    return 'Engineer'; // Default for individual chats
  };

  return (
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

          <span className="text-sm text-gray-500">{getSubtitle()}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 text-gray-600 items-center w-full sm:w-auto">
        <div className="flex flex-row gap-2 w-full sm:w-auto justify-end items-center sm:justify-center">
          <img
            src={call}
            alt="call"
            className="w-15 h-15 cursor-pointer hover:bg-gray-100 rounded-full p-1 sm:p-2"
          />
          <img
            src={videocall}
            alt="videocall"
            className="w-15 h-15 cursor-pointer hover:bg-gray-100 rounded-full p-1 sm:p-2"
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
            className="w-15 h-15 cursor-pointer hover:bg-gray-100 rounded-full p-1 sm:p-2"
          />
        </div>
      </div>
    </div>
  );
}
