import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, X, Phone, Video, Users, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: Date;
  isCurrentUser: boolean;
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

interface ChatWindowProps {
  isOpen?: boolean;
  onClose: () => void;
  selectedContacts?: Contact[];
  contacts?: Contact[];
  currentUserId?: string;
}

export default function ChatWindow({
  isOpen = true,
  onClose,
  selectedContacts,
  contacts,
  currentUserId,
}: ChatWindowProps) {
  // Use contacts prop if provided, otherwise fall back to selectedContacts
  const activeContacts = contacts || selectedContacts || [];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [renderedMessageIds, setRenderedMessageIds] = useState<Set<string>>(
    new Set(),
  );
  const [participantNames, setParticipantNames] = useState<Map<string, string>>(
    new Map(),
  );
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [chatTitle, setChatTitle] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch user information by userId
  const fetchUserInfo = async (userId: string) => {
    try {
      const response = await fetch(`/api/contacts/all`);
      if (response.ok) {
        const contacts = await response.json();
        const user = contacts.find(
          (contact: any) => contact.contactId === userId,
        );
        if (user) {
          // Return a meaningful display name: use name if available, otherwise email or phone
          if (user.name && user.name.trim() && user.name !== 'Unknown') {
            return user.name;
          } else if (user.email) {
            return user.email;
          } else if (user.phone) {
            return user.phone;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
    return null;
  };

  // Fetch conversation history using external API
  const fetchConversationHistory = async (conversationId: string) => {
    if (!currentUserId) return [];

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

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data?.messages) {
          return result.data.messages.map((msg: any) => ({
            id: msg.id,
            senderId: msg.senderId,
            senderName: msg.senderName || 'Unknown',
            message: msg.content,
            timestamp: new Date(msg.sentAt),
            isCurrentUser: msg.senderId === currentUserId,
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching conversation history:', error);
    }
    return [];
  };

  // Generate conversation ID based on chat type
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

  // Fetch group information using external API
  const fetchGroupInfo = async (groupId: string, userId: string) => {
    try {
      const response = await fetch(
        `/api/UserGroups/${groupId}?userId=${userId}`,
      );
      if (response.ok) {
        const groupData = await response.json();
        if (groupData.success && groupData.data) {
          return {
            id: groupData.data.id,
            name: groupData.data.name,
            description: groupData.data.description,
            memberCount: groupData.data.memberCount,
            members: groupData.data.members || [],
          };
        }
      }
    } catch (error) {
      console.error('Error fetching group info:', error);
    }
    return null;
  };

  // Initialize participant information and load conversation history
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
    console.log('Loading conversation history for:', conversationId);

    const historyMessages = await fetchConversationHistory(conversationId);
    if (historyMessages.length > 0) {
      console.log('Loaded conversation history:', historyMessages);

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

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && activeContacts.length > 0) {
      initializeParticipants();
    }
  }, [isOpen, activeContacts]);

  // Message polling every 2.5 seconds - ONLY when chat window is open and visible
  useEffect(() => {
    if (!isOpen || !activeContacts.length) {
      // Stop polling if chat is closed or no contacts selected
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    const pollMessages = async () => {
      try {
        const response = await fetch('/api/messaging/pull', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            limit: 50,
          }),
        });

        if (response.ok) {
          const result = await response.json();

          if (result.success && result.data?.messages) {
            // Filter messages for this specific conversation
            const conversationMessages = result.data.messages.filter(
              (msg: any) => {
                if (activeContacts.length === 0) return false;

                const contact = activeContacts[0];

                if (contact.messageType === 'Group' && contact.groupId) {
                  // For group chats, show only messages with matching groupId
                  return (
                    msg.messageType === 'Group' &&
                    msg.groupId === contact.groupId
                  );
                } else if (contact.messageType === 'DirectUser') {
                  // For direct messages, show messages between current user and the contact
                  const contactUserId =
                    (contact as any).contactId || contact.id.toString();
                  return (
                    msg.messageType === 'DirectUser' &&
                    ((msg.senderId === contactUserId && currentUserId) ||
                      (msg.senderId === currentUserId && contactUserId))
                  );
                }

                return false;
              },
            );

            // Process new messages that haven't been rendered yet
            const newMessages = conversationMessages.filter(
              (msg: any) => !renderedMessageIds.has(msg.id),
            );

            if (newMessages.length > 0) {
              const formattedMessages: ChatMessage[] = newMessages.map(
                (msg: any) => {
                  // Get the display name for the sender
                  let displayName =
                    msg.senderName && msg.senderName.trim()
                      ? msg.senderName.trim()
                      : 'Unknown';

                  if (msg.messageType === 'DirectUser') {
                    // For direct messages, use participant names if available
                    const participantName = participantNames.get(msg.senderId);
                    if (participantName) {
                      displayName = participantName;
                    } else {
                      // If no participant name, try to get from contact info
                      const contact = activeContacts.find(
                        (c) => c.contactId === msg.senderId,
                      );
                      if (contact) {
                        if (contact.email) {
                          displayName = contact.email;
                        } else if (contact.phone) {
                          displayName = contact.phone;
                        }
                      }
                    }
                  } else if (msg.messageType === 'Group') {
                    // For group messages, use group member names if available
                    const participantName = participantNames.get(msg.senderId);
                    if (participantName) {
                      displayName = participantName;
                    }
                  }

                  const isCurrentUser = msg.senderId === currentUserId;

                  return {
                    id: msg.id,
                    senderId: msg.senderId || '',
                    senderName: displayName,
                    message: msg.content || '',
                    timestamp: new Date(msg.sentAt || Date.now()),
                    isCurrentUser,
                  };
                },
              );

              setMessages((prev) => {
                // Remove duplicates by message ID
                const existingIds = new Set(prev.map((msg) => msg.id));
                const uniqueNewMessages = formattedMessages.filter(
                  (msg) => !existingIds.has(msg.id),
                );

                // Combine and sort all messages chronologically
                const allMessages = [...prev, ...uniqueNewMessages];
                return allMessages.sort(
                  (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
                );
              });

              // Track rendered message IDs
              const newIds = new Set(renderedMessageIds);
              formattedMessages.forEach((msg) => newIds.add(msg.id));
              setRenderedMessageIds(newIds);
            }
          }
        }
      } catch (error) {
        console.error('Error polling messages:', error);
      }
    };

    // Start polling only when chat is active
    pollMessages(); // Initial poll
    pollingIntervalRef.current = setInterval(pollMessages, 2500); // Every 2.5 seconds

    // Cleanup polling when chat closes or contacts change
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [
    isOpen,
    activeContacts.length,
    renderedMessageIds,
    participantNames,
    groupInfo,
    currentUserId,
  ]);

  const sendMessage = async () => {
    if (!newMessage.trim() || isLoading) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setIsLoading(true);

    // Add message optimistically to UI
    const tempMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      senderId: currentUserId || 'current-user',
      senderName: 'You',
      message: messageText,
      timestamp: new Date(),
      isCurrentUser: true,
    };

    setMessages((prev) => [...prev, tempMessage]);

    try {
      // Format recipients for External API - use contactId when available, emails only as fallback
      const recipientUserIds = activeContacts
        .filter((contact) => (contact as any).contactId) // Only contacts with contactId
        .map((contact) => (contact as any).contactId);

      // Only include emails for contacts that don't have contactId
      const recipientEmails = activeContacts
        .filter((contact) => !(contact as any).contactId && contact.email) // No contactId but has email
        .map((contact) => contact.email);

      // Generate conversation ID for this chat session
      const conversationId = `chat_${activeContacts
        .map((c) => c.id)
        .sort()
        .join('_')}`;

      // Call External API /api/Messaging/send
      const response = await fetch('/api/messaging/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: messageText,
          recipientUserIds: recipientUserIds,
          recipientEmails: recipientEmails,
          conversationId: conversationId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const result = await response.json();

      // Update the temp message with actual response data
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempMessage.id
            ? { ...msg, id: result.messageId || tempMessage.id }
            : msg,
        ),
      );
    } catch (error: any) {
      console.error('Error sending message:', error);

      // Remove the failed message from UI
      setMessages((prev) => prev.filter((msg) => msg.id !== tempMessage.id));

      toast({
        title: 'Failed to send message',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });

      // Restore the message text to input
      setNewMessage(messageText);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl max-h-[80vh] h-[600px] bg-white rounded-lg shadow-lg flex flex-col">
        {/* Fixed Header */}
        <div className="flex-none flex flex-row items-center justify-between p-4 border-b bg-white rounded-t-lg">
          <div className="flex items-center space-x-3">
            <Users className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold">
              {chatTitle ||
                `Chat with ${activeContacts.length} contact${
                  activeContacts.length > 1 ? 's' : ''
                }`}
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Video className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Fixed Participants */}
        <div className="flex-none px-4 py-2 border-b bg-gray-50">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span>Participants:</span>
            <div className="flex items-center space-x-1">
              {groupInfo && groupInfo.members.length > 0
                ? // Show group members for group chats
                  groupInfo.members.map((member, index) => (
                    <span
                      key={member.userId}
                      className="inline-flex items-center"
                    >
                      {`${member.firstName} ${member.lastName}`.trim()}
                      {index < groupInfo.members.length - 1 && ', '}
                    </span>
                  ))
                : participantNames.size > 0
                ? // Show participant names for direct messages
                  Array.from(participantNames.values()).map(
                    (name, index, array) => (
                      <span key={index} className="inline-flex items-center">
                        {name}
                        {index < array.length - 1 && ', '}
                      </span>
                    ),
                  )
                : // Fallback to contact names
                  activeContacts.map((contact, index) => (
                    <span key={contact.id} className="inline-flex items-center">
                      {contact.name}
                      {index < activeContacts.length - 1 && ', '}
                    </span>
                  ))}
            </div>
          </div>
        </div>

        {/* Scrollable Messages Area */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>Start a conversation with your contacts</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.isCurrentUser ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`flex items-start space-x-2 max-w-xs lg:max-w-md ${
                      message.isCurrentUser
                        ? 'flex-row-reverse space-x-reverse'
                        : ''
                    }`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {getInitials(message.senderName)}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`rounded-lg px-3 py-2 ${
                        message.isCurrentUser
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{message.message}</p>
                      <div
                        className={`flex items-center justify-between mt-1 ${
                          message.isCurrentUser
                            ? 'text-blue-100'
                            : 'text-gray-500'
                        }`}
                      >
                        <p className="text-xs">
                          {message.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        {message.isCurrentUser && (
                          <Check className="h-3 w-3 ml-1" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Fixed Message Input */}
        <div className="flex-none border-t p-4 bg-white rounded-b-lg">
          <div className="flex items-center space-x-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim() || isLoading}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
