// Entry: MobileFirstChatUI.tsx
import ChatSidebar from './ChatSidebar';
import ChatHeader from './ChatHeader';
import ChatWindow from './ChatWindow';
import ChatInput from './ChatInput';
import { useDashboardState } from '../Dashboard/useDashboardState';
import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { expertguidence } from '@/components/svg';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { FileInfo } from '@/utils/fileUtils';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: Date;
  isCurrentUser: boolean;
  conversationId: string;
  metadata?: {
    // Legacy structure
    FileUrl?: string;
    FileName?: string;
    FileType?: string;
    // New structure
    Files?: FileInfo[];
    CorrelationId?: string;
    conversationId?: string;
  };
}

export default function Chats() {
  const [activeTab, setActiveTab] = useState<'individual' | 'groups'>(
    'individual',
  );
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [selectedChatIndex, setSelectedChatIndex] = useState<number>(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [tabView, setTabView] = useState('chat');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const dashboardState = useDashboardState();
  const { user } = useAuth();

  // Cleanup object URLs on component unmount
  useEffect(() => {
    return () => {
      messages.forEach((msg) => {
        if (msg.metadata?.Files) {
          msg.metadata.Files.forEach((file) => {
            if (file.FileUrl && file.FileUrl.startsWith('blob:')) {
              URL.revokeObjectURL(file.FileUrl);
            }
          });
        }
      });
    };
  }, []);

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
      return result?.data?.items ?? [];
    },
    enabled: !!user?.id,
  });

  // Send message handler
  const sendMessage = async (
    conversationId: string,
    recipientUserIds: string[],
    recipientEmails: string[],
    groupIds?: string[],
    files?: File[],
  ) => {
    if (!message.trim() && (!files || files.length === 0)) return;

    const messageText = message.trim();
    setMessage('');

    let senderName = 'Me';
    if (user) {
      if (typeof (user as any).name === 'string' && (user as any).name) {
        senderName = (user as any).name;
      } else if (
        typeof (user as any).email === 'string' &&
        (user as any).email
      ) {
        senderName = (user as any).email;
      }
    }

    // Add message optimistically to UI
    const tempMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      senderId: user?.id || 'me',
      senderName,
      message: messageText,
      timestamp: new Date(),
      isCurrentUser: true,
      conversationId,
      metadata:
        files && files.length > 0
          ? {
              Files: files.map((file) => ({
                FileUrl: URL.createObjectURL(file), // Create object URL for immediate preview
                FileName: file.name,
                FileType: file.type,
              })),
            }
          : undefined,
    };

    setMessages((prev) => [...prev, tempMessage]);
    setIsUploading(true);

    try {
      const formData = new FormData();

      // Add the request data
      const requestData = {
        senderId: user?.id || '',
        content: messageText,
        recipientUserIds,
        recipientEmails,
        conversationId,
        ...(groupIds && groupIds.length > 0 && { groupIds }),
      };

      formData.append('request', JSON.stringify(requestData));

      // Add files if any
      if (files && files.length > 0) {
        files.forEach((file) => {
          formData.append('files', file);
        });
      }

      const result = await axios.post('/api/messaging/send', formData);

      if (result.status !== 200) {
        throw new Error('Failed to send message');
      }

      const data = result.data;

      console.log('Send message response:', data);
      console.log(
        'Message metadata from response:',
        data.metadata || data.data?.metadata,
      );

      // Update the temp message with actual response data
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempMessage.id
            ? {
                ...msg,
                id: data.messageId || tempMessage.id,
                metadata: (() => {
                  const serverMetadata = data.metadata || data.data?.metadata;
                  if (serverMetadata) {
                    // Clean up object URLs from temp message
                    if (tempMessage.metadata?.Files) {
                      tempMessage.metadata.Files.forEach((file) => {
                        if (file.FileUrl && file.FileUrl.startsWith('blob:')) {
                          URL.revokeObjectURL(file.FileUrl);
                        }
                      });
                    }
                    return serverMetadata;
                  }
                  return tempMessage.metadata;
                })(),
              }
            : msg,
        ),
      );
    } catch (error: any) {
      console.error('Error sending message:', error);

      // Clean up object URLs before removing the message
      if (tempMessage.metadata?.Files) {
        tempMessage.metadata.Files.forEach((file) => {
          if (file.FileUrl && file.FileUrl.startsWith('blob:')) {
            URL.revokeObjectURL(file.FileUrl);
          }
        });
      }

      // Remove the failed message from UI
      setMessages((prev) => prev.filter((msg) => msg.id !== tempMessage.id));

      // Restore the message text to input
      setMessage(messageText);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col items-center min-h-screen bg-[#E6EBF9] p-4 sm:p-8 font-sans">
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
              role="button"
              aria-label="Close sidebar"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Escape' || e.key === 'Enter') {
                  setIsSidebarOpen(false);
                }
              }}
            />
          )}

          <ChatSidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            selectedChat={selectedChat}
            setSelectedChat={setSelectedChat}
            selectedChatIndex={selectedChatIndex}
            setSelectedChatIndex={setSelectedChatIndex}
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />

          <div className="flex-1 flex flex-col bg-white min-h-0 rounded-2xl lg:rounded-l-none relative overflow-hidden">
            {selectedChat ? (
              <>
                <Tabs value={tabView} onValueChange={setTabView}>
                  <div className="block sm:hidden border-b bg-white">
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
                  </div>
                  <ChatHeader
                    selectedChat={selectedChat}
                    tabView={tabView}
                    setTabView={setTabView}
                    activeTab={activeTab}
                    selectedChatIndex={selectedChatIndex}
                    contacts={contacts}
                    groups={userGroups}
                  />
                  <ChatWindow
                    selectedChat={selectedChat}
                    tabView={tabView}
                    setTabView={setTabView}
                    selectedChatIndex={selectedChatIndex}
                    activeTab={activeTab}
                    contacts={contacts}
                    groups={userGroups}
                    message={message}
                    setMessage={setMessage}
                    sendMessage={sendMessage}
                    messages={messages}
                    setMessages={setMessages}
                  />
                </Tabs>
                <ChatInput
                  sendMessage={sendMessage}
                  dashboardState={dashboardState}
                  contacts={contacts}
                  groups={userGroups}
                  selectedChatIndex={selectedChatIndex}
                  activeTab={activeTab}
                  message={message}
                  setMessage={setMessage}
                  currentUserId={user?.id || ''}
                  isUploading={isUploading}
                />
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 text-center">
                Select a conversation to start chatting.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
