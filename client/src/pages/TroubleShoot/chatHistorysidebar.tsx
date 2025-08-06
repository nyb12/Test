import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { truncateTitle } from '@/utils/helper';
import {
  Hash,
  MessageSquare,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Search,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '@/hooks/use-auth';
import { useChatHistoryStore } from '@/stores/chatHistoryStore';

interface ChatItem {
  id: string;
  title: string;
  type: 'thread' | 'chat';
  timestamp: number;
  isActive?: boolean;
  isThread?: boolean;
  item?: string;
  content?: string;
  conversationId?: string;
}

// API response interface
interface ChatHistoryResponse {
  success: boolean;
  data: {
    messages?: ChatHistoryItem[];
    totalCount?: number;
    pageNumber?: number;
    pageSize?: number;
  };
}

interface ChatHistoryItem {
  id: string;
  title?: string;
  message?: string;
  timestamp: string;
  conversationId?: string;
  userId?: string;
  content?: string;
}

// API function to fetch chat history
const fetchChatHistory = async (
  userId: string,
  pageNumber: number,
  pageSize: number,
): Promise<ChatHistoryResponse> => {
  const response = await axios.get(`/api/Chat/user/${userId}/history`, {
    params: {
      pageNumber,
      pageSize,
    },
    headers: {
      'X-API-Key': 'test-api-key-67890', // Replace with your actual API key
    },
  });
  return response.data;
};

// Custom hook for chat history
const useChatHistory = (
  userId: string,
  pageNumber: number = 1,
  pageSize: number = 20,
) => {
  return useQuery({
    queryKey: ['chatHistory', userId, pageNumber, pageSize],
    queryFn: () => fetchChatHistory(userId, pageNumber, pageSize),
    enabled: !!userId, // Only run query if userId is provided
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });
};

// Transform API data to match Zustand store Chat interface
const transformChatHistory = (apiData: ChatHistoryItem[]) => {
  return apiData.map((item) => ({
    id: item.id,
    title: item.content || 'Untitled Chat',
    timestamp: new Date(item.timestamp),
    isActive: false,
    messages: [],
    conversationId: item.conversationId,
  }));
};

function formatTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ago`;
  } else if (hours > 0) {
    return `${hours}h ago`;
  } else {
    return 'Just now';
  }
}

interface ChatSidebarProps {
  onChatSelect?: (chatId: string) => void;
  onNewChat?: () => void;
  activeChatId?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  userId?: string; // Add userId prop
}

export default function ChatSidebar({
  onChatSelect,
  onNewChat,
  activeChatId,
  isCollapsed = false,
  onToggleCollapse,
  userId: propUserId, // Rename to avoid conflict
}: ChatSidebarProps) {
  const { user } = useAuth();
  const {
    threads,
    chats,
    selectedThreadId,
    selectedChatId,
    searchQuery,
    setSearchQuery,
    setChats,
    setSelectedChatId,
    getFilteredThreads,
    getFilteredChats,
  } = useChatHistoryStore();

  // Use authenticated user's ID or fallback to prop
  const currentUserId = user?.id || propUserId || '';
  const [showMoreThreads, setShowMoreThreads] = useState(false);
  const [showMoreChats, setShowMoreChats] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Fetch chat history using React Query
  const {
    data: chatHistoryData,
    isLoading,
    error,
    refetch,
  } = useChatHistory(currentUserId, currentPage, pageSize);

  // Update Zustand store when API data changes
  useEffect(() => {
    if (chatHistoryData?.data?.messages) {
      const transformedChats = transformChatHistory(
        chatHistoryData.data.messages,
      );
      setChats(transformedChats);
    }
  }, [chatHistoryData, setChats]);

  // Get filtered data from Zustand store
  const storeFilteredThreads = getFilteredThreads();
  const storeFilteredChats = getFilteredChats();

  // Transform Zustand store data to match ChatItem interface
  const transformedThreads: ChatItem[] = storeFilteredThreads.map((thread) => ({
    id: thread.id,
    title: thread.title,
    type: 'thread' as const,
    conversationId: thread.conversationId,
    timestamp:
      thread.timestamp instanceof Date
        ? thread.timestamp.getTime()
        : new Date(thread.timestamp).getTime(),
    isActive: thread.isActive,
  }));

  const transformedChats: ChatItem[] = storeFilteredChats.map((chat) => ({
    id: chat.id,
    title: chat.title,
    type: 'chat' as const,
    conversationId: chat.conversationId,
    timestamp:
      chat.timestamp instanceof Date
        ? chat.timestamp.getTime()
        : new Date(chat.timestamp).getTime(),
    isActive: chat.isActive,
  }));

  // Use transformed data from store
  const displayThreads = transformedThreads;
  const displayChats =
    transformedChats.length > 0
      ? transformedChats
      : [
          {
            id: '11',
            title: 'No Chat History Found',
            type: 'chat' as const,
            timestamp: Date.now() - 900000,
          },
        ];

  const displayedThreads = showMoreThreads
    ? displayThreads
    : displayThreads.slice(0, 5);
  const displayedChats = showMoreChats
    ? displayChats
    : displayChats.slice(0, 6);
  const handleChatClick = (chatId: string) => {
    onChatSelect?.(chatId);
  };

  const handleNewChat = () => {
    onNewChat?.();
    onToggleCollapse?.();
  };

  const handleLoadMore = () => {
    setCurrentPage((prev) => prev + 1);
  };

  // Loading state
  if (isLoading && currentPage === 1) {
    return (
      <div className="w-72 h-screen border-r bg-gradient-to-b from-[#D8DEF1] to-[#FAFBFF] flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <Button
              onClick={handleNewChat}
              className="flex items-center gap-2 text-sm font-medium"
              variant="ghost"
            >
              <Plus className="w-4 h-4" /> New Chat
            </Button>
            <Button
              onClick={onToggleCollapse}
              size="sm"
              variant="ghost"
              className="w-8 h-8 rounded-full"
              title="Collapse Sidebar"
            >
              <PanelRightOpen className="w-4 h-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search Threads & Chats"
              className="pl-9 text-sm bg-[#D8DEF1] border-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 p-4 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">
              Loading chat history...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="w-72 h-screen border-r bg-gradient-to-b from-[#D8DEF1] to-[#FAFBFF] flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <Button
              onClick={handleNewChat}
              className="flex items-center gap-2 text-sm font-medium"
              variant="ghost"
            >
              <Plus className="w-4 h-4" /> New Chat
            </Button>
            <Button
              onClick={onToggleCollapse}
              size="sm"
              variant="ghost"
              className="w-8 h-8 rounded-full"
              title="Collapse Sidebar"
            >
              <PanelRightOpen className="w-4 h-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search Threads & Chats"
              className="pl-9 text-sm bg-[#D8DEF1] border-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 p-4 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-red-600 mb-2">
              Failed to load chat history
            </p>
            <Button onClick={() => refetch()} size="sm" variant="outline">
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isCollapsed) {
    return (
      <div className="w-16 h-screen border-r bg-gradient-to-b from-[#D8DEF1] to-[#FAFBFF] flex flex-col items-center py-4">
        {/* Collapsed sidebar with just icons */}
        <div className="flex flex-col items-center space-y-4">
          <Button
            onClick={handleNewChat}
            size="sm"
            className="w-10 h-10 text-black"
            title="New Chat"
            variant="ghost"
          >
            <Plus className="w-4 h-4" />
          </Button>

          <Button
            onClick={onToggleCollapse}
            size="sm"
            variant="ghost"
            className="w-8 h-8 rounded-full"
            title="Expand Sidebar"
          >
            <PanelRightClose className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 h-screen border-r bg-gradient-to-b from-[#D8DEF1] to-[#FAFBFF] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b ">
        <div className="flex items-center justify-between mb-4">
          <Button
            onClick={handleNewChat}
            className="flex items-center gap-2 text-sm font-medium"
            variant="ghost"
          >
            <Plus className="w-4 h-4" /> New Chat
          </Button>
          <Button
            onClick={onToggleCollapse}
            size="sm"
            variant="ghost"
            className="w-8 h-8 rounded-full"
            title="Collapse Sidebar"
          >
            <PanelRightOpen className="w-4 h-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search Threads & Chats"
            className="pl-9 text-sm bg-[#D8DEF1]  border-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Chat History */}
      <ScrollArea className="flex-1 p-[10px] space-y-6">
        {/* Threads Section */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
            <Hash className="w-3 h-3" />
            Threads
          </h3>
          <ul className="space-y-1">
            {displayedThreads.map((thread) => (
              <li
                key={thread.id}
                className={`text-sm hover:bg-muted px-2 py-2 rounded cursor-pointer truncate flex items-center justify-between group ${
                  activeChatId === thread.id
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-foreground'
                }`}
                onClick={() => {
                  handleChatClick(thread.id);
                  onToggleCollapse?.();
                }}
                title={thread.title} // Show full title on hover
              >
                <span className="truncate flex-1">
                  {truncateTitle(thread.title)}
                </span>
                <span className="text-xs text-muted-foreground ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {formatTime(thread.timestamp)}
                </span>
              </li>
            ))}
            {displayThreads.length > 5 && (
              <li
                className="text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 cursor-pointer px-2 py-2 rounded transition-colors"
                onClick={() => setShowMoreThreads(!showMoreThreads)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {showMoreThreads
                      ? 'Show Less'
                      : `...See ${displayThreads.length - 5} More Threads`}
                  </span>
                  <span className="text-xs opacity-75">
                    {showMoreThreads ? '↑' : '↓'}
                  </span>
                </div>
              </li>
            )}
          </ul>
        </div>

        {/* Chats Section */}
        <div className="mt-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            Chats
          </h3>
          <ul className="space-y-1">
            {displayedChats.map((chat) => {
              const isActive = activeChatId === chat.conversationId;

              return (
                <li
                  key={chat.id}
                  className={`text-sm hover:bg-muted px-2 py-2 rounded cursor-pointer truncate flex items-center justify-between group ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-foreground'
                  }`}
                  onClick={() => {
                    if (chat.conversationId) {
                      handleChatClick(chat.conversationId);
                      onToggleCollapse?.();
                    }
                  }}
                  title={chat.title}
                >
                  <span className="truncate flex-1">
                    {truncateTitle(chat.title)}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {formatTime(chat.timestamp)}
                  </span>
                </li>
              );
            })}
            {displayChats.length > 6 && (
              <li
                className="text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 cursor-pointer px-2 py-2 rounded transition-colors"
                onClick={() => setShowMoreChats(!showMoreChats)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {showMoreChats
                      ? 'Show Less'
                      : `...See ${displayChats.length - 6} More Chats`}
                  </span>
                  <span className="text-xs opacity-75">
                    {showMoreChats ? '↑' : '↓'}
                  </span>
                </div>
              </li>
            )}
          </ul>

          {/* Load More Button for API data */}
          {chatHistoryData?.data?.totalCount &&
            currentPage * pageSize < chatHistoryData.data.totalCount && (
              <div className="mt-4 pt-2 border-t">
                <Button
                  onClick={handleLoadMore}
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? 'Loading...' : 'Load More Chats'}
                </Button>
              </div>
            )}
        </div>
      </ScrollArea>
    </div>
  );
}
