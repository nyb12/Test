// components/Dashboard/ChatWindow.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import EmojiPicker from 'emoji-picker-react';
import TimeAgo from '@/utils/TimeAgo';
import axios from 'axios';
import {
  File,
  FileText,
  Trash,
  Upload,
  User,
  UserPlus,
  Image,
  Video,
  Music,
  Archive,
} from 'lucide-react';
import FileDisplay from '@/components/FileDisplay';
import { FileInfo } from '@/utils/fileUtils';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarShortcut,
  MenubarTrigger,
} from '@/components/ui/menubar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  call,
  clip,
  emoji,
  extend,
  mic,
  threehorizontaldots,
  videocall,
} from '@/components/svg';
import { getUserInitials } from '@/utils/helper';
import { TooltipArrow } from '@radix-ui/react-tooltip';
import { useToast } from '@/hooks/use-toast';

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
  id: number;
  name: string;
  email: string;
  phone?: string;
  contactId?: string;
  groupId?: string;
  messageType?: string;
  groupName?: string;
}

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

interface ChatWindowProps {
  isOpen?: boolean;
  selectedChatIndex: number;
  message: string;
  setMessage: (val: string) => void;
  showEmojiPicker: boolean;
  setShowEmojiPicker: (val: boolean) => void;
  handleEmojiClick: (emojiData: any) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  pickerRef: React.RefObject<HTMLDivElement>;
  emojiBtnRef: React.RefObject<HTMLButtonElement>;
  contacts: any[];
  contactsLoading: boolean;
  contactsError: boolean;
  selectedAircraft: any;
  onAircraftSelect: (aircraft: any) => void;
  currentUserId: string;
}

export default function ChatWindow({
  isOpen = true,
  selectedChatIndex,
  message,
  setMessage,
  showEmojiPicker,
  setShowEmojiPicker,
  handleEmojiClick,
  fileInputRef,
  pickerRef,
  emojiBtnRef,
  contacts,
  contactsLoading,
  contactsError,
  selectedAircraft,
  onAircraftSelect,
  currentUserId,
}: ChatWindowProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatTitle, setChatTitle] = useState('');
  const [participantNames, setParticipantNames] = useState<Map<string, string>>(
    new Map(),
  );
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [renderedMessageIds, setRenderedMessageIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleEmojiClickWrapper = (emojiData: any) => {
    handleEmojiClick(emojiData);
  };

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

  // File display component

  const selectedChat = contacts[selectedChatIndex];
  const activeContacts = contacts || selectedChat || [];

  const generateConversationId = (contact: Contact): string => {
    if (contact.messageType === 'Group' && contact.groupId) {
      return `group:${contact.groupId}`;
    } else {
      // For direct messages, create conversation ID with user IDs in consistent order
      const otherUserId = contact.contactId || contact.id.toString();
      const userIds = [currentUserId, otherUserId].sort();
      return `dm:${userIds.join('_')}`;
    }
  };

  const conversationId = selectedChat
    ? generateConversationId(selectedChat)
    : '';

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
    if (!conversationId || !currentUserId) {
      return [];
    }
    try {
      const requestBody = {
        userId: currentUserId,
        page: 1,
        pageSize: 100,
      };

      const response = await fetch(
        `/api/messaging/conversation/${conversationId}/history`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        },
      );

      if (!response.ok) {
        return [];
      }
      const result = await response.json();
      if (result.success && Array.isArray(result.data?.messages)) {
        return result.data.messages.map(
          (msg: any): ChatMessage => ({
            id: msg.id,
            senderId: msg.senderId,
            senderName: msg.senderName || 'Unknown',
            message: msg.content,
            timestamp: new Date(msg.sentAt),
            isCurrentUser: msg.senderId === currentUserId,
            conversationId: conversationId || msg.conversationId || '',
            metadata: msg.metadata,
          }),
        );
      }
    } catch (err) {
      console.error('Error fetching conversation:', err);
    }
    return [];
  };

  useEffect(() => {
    const initializeChat = async () => {
      setMessages([]);
      setParticipantNames(new Map());
      setGroupInfo(null);
      setRenderedMessageIds(new Set());

      if (selectedChat?.messageType === 'Group') {
        const group = await fetchGroupInfo(selectedChat.groupId, currentUserId);
        if (group) {
          setGroupInfo(group);
          const map = new Map();
          group.members.forEach((m: GroupMember) => {
            map.set(m.userId, `${m.firstName} ${m.lastName}`);
          });
          setParticipantNames(map);
        }
      } else if (selectedChat) {
        const name = await fetchUserInfo(
          selectedChat.contactId || selectedChat.id.toString(),
        );
        setParticipantNames(new Map([[selectedChat.id.toString(), name]]));
      }

      const history = await fetchConversationHistory();
      const typedHistory: ChatMessage[] = Array.isArray(history) ? history : [];
      setMessages(typedHistory);
      setRenderedMessageIds(new Set(typedHistory.map((m) => m.id)));
    };

    if (selectedChat && currentUserId) {
      initializeChat();
    }
  }, [selectedChatIndex, selectedChat, currentUserId]);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/api/messaging/pull', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit: 50 }),
        });
        const result = await res.json();
        let newMsgs = (result.data?.messages || []).filter(
          (msg: any) => !renderedMessageIds.has(msg.id),
        );

        // Filter messages for current chat only
        if (selectedChat) {
          if (selectedChat.messageType === 'Group') {
            // Only messages for the selected group
            newMsgs = newMsgs.filter(
              (msg: any) =>
                msg.groupId === selectedChat.groupId &&
                msg.messageType === 'Group',
            );
          } else {
            // Only messages from/to the selected contact
            newMsgs = newMsgs.filter(
              (msg: any) =>
                (msg.senderId === selectedChat.contactId ||
                  msg.senderId === currentUserId) &&
                msg.messageType === 'DirectUser',
            );
          }
        }

        const formatted = newMsgs.map(
          (msg: any): ChatMessage => ({
            id: msg.id,
            senderId: msg.senderId,
            senderName:
              participantNames.get(msg.senderId) || msg.senderName || 'Unknown',
            message: msg.content,
            timestamp: new Date(msg.sentAt),
            isCurrentUser: msg.senderId === currentUserId,
            conversationId: conversationId || msg.conversationId || '',
            metadata: msg.metadata,
          }),
        );
        if (formatted.length) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m: ChatMessage) => m.id));
            return [
              ...prev,
              ...formatted.filter((m: ChatMessage) => !existingIds.has(m.id)),
            ];
          });
          const ids = new Set(renderedMessageIds);
          formatted.forEach((m: ChatMessage) => ids.add(m.id));
          setRenderedMessageIds(ids);
        }
      } catch (e) {
        console.error('Polling failed:', e);
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
    selectedChat,
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

  useEffect(() => {
    if (isOpen && activeContacts.length > 0) {
      initializeParticipants();
    }
  }, [isOpen, activeContacts]);

  const initializeParticipants = async () => {
    if (activeContacts.length === 0) return;

    const contact = activeContacts[0];

    if (contact.messageType === 'Group' && contact.groupId) {
      // Group chat - fetch group information
      const groupData = await fetchGroupInfo(
        contact.groupId,
        currentUserId || '',
      );
      if (groupData) {
        setGroupInfo(groupData);
        setChatTitle(`${groupData.name} (${groupData.memberCount} members)`);

        // Create participant names map
        const namesMap = new Map<string, string>();
        groupData.members.forEach((member: GroupMember) => {
          const fullName = `${member.firstName} ${member.lastName}`.trim();
          namesMap.set(member.userId, fullName);
        });
        setParticipantNames(namesMap);
      } else {
        setChatTitle(contact.groupName || contact.name || 'Group Chat');
      }
    } else if (contact.messageType === 'DirectUser') {
      // Direct message - fetch user info
      const userName = await fetchUserInfo(contact.id.toString());
      if (userName) {
        const namesMap = new Map<string, string>();
        namesMap.set(contact.id.toString(), userName);
        setParticipantNames(namesMap);
        setChatTitle(`Chat with ${userName}`);
      } else {
        setChatTitle(`Chat with ${contact.name}`);
      }
    } else {
      // Fallback to contact names
      setChatTitle(
        `Chat with ${activeContacts.length} contact${
          activeContacts.length > 1 ? 's' : ''
        }`,
      );
    }

    // Load conversation history
    const conversationId = generateConversationId(contact);

    const historyMessages = await fetchConversationHistory();
    if (historyMessages.length > 0) {
      // Sort messages chronologically (oldest first)
      const sortedMessages = [...historyMessages].sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
      );

      setMessages(sortedMessages);

      // Track rendered message IDs to avoid duplication
      const messageIds = new Set(sortedMessages.map((msg) => msg.id as string));
      setRenderedMessageIds(messageIds);
    }
  };

  // --- Message sending logic injection start ---

  const sendMessage = async () => {
    if ((!message.trim() && selectedFiles.length === 0) || isLoading) return;

    const messageText = message.trim();
    setMessage('');
    setIsLoading(true);
    setIsUploading(true);

    const tempMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      senderId: currentUserId || 'current-user',
      senderName: 'You',
      message: messageText,
      timestamp: new Date(),
      isCurrentUser: true,
      conversationId: conversationId || '',
      metadata:
        selectedFiles.length > 0
          ? {
              Files: selectedFiles.map((file) => ({
                FileUrl: URL.createObjectURL(file), // Create object URL for immediate preview
                FileName: file.name,
                FileType: file.type,
              })),
            }
          : undefined,
    };

    setMessages((prev) => [...prev, tempMessage]);

    try {
      const selected = contacts[selectedChatIndex];
      const activeContacts = selected ? [selected] : [];

      const recipientUserIds = activeContacts
        .filter((contact) => (contact as any).contactId)
        .map((contact) => (contact as any).contactId);

      const recipientEmails = activeContacts
        .filter((contact) => !(contact as any).contactId && contact.email)
        .map((contact) => contact.email);

      const formData = new FormData();

      // Add the request data
      const requestData = {
        senderId: currentUserId || '',
        content: messageText,
        recipientUserIds: recipientUserIds,
        recipientEmails: recipientEmails,
        conversationId: conversationId,
      };

      formData.append('request', JSON.stringify(requestData));

      // Add files if any
      if (selectedFiles.length > 0) {
        selectedFiles.forEach((file) => {
          formData.append('files', file);
        });
      }

      const response = await axios.post('/api/messaging/send', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.status !== 200) {
        throw new Error('Failed to send message');
      }

      const result = response.data;

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempMessage.id
            ? {
                ...msg,
                id: result.messageId || tempMessage.id,
                metadata: (() => {
                  const serverMetadata =
                    result.metadata || result.data?.metadata;
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

      setMessages((prev) => prev.filter((msg) => msg.id !== tempMessage.id));

      if (typeof toast === 'function') {
        toast({
          title: 'Failed to send message',
          description: error.message || 'Please try again',
          variant: 'destructive',
        });
      }

      setMessage(messageText);
    } finally {
      setIsLoading(false);
      setIsUploading(false);
      setSelectedFiles([]);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    // Validate file sizes (max 50MB per file)
    const maxSize = 50 * 1024 * 1024; // 50MB
    const validFiles = files.filter((file) => {
      if (file.size > maxSize) {
        toast({
          title: 'File too large',
          description: `File ${file.name} is too large. Maximum size is 50MB.`,
          variant: 'destructive',
        });
        return false;
      }
      return true;
    });

    setSelectedFiles(validFiles);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Custom upload click handler that triggers the file input
  const handleFileUploadClick = () => {
    if (!isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  // --- Message sending logic injection end ---

  return (
    <div className="hidden md:flex bg-white rounded-2xl lg:rounded-r-2xl lg:rounded-l-none shadow p-3 sm:p-4 md:p-6 flex-col w-full min-w-0 flex-1">
      {!selectedChat ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          {contactsLoading
            ? 'Loading contacts...'
            : contactsError
            ? 'Failed to load contacts.'
            : 'Select a contact to start chatting.'}
        </div>
      ) : (
        <>
          <div className="flex flex-row items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-3">
              {selectedChat.avatar ? (
                <img
                  src={selectedChat.avatar}
                  alt={selectedChat.name || selectedChat.email || 'Contact'}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full mr-2 flex-shrink-0 object-cover"
                />
              ) : (
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full mr-2 flex-shrink-0 bg-gray-300 flex items-center justify-center text-xs sm:text-sm font-semibold text-white uppercase">
                  {(() => {
                    const n =
                      selectedChat.name ||
                      selectedChat.email ||
                      selectedChat.phone ||
                      '';
                    const parts = n.split(/\s|@/).filter(Boolean);
                    if (parts.length === 1)
                      return parts[0].slice(0, 2).toUpperCase();
                    return (parts[0][0] + (parts[1][0] || '')).toUpperCase();
                  })()}
                </div>
              )}
              <div>
                {(() => {
                  const displayName =
                    selectedChat.name?.length > 0
                      ? selectedChat.name
                      : selectedChat.email?.length > 0
                      ? selectedChat.email
                      : selectedChat.phone || 'Contact';
                  return (
                    <div className="text-xs sm:text-sm font-semibold text-gray-800 truncate max-w-[180px] sm:max-w-[100px]">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-default truncate inline-block max-w-full">
                            {displayName}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{displayName}</p>
                          <TooltipArrow className="fill-current text-white" />
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  );
                })()}

                {selectedChat?.role && (
                  <div className="text-[11px] sm:text-xs text-gray-500">
                    {selectedChat?.role || ''}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button className="p-2 hover:bg-gray-100 rounded-full">
                <img src={call} alt="call" className="w-5 h-5" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-full">
                <img src={videocall} alt="videocall" className="w-5 h-5" />
              </button>
              <Menubar className="p-2 hover:bg-gray-100 rounded-full border-none gap-0">
                <MenubarMenu>
                  <MenubarTrigger>
                    <img
                      src={threehorizontaldots}
                      alt="menu"
                      className="w-5 h-5"
                    />
                  </MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem>
                      View Profile{' '}
                      <MenubarShortcut>
                        <User />
                      </MenubarShortcut>
                    </MenubarItem>
                    <MenubarItem>
                      Add User{' '}
                      <MenubarShortcut>
                        <UserPlus />
                      </MenubarShortcut>
                    </MenubarItem>
                    <MenubarItem>
                      View Docs{' '}
                      <MenubarShortcut>
                        <File />
                      </MenubarShortcut>
                    </MenubarItem>
                    <MenubarItem>
                      View Summary{' '}
                      <MenubarShortcut>
                        <FileText />
                      </MenubarShortcut>
                    </MenubarItem>
                    <MenubarItem>
                      Share Summary{' '}
                      <MenubarShortcut>
                        <Upload />
                      </MenubarShortcut>
                    </MenubarItem>
                    <MenubarItem>
                      Delete Chat{' '}
                      <MenubarShortcut>
                        <Trash />
                      </MenubarShortcut>
                    </MenubarItem>
                  </MenubarContent>
                </MenubarMenu>
              </Menubar>
              <button
                className="flex items-center gap-1 hover:bg-gray-100 rounded-md p-1"
                onClick={() => (window.location.href = '/chats')}
              >
                <img src={extend} alt="extend" className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 max-h-40 overflow-y-auto p-4 space-y-3">
            {messages.filter((msg) => msg.conversationId === conversationId)
              .length > 0 ? (
              [
                ...messages.filter(
                  (msg) => msg.conversationId === conversationId,
                ),
              ]
                .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
                .map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.isCurrentUser ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] p-2 rounded-xl ${
                        msg.isCurrentUser
                          ? 'bg-gray-200 text-gray-900'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <div className="text-sm whitespace-pre-wrap">
                        {msg.message}
                      </div>
                      <FileDisplay metadata={msg.metadata} />
                      <div className="text-xs text-gray-400 mt-1 text-right">
                        <TimeAgo timestamp={msg.timestamp} />
                      </div>
                    </div>
                  </div>
                ))
            ) : (
              <div className="flex items-center justify-center text-gray-500">
                No messages yet. Start a conversation!
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* File display area */}
          {selectedFiles.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2 p-2 bg-gray-50 rounded-md">
              {selectedFiles.map((file, index) => {
                const getFileIcon = (fileType: string) => {
                  if (fileType.startsWith('image/'))
                    return <Image className="w-4 h-4 text-blue-500" />;
                  if (fileType.startsWith('video/'))
                    return <Video className="w-4 h-4 text-purple-500" />;
                  if (fileType.startsWith('audio/'))
                    return <Music className="w-4 h-4 text-green-500" />;
                  if (fileType.includes('pdf') || fileType.includes('document'))
                    return <FileText className="w-4 h-4 text-red-500" />;
                  if (
                    fileType.includes('zip') ||
                    fileType.includes('rar') ||
                    fileType.includes('tar')
                  )
                    return <Archive className="w-4 h-4 text-orange-500" />;
                  return <File className="w-4 h-4 text-gray-500" />;
                };

                return (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-white p-2 rounded border"
                  >
                    {getFileIcon(file.type)}
                    <span className="text-sm text-gray-600 truncate max-w-32">
                      {file.name}
                    </span>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            className="hidden"
            accept="*/*"
          />

          <div className="mt-3 sm:mt-4 flex items-center border rounded-xl px-1 sm:px-3 py-2 bg-white relative">
            <button
              className="text-2xl mr-1 sm:mr-2 text-gray-500 hover:bg-gray-100 rounded-full p-1 sm:p-2 min-w-[36px] relative"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              ref={emojiBtnRef}
            >
              <img src={emoji} alt="emoji" className="w-5 h-5" />
              {showEmojiPicker && (
                <div
                  ref={pickerRef}
                  className="absolute bottom-full mb-2 z-50 shadow-lg"
                  style={{
                    zIndex: 9999,
                    position: 'absolute',
                    bottom: '100%',
                    left: '0px',
                    marginBottom: '8px',
                  }}
                >
                  <EmojiPicker
                    onEmojiClick={handleEmojiClickWrapper}
                    theme={'light' as any}
                    height={350}
                    width={300}
                  />
                </div>
              )}
            </button>
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask anything..."
              disabled={isUploading}
              className={`flex-1 min-w-0 border-none bg-transparent outline-none text-sm text-gray-700 placeholder:text-gray-400 ${
                isUploading ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
            />
            <button
              className={`ml-1 sm:ml-2 text-gray-500 hover:text-black hover:bg-gray-100 rounded-full p-1 sm:p-2 min-w-[36px] ${
                isUploading ? 'cursor-not-allowed opacity-50' : ''
              }`}
              onClick={handleFileUploadClick}
            >
              <img src={clip} alt="clip" className="w-5 h-5" />
            </button>
            <button className="ml-1 sm:ml-2 text-gray-500 hover:text-black hover:bg-gray-100 rounded-full p-1 sm:p-2 min-w-[36px]">
              <img src={mic} alt="mic" className="w-5 h-5" />
            </button>
            <button
              onClick={() => sendMessage()}
              disabled={isUploading}
              className={`ml-1 sm:ml-2 text-white rounded-md p-1 sm:p-2 w-8 sm:w-9 h-8 sm:h-9 flex items-center justify-center min-w-[36px] ${
                isUploading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-[#16213E] hover:bg-[#1b254b]'
              }`}
            >
              {isUploading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 10l7-7m0 0l7 7m-7-7v18"
                  />
                </svg>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
