// Entry: MobileFirstChatUI.tsx
import ChatSidebar from './ChatSidebar';
import ChatHeader from './ChatHeader';
import ChatWindow from './ChatWindow';
import ChatInput from './ChatInput';
import { useDashboardState } from '../Dashboard/useDashboardState';
import { useState } from 'react';
import { Menu } from 'lucide-react';
import { expertguidence } from '@/components/svg';
import { useAuth } from '@/hooks/use-auth';

export default function MobileFirstChatUI() {
  const [activeTab, setActiveTab] = useState<'individual' | 'groups'>(
    'individual',
  );
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [tabView, setTabView] = useState('chat');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedChatIndex, setSelectedChatIndex] = useState(0);
  const dashboardState = useDashboardState();
  const { user } = useAuth();

  const sendMessage = async (
    conversationId: string,
    recipientUserIds: string[],
    recipientEmails: string[],
  ) => {
    // Simplified send message implementation
    console.log('Sending message:', {
      conversationId,
      recipientUserIds,
      recipientEmails,
      message,
    });
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

        <ChatSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          selectedChat={selectedChat}
          setSelectedChat={setSelectedChat}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />

        <div className="flex-1 flex flex-col bg-white min-h-0 rounded-2xl lg:rounded-l-none relative overflow-hidden">
          {selectedChat ? (
            <>
              <ChatHeader
                selectedChat={selectedChat}
                tabView={tabView}
                setTabView={setTabView}
                activeTab={activeTab}
                selectedChatIndex={selectedChatIndex}
                contacts={contacts}
                groups={groups}
              />
              <ChatWindow
                selectedChat={selectedChat}
                tabView={tabView}
                setTabView={setTabView}
                message={message}
                setMessage={setMessage}
                sendMessage={sendMessage}
                messages={messages}
                setMessages={setMessages}
                contacts={contacts}
                groups={groups}
                selectedChatIndex={selectedChatIndex}
                activeTab={activeTab}
              />
              <ChatInput
                dashboardState={dashboardState}
                message={message}
                setMessage={setMessage}
                sendMessage={sendMessage}
                contacts={contacts}
                groups={groups}
                selectedChatIndex={selectedChatIndex}
                activeTab={activeTab}
                currentUserId={user?.id || ''}
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
