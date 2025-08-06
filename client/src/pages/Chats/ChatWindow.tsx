// ChatWindow.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { aiassist } from '../../components/svg';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import FileDisplay from '@/components/FileDisplay';
import { FileInfo } from '@/utils/fileUtils';
import { LoadingSpinner } from '@/components/ui/loading-states';

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
  memberCount: number;
  members: GroupMember[];
}

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

interface ChatWindowProps {
  selectedChat: string;
  tabView: string;
  setTabView: (view: string) => void;
  contacts?: Contact[];
  selectedChatIndex?: number;
  groups?: any[];
  activeTab?: 'individual' | 'groups';
  message: string;
  setMessage: (val: string) => void;
  sendMessage: (
    conversationId: string,
    recipientUserIds: string[],
    recipientEmails: string[],
  ) => void;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

function getSelectedChatTime(selectedChat: string): string {
  const people = [
    { name: 'Babak Shammas', time: '10:15 AM' },
    { name: 'Joshua Vanburen', time: '09:50 AM' },
    { name: 'Adi Kapoor', time: 'Yesterday' },
    { name: 'Cassandra Dunn', time: 'Yesterday' },
    { name: 'Emily James', time: '08:30 AM' },
    { name: 'Eric Ishida', time: '07:20 AM' },
    { name: 'Marie Beaudouin', time: 'Monday' },
    { name: 'Reta Taylor', time: 'Monday' },
  ];
  const groups = [
    { name: 'Engineering Group', time: '09:00 AM' },
    { name: 'Maintenance Group', time: 'Yesterday' },
  ];
  const person = people.find((p) => p.name === selectedChat);
  if (person) return person.time;
  const group = groups.find((g) => g.name === selectedChat);
  if (group) return group.time;
  return '';
}

export default function ChatWindow({
  selectedChat,
  tabView,
  setTabView,
  contacts = [],
  selectedChatIndex = 0,
  groups = [],
  activeTab = 'individual',
  message,
  setMessage,
  sendMessage,
  messages,
  setMessages,
}: ChatWindowProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [chatTitle, setChatTitle] = useState('');
  const [participantNames, setParticipantNames] = useState<Map<string, string>>(
    new Map(),
  );
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [renderedMessageIds, setRenderedMessageIds] = useState<Set<string>>(
    new Set(),
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentUserId = user?.id || '';

  // File display component

  const generateConversationId = (contact: Contact | any): string => {
    // Handle group objects (from groups array)
    if (contact && contact.id && !contact.contactId && !contact.messageType) {
      // This is a group object from the groups array
      return `group:${contact.id}`;
    }

    // Handle Contact objects
    if (contact.messageType === 'Group' && contact.id) {
      return `group:${contact.id}`;
    } else {
      // For direct messages, create conversation ID with user IDs in consistent order
      const otherUserId = contact.contactId || contact?.id?.toString();
      const userIds = [currentUserId, otherUserId].sort();
      return `dm:${userIds.join('_')}`;
    }
  };
  // Determine the selected contact/group based on active tab
  const selectedContact =
    contacts && contacts.length > 0 && typeof selectedChatIndex === 'number'
      ? contacts[selectedChatIndex] || null
      : null;
  const selectedGroup =
    groups && groups.length > 0 && typeof selectedChatIndex === 'number'
      ? groups[selectedChatIndex] || null
      : null;

  // Use the appropriate ID for conversation
  const conversationId = (() => {
    if (activeTab === 'groups' && selectedGroup) {
      const groupConvId = generateConversationId(selectedGroup);
      return groupConvId;
    } else if (selectedContact) {
      const contactConvId = generateConversationId(selectedContact);
      return contactConvId;
    }
    return '';
  })();

  // Fetch contacts if not provided
  const {
    data: fetchedContacts = [],
    isLoading: contactsLoading,
    isError: contactsError,
  } = useQuery({
    queryKey: ['/api/contacts'],
    queryFn: async () => {
      const res = await fetch('/api/contacts');
      if (!res.ok) throw new Error('Failed to fetch contacts');
      return res.json();
    },
    enabled: contacts.length === 0,
  });

  const activeContacts = contacts.length > 0 ? contacts : fetchedContacts;

  const fetchUserInfo = async (userId: string) => {
    try {
      const res = await fetch('/api/contacts/all');
      const data = await res.json();
      const user = data.find((c: any) => c.contactId === userId);
      return user?.name || user?.email || user?.phone || 'Unknown';
    } catch {
      return 'Unknown';
    }
  };

  const fetchGroupInfo = async (groupId: string, userId: string) => {
    try {
      const res = await fetch(`/api/UserGroups/${groupId}?userId=${userId}`);
      const result = await res.json();
      if (result.success) return result.data;
    } catch {}
    return null;
  };

  const fetchConversationHistory = async (): Promise<ChatMessage[]> => {
    let convId = '';
    if (activeTab === 'groups' && selectedGroup) {
      convId = generateConversationId(selectedGroup);
    } else if (selectedContact) {
      convId = generateConversationId(selectedContact);
    }
    if (!convId) return [];

    const requestBody = {
      userId: currentUserId,
      page: 1,
      pageSize: 100,
    };

    try {
      const response = await fetch(
        `/api/messaging/conversation/${convId}/history`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        },
      );

      if (!response.ok) {
        return [];
      }

      const result = await response.json();
      const messages = result?.data?.messages;
      if (result?.success && Array.isArray(messages)) {
        return messages?.map((msg: any): ChatMessage => {
          return {
            id: msg.id,
            senderId: msg.senderId,
            senderName: msg.senderName || 'Unknown',
            message: msg.content,
            timestamp: new Date(msg.sentAt),
            isCurrentUser: msg.senderId === currentUserId,
            conversationId: conversationId || msg.conversationId || '',
            metadata: msg.metadata,
          };
        });
      }
    } catch (err) {
      console.error('Failed to fetch conversation history', err);
    }
    return [];
  };

  useEffect(() => {
    const initializeChat = async () => {
      setMessages([]);
      setParticipantNames(new Map());
      setGroupInfo(null);
      setRenderedMessageIds(new Set());

      if (selectedGroup) {
        setGroupInfo(selectedGroup);
        const map = new Map();
        if (selectedGroup.members) {
          selectedGroup.members.forEach((m: GroupMember) => {
            map.set(m.userId, `${m.firstName} ${m.lastName}`);
          });
        }
        setParticipantNames(map);
      } else if (selectedContact?.messageType === 'Group') {
        const group = await fetchGroupInfo(
          selectedContact.groupId!,
          currentUserId,
        );
        if (group) {
          setGroupInfo(group);
          const map = new Map();
          group.members.forEach((m: GroupMember) => {
            map.set(m.userId, `${m.firstName} ${m.lastName}`);
          });
          setParticipantNames(map);
        }
      } else if (selectedContact) {
        const name = await fetchUserInfo(
          selectedContact.contactId || selectedContact.id,
        );
        setParticipantNames(new Map([[selectedContact.id, name]]));
      }

      const history = await fetchConversationHistory();
      const typedHistory: ChatMessage[] = Array.isArray(history) ? history : [];

      // Merge with existing messages to preserve any complete metadata
      setMessages((prev) => {
        const existingMessages = new Map(prev.map((m) => [m.id, m]));

        return typedHistory.map((historyMsg) => {
          const existingMsg = existingMessages.get(historyMsg.id);
          if (existingMsg) {
            // If existing message has file metadata and history message doesn't, keep the existing
            const existingHasFiles =
              (existingMsg.metadata?.Files &&
                existingMsg.metadata.Files.length > 0) ||
              existingMsg.metadata?.FileUrl;
            const historyHasFiles =
              (historyMsg.metadata?.Files &&
                historyMsg.metadata.Files.length > 0) ||
              historyMsg.metadata?.FileUrl;

            if (existingHasFiles && !historyHasFiles) {
              return {
                ...historyMsg,
                metadata: existingMsg.metadata,
              };
            }
          }
          return historyMsg;
        });
      });

      setRenderedMessageIds(new Set(typedHistory.map((m) => m.id)));
    };

    if ((selectedContact || selectedGroup) && currentUserId) {
      initializeChat();
    }
  }, [
    selectedChatIndex,
    selectedContact,
    selectedGroup,
    currentUserId,
    activeTab,
  ]);

  useEffect(() => {
    const poll = async () => {
      try {
        let payload: any = { limit: 50 };
        if (
          activeTab === 'groups' &&
          Array.isArray(groups) &&
          groups.length > 0
        ) {
          payload.groupIds = groups.map((g: any) => g.id).filter(Boolean);
        }
        const res = await fetch('/api/messaging/pull', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await res.json();
        let newMsgs = (result.data?.messages || []).filter(
          (msg: any) => !renderedMessageIds.has(msg.id),
        );

        // Filter messages for current chat only
        if (activeTab === 'individual' && selectedContact) {
          // Only messages from/to the selected contact
          newMsgs = newMsgs.filter(
            (msg: any) =>
              (msg.senderId === selectedContact.contactId ||
                msg.senderId === currentUserId) &&
              msg.messageType === 'DirectUser',
          );
        } else if (activeTab === 'groups' && selectedGroup) {
          // Only messages for the selected group
          newMsgs = newMsgs.filter(
            (msg: any) =>
              msg.groupId === selectedGroup.id && msg.messageType === 'Group',
          );
        }

        const formatted = newMsgs.map((msg: any): ChatMessage => {
          return {
            id: msg.id,
            senderId: msg.senderId,
            senderName:
              participantNames.get(msg.senderId) || msg.senderName || 'Unknown',
            message: msg.content,
            timestamp: new Date(msg.sentAt),
            isCurrentUser: msg.senderId === currentUserId,
            conversationId: conversationId || msg.conversationId || '',
            metadata: msg.metadata,
          };
        });
        if (formatted.length) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m: ChatMessage) => m.id));
            const newMessages = formatted.filter(
              (m: ChatMessage) => !existingIds.has(m.id),
            );

            // For existing messages, preserve their metadata if it's more complete
            const updatedPrev = prev.map((existingMsg) => {
              const newMsg = formatted.find(
                (m: ChatMessage) => m.id === existingMsg.id,
              );
              if (newMsg) {
                // If existing message has file metadata and new message doesn't, keep the existing
                const existingHasFiles =
                  (existingMsg.metadata?.Files &&
                    existingMsg.metadata.Files.length > 0) ||
                  existingMsg.metadata?.FileUrl;
                const newHasFiles =
                  (newMsg.metadata?.Files &&
                    newMsg.metadata.Files.length > 0) ||
                  newMsg.metadata?.FileUrl;

                if (existingHasFiles && !newHasFiles) {
                  return {
                    ...newMsg,
                    metadata: existingMsg.metadata,
                  };
                }
              }
              return existingMsg;
            });

            return [...updatedPrev, ...newMessages];
          });
          const ids = new Set(renderedMessageIds);
          formatted.forEach((m: ChatMessage) => ids.add(m.id));
          setRenderedMessageIds(ids);
        }
      } catch (e) {
        // handle error
      }
    };

    if (currentUserId) {
      pollingIntervalRef.current = setInterval(poll, 2500);
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }
  }, [
    participantNames,
    renderedMessageIds,
    currentUserId,
    activeTab,
    selectedContact,
    selectedGroup,
    groups,
    conversationId,
  ]);

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Auto-scroll to bottom on every message update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages]);

  let recipientUserIds: string[] = [];
  let recipientEmails: string[] = [];
  let groupIds: string[] = [];
  if (activeTab === 'individual' && selectedContact) {
    if (selectedContact.contactId)
      recipientUserIds = [selectedContact.contactId];
    if (selectedContact.email) recipientEmails = [selectedContact.email];
  } else if (activeTab === 'groups' && selectedGroup) {
    if (selectedGroup.id) groupIds = [selectedGroup.id];
  }

  return (
    <Tabs value={tabView} onValueChange={setTabView}>
      <TabsContent value="chat">
        <div className="flex-1 w-full px-4 sm:px-6 pt-2 sm:pt-4 space-y-3 sm:space-y-4 overflow-y-auto max-w-full h-[clamp(300px,calc(100vh-12rem),900px)] pb-20">
          {contactsLoading && (
            <div className="flex items-center justify-center text-gray-500">
              Loading messages...
            </div>
          )}
          {contactsError && (
            <div className="flex items-center justify-center text-red-500">
              Failed to load messages.
            </div>
          )}
          {messages.filter((msg) => msg.conversationId === conversationId)
            .length > 0 ? (
            [...messages.filter((msg) => msg.conversationId === conversationId)]
              .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
              .map((msg) => (
                <div
                  key={msg.id}
                  className={`flex mb-4 ${
                    msg.isCurrentUser ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {!msg.isCurrentUser && (
                    <Avatar className="h-8 w-8 mt-1 mr-2">
                      <AvatarFallback>
                        {msg.senderName
                          ?.split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div>
                    <div
                      className={`p-2 sm:p-3 rounded-xl shadow-sm max-w-[90vw] sm:max-w-xl break-words ${
                        msg.isCurrentUser
                          ? 'bg-white border border-gray-200'
                          : 'bg-[#F4F6FB]'
                      } text-gray-900`}
                    >
                      {msg.message}
                      {msg.metadata && (
                        <div className="mt-2 truncate text-sm text-blue-600 hover:underline cursor-pointer max-w-[80vw] sm:max-w-[40vw]">
                          <FileDisplay metadata={msg.metadata} />
                        </div>
                      )}
                    </div>
                    <div
                      className={`text-xs mt-1 ${
                        msg.isCurrentUser
                          ? 'text-right text-gray-400'
                          : 'text-left text-gray-400'
                      }`}
                    >
                      {msg.timestamp instanceof Date
                        ? msg.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                    </div>
                  </div>
                  {msg.isCurrentUser && <div className="ml-2" />}
                </div>
              ))
          ) : (
            <>
              {/* <div className="flex items-start gap-2">
                <Avatar className="h-8 w-8 mt-1">
                  <AvatarFallback>
                    {selectedChat
                      ?.split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="text-sm text-gray-700 bg-white p-2 sm:p-3 rounded-xl shadow-sm w-max max-w-[90vw] sm:max-w-xl break-words">
                  Hey {selectedChat}, did you already troubleshoot the hydraulic
                  pressure issue on N775AS?
                  <div className="text-xs flex text-gray-400 mt-1 justify-end">
                    {getSelectedChatTime(selectedChat)}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <img
                  src={aiassist}
                  alt="AI Assist"
                  className="w-8 h-8 mt-1 rounded-full bg-blue-100 p-1"
                />
                <div className="text-sm bg-blue-50 border border-blue-300 p-2 sm:p-3 rounded-xl shadow-sm max-w-[90vw] sm:max-w-xl break-words">
                  <span className="font-semibold text-blue-800 mb-1 block">
                    Guardline Agent
                  </span>
                  <p>Detected Mismatch</p>
                  <p>
                    Your question seems related to aircraft N775AS. Want to
                    switch?
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
              </div> */}
              <div className="flex items-center justify-center h-full">
                <LoadingSpinner />
              </div>
            </>
          )}
          <div ref={messagesEndRef} />
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
  );
}
