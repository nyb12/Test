import { useState, useEffect } from 'react';
import {
  X,
  Search,
  Send,
  Phone,
  VideoIcon,
  Plus,
  Users,
  User,
  ArrowLeft,
  UserPlus,
  UsersIcon,
  Loader2,
  Hash,
  Zap,
  MessageCircle,
  Eye,
  ChevronDown,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Move type definitions and helper functions outside component
interface Contact {
  id?: string | number;
  contactId?: string | number;
  name?: string;
  contactFirstName?: string;
  contactLastName?: string;
  email?: string;
  contactEmail?: string;
  phone?: string;
  contactPhone?: string;
  isGroup?: boolean;
  memberCount?: number;
  isOnline?: boolean;
}

interface FullScreenChatInterfaceProps {
  selectedContacts: Contact[];
  contacts: any[];
  onClose: () => void;
  currentUserId?: number | string;
  onNavigateToTool?: (toolName: string) => void;
}

// Helper function for safe date formatting
const formatMessageTime = (timestamp: string | null | undefined): string => {
  try {
    if (!timestamp) return 'Now';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Now';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Now';
  }
};

function truncateContactName(name: string) {
  if (name.length > 10) {
    return name.substring(0, 10) + '...';
  }
  return name;
}

function truncateEmail(email: string) {
  if (!email) return '';
  if (email.length > 20) {
    const atIndex = email.indexOf('@');
    if (atIndex > 0) {
      const username = email.substring(0, atIndex);
      const domain = email.substring(atIndex);
      return username.substring(0, 2) + '...' + domain;
    }
    return email.substring(0, 17) + '...';
  }
  return email;
}

// Helper function to extract message preview from messages
const getMessagePreview = (messages: any[], conversationId: string): string => {
  // Find non-summary messages in the conversation
  const conversationMessages = messages.filter(
    (msg) =>
      msg.conversationId === conversationId && !msg.content?.includes('📋 **'), // Filter out summary messages
  );

  if (conversationMessages.length === 0) return '';

  // Get the first actual message content
  const firstMessage = conversationMessages[0];
  const content = firstMessage.content || '';

  // Truncate to 60 characters for preview
  return content.length > 60 ? content.substring(0, 57) + '...' : content;
};

// Helper function to filter contacts
const filterContacts = (contacts: Contact[], searchQuery: string) => {
  return Array.isArray(contacts)
    ? contacts.filter((contact) => {
        const name =
          contact?.name ||
          `${contact?.contactFirstName || ''} ${
            contact?.contactLastName || ''
          }`.trim();
        const email = contact?.email || contact?.contactEmail || '';
        const phone = contact?.phone || contact?.contactPhone || '';

        return (
          name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          phone.includes(searchQuery)
        );
      })
    : [];
};

export default function FullScreenChatInterface({
  selectedContacts: initialSelectedContacts = [],
  contacts: initialContacts = [],
  onClose,
  currentUserId,
  onNavigateToTool,
}: FullScreenChatInterfaceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [conversationMessages, setConversationMessages] = useState<
    Record<string, any[]>
  >({});
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newContactData, setNewContactData] = useState({
    email: '',
    phone: '',
    hasConsent: false,
  });
  const [newGroupData, setNewGroupData] = useState({
    name: '',
    description: '',
    selectedMembers: [] as string[],
  });
  const [availableContacts, setAvailableContacts] = useState<any[]>([]);
  const [userGroups, setUserGroups] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [animatingSummary, setAnimatingSummary] = useState<number | null>(null);
  const [tools, setTools] = useState<any[]>([]);
  const [summaries, setSummaries] = useState<any[]>([]);
  const [summarySearchQuery, setSummarySearchQuery] = useState('');

  const [viewingConversation, setViewingConversation] = useState<any>(null);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const { toast } = useToast();
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(
    null,
  );

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Cleanup polling when component unmounts
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Dynamic icon renderer for Lucide icons from database
  const renderIcon = (iconName: string, className: string = 'w-4 h-4') => {
    if (!iconName) return <LucideIcons.Settings className={className} />;

    // Convert kebab-case to PascalCase for Lucide React components
    const iconKey = iconName
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');

    const IconComponent = (LucideIcons as any)[iconKey];

    if (IconComponent) {
      return <IconComponent className={className} />;
    }

    console.log('Icon not found, using fallback:', iconName);
    // Fallback to Settings icon if not found
    return <LucideIcons.Settings className={className} />;
  };

  // Handle navigation to different tools
  const handleToolNavigation = (toolName: string) => {
    if (onNavigateToTool) {
      onNavigateToTool(toolName);
    }
    onClose(); // Close chat interface
  };

  // Initialize with first contact if available
  useEffect(() => {
    if (initialSelectedContacts.length > 0 && !selectedConversation) {
      setSelectedConversation(initialSelectedContacts[0]);
    }
  }, [initialSelectedContacts, selectedConversation]);

  const startMessagePolling = () => {
    // Clear any existing polling interval
    stopMessagePolling();

    // Immediately poll once for instant message display
    pollForNewMessages();

    // Start polling every 2.5 seconds for faster real-time updates on chat page
    const interval = setInterval(() => {
      pollForNewMessages();
    }, 2500);

    setPollingInterval(interval);
  };

  const stopMessagePolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  };

  const pollForNewMessages = async () => {
    if (!selectedConversation) return;

    try {
      // Use message pull API instead of conversation history for polling
      const response = await fetch('/api/messaging/pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          limit: 50,
        }),
      });

      if (response.ok) {
        const result = await response.json();

        if (
          result.success &&
          result.data?.messages &&
          result.data.messages.length > 0
        ) {
          // Filter messages for current conversation
          const conversationId =
            selectedConversation.id || selectedConversation.contactId;
          const conversationMessages = result.data.messages.filter(
            (msg: any) => {
              // For direct messages, check if message is between current user and selected contact
              if (selectedConversation.contactId) {
                return (
                  msg.messageType === 'DirectUser' &&
                  (msg.senderId === selectedConversation.contactId ||
                    (msg.senderId === currentUserId &&
                      msg.recipientId === selectedConversation.contactId))
                );
              }
              // For groups, check if message belongs to this group
              else if (
                selectedConversation.isGroup ||
                selectedConversation.type === 'group'
              ) {
                const groupId = selectedConversation.id;
                return msg.messageType === 'Group' && msg.groupId === groupId;
              }
              return false;
            },
          );

          if (conversationMessages.length > 0) {
            // Transform and add new messages
            const newMessages = conversationMessages.map((msg: any) => ({
              id: msg.id || msg.messageId,
              message: msg.content || msg.message,
              content: msg.content || msg.message,
              isCurrentUser: msg.senderId === currentUserId,
              timestamp: new Date(msg.sentAt || msg.timestamp),
              isSummary: false,
              senderId: msg.senderId,
              senderName: msg.senderName,
            }));

            // Update messages state
            setMessages((prev) => {
              const existingIds = new Set(prev.map((m: any) => m.id));
              const uniqueNewMessages = newMessages.filter(
                (m: any) => !existingIds.has(m.id),
              );
              return [...prev, ...uniqueNewMessages];
            });

            // Update conversation storage
            setConversationMessages((prev) => ({
              ...prev,
              [conversationId]: [
                ...(prev[conversationId] || []),
                ...newMessages.filter(
                  (m: any) =>
                    !prev[conversationId]?.some(
                      (existing: any) => existing.id === m.id,
                    ),
                ),
              ],
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error polling for new messages:', error);
    }
  };

  // Load conversation messages when conversation changes
  useEffect(() => {
    if (selectedConversation) {
      const conversationKey =
        selectedConversation.id || selectedConversation.contactId;

      // Load from local storage first for immediate display
      setMessages(conversationMessages[conversationKey] || []);

      // Start polling immediately for fast message display
      startMessagePolling();

      // Also load conversation history in parallel (for any missing historical messages)
      if (!conversationMessages[conversationKey]) {
        loadConversationHistory(conversationKey);
      }
    } else {
      // Stop polling when no conversation is selected
      stopMessagePolling();
    }

    return () => {
      stopMessagePolling();
    };
  }, [selectedConversation?.id, selectedConversation?.contactId]);

  const loadConversationHistory = async (conversationId: string) => {
    try {
      const response = await fetch(
        `/api/messaging/conversation/${conversationId}/history`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            userId: currentUserId,
            page: 1,
            pageSize: 100,
          }),
        },
      );

      if (response.ok) {
        const result = await response.json();

        if (result.success && result.data?.messages) {
          // Transform server messages to match our format
          const serverMessages = result.data.messages.map((msg: any) => ({
            id: msg.id || msg.messageId,
            message: msg.content || msg.message,
            content: msg.content || msg.message,
            isCurrentUser: msg.senderId === currentUserId,
            timestamp: new Date(msg.sentAt || msg.timestamp),
            isSummary: false,
            senderId: msg.senderId,
            senderName: msg.senderName,
          }));

          // Update both local state and conversation storage
          setMessages(serverMessages);
          setConversationMessages((prev) => ({
            ...prev,
            [conversationId]: serverMessages,
          }));
        }
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
    }
  };

  // Load contacts, user groups, and tools on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load contacts
        const contactsResponse = await fetch('/api/contacts');
        if (contactsResponse.ok) {
          const contactsData = await contactsResponse.json();
          setAvailableContacts(contactsData || []);
        }

        // Load tools for header icons
        const toolsResponse = await fetch('/api/tools?showWithGreeting=true');
        if (toolsResponse.ok) {
          const toolsData = await toolsResponse.json();
          console.log('Loaded tools for chat header:', toolsData);
          setTools(toolsData || []);
        }

        // Load conversation summaries from all tools
        // Use hardcoded user ID for now since currentUserId prop might be undefined
        const userId = currentUserId || 'b587dc6e-66b1-479e-8014-d69e56ac0173';
        if (userId) {
          const summariesResponse = await fetch(
            `/api/summaries?userId=${userId}`,
            {
              credentials: 'include',
            },
          );
          if (summariesResponse.ok) {
            const summariesData = await summariesResponse.json();
            setSummaries(summariesData.summaries || []);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    // Use hardcoded user ID for now since currentUserId prop might be undefined
    const userId = currentUserId || 'b587dc6e-66b1-479e-8014-d69e56ac0173';

    const loadUserGroups = async () => {
      try {
        console.log('Loading user groups for userId:', userId);
        const response = await fetch('/api/user-groups/list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId,
            pageNumber: 1,
            pageSize: 100,
          }),
        });
        console.log('Groups API response status:', response.status);
        if (response.ok) {
          const groupsData = await response.json();
          console.log('Groups API response data:', groupsData);
          // Fix data structure - groups are nested in data.data.items
          setUserGroups(groupsData?.data?.data?.items || []);
        } else {
          console.error('Groups API failed with status:', response.status);
        }
      } catch (error) {
        console.error('Error loading user groups:', error);
      }
    };

    loadData();
    if (userId) {
      loadUserGroups();
    }
  }, [currentUserId]);

  // Function to refresh summaries (can be called when new summaries are created)
  const refreshSummaries = async () => {
    const userId = currentUserId || 'b587dc6e-66b1-479e-8014-d69e56ac0173';
    if (userId) {
      try {
        const summariesResponse = await fetch(
          `/api/summaries?userId=${userId}`,
          {
            credentials: 'include',
          },
        );
        if (summariesResponse.ok) {
          const summariesData = await summariesResponse.json();
          setSummaries(summariesData.summaries || []);
        }
      } catch (error) {
        console.error('Error refreshing summaries:', error);
      }
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      // Determine if this is a contact (user-to-user) or group message
      const isGroupMessage = selectedConversation.type === 'group';
      const messagePayload: any = {
        content: newMessage,
        conversationId: selectedConversation.id || `chat_${Date.now()}`,
      };

      if (isGroupMessage) {
        // Group message - use group messaging endpoint
        messagePayload.groupIds = [selectedConversation.id];
        messagePayload.recipientUserIds = [];
        messagePayload.recipientEmails = [];
      } else {
        // Direct message to contact
        messagePayload.recipientUserIds = [selectedConversation.contactId];
        messagePayload.recipientEmails = [];
        messagePayload.groupIds = [];
      }

      const response = await fetch('/api/messaging/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(messagePayload),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Message sent successfully:', result);

        // Add message to local state for immediate UI feedback
        const message = {
          id: result.messageId || Date.now(),
          message: newMessage,
          content: newMessage,
          isCurrentUser: true,
          timestamp: new Date(),
          isSummary: false,
        };

        const conversationKey =
          selectedConversation.id || selectedConversation.contactId;

        // Update messages for current conversation
        setMessages((prev) => [...prev, message]);

        // Store in conversation-specific storage
        setConversationMessages((prev) => ({
          ...prev,
          [conversationKey]: [...(prev[conversationKey] || []), message],
        }));

        setNewMessage('');
      } else {
        const error = await response.json();
        console.error('Failed to send message:', error);
        alert('Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please check your connection.');
    }
  };

  const handleNewContact = async () => {
    // Validation: require either email or phone and consent
    if (
      (!newContactData.email && !newContactData.phone) ||
      !newContactData.hasConsent
    ) {
      alert('Either email or phone is required, and consent must be given.');
      return;
    }

    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: newContactData.email || null,
          phone: newContactData.phone || null,
          roleId: 1,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setAvailableContacts((prev) => [...prev, result]);
        setNewContactData({ email: '', phone: '', hasConsent: false });
        setShowNewContactModal(false);

        // Refresh contacts list
        fetch('/api/contacts')
          .then((response) => response.json())
          .then((data) => setAvailableContacts(data || []))
          .catch((error) => console.error('Error refreshing contacts:', error));
      } else {
        const errorData = await response.json();
        console.error('Contact creation failed:', errorData);
        alert('Failed to create contact. Please try again.');
      }
    } catch (error) {
      console.error('Error creating contact:', error);
      alert('Network error. Please check your connection and try again.');
    }
  };

  const handleNewGroup = async () => {
    if (!newGroupData.name.trim()) {
      alert('Please enter a group name');
      return;
    }

    setIsCreatingGroup(true);
    try {
      const response = await fetch('/api/messaging/createGroup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUserId,
          name: newGroupData.name,
          description: newGroupData.description,
          initialMemberIds: newGroupData.selectedMembers,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setNewGroupData({ name: '', description: '', selectedMembers: [] });
          setShowNewGroupModal(false);

          toast({
            title: 'Success',
            description: 'Group created successfully!',
          });

          // Refresh user groups and contacts
          const userId =
            currentUserId || 'b587dc6e-66b1-479e-8014-d69e56ac0173';
          fetch('/api/user-groups/list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: userId,
              pageNumber: 1,
              pageSize: 100,
            }),
          })
            .then((response) => response.json())
            .then((data) => setUserGroups(data?.data?.data?.items || []))
            .catch((error) => console.error('Error refreshing groups:', error));

          fetch('/api/contacts')
            .then((response) => response.json())
            .then((data) => setAvailableContacts(data || []))
            .catch((error) =>
              console.error('Error refreshing contacts:', error),
            );
        }
      } else {
        const errorData = await response.json();
        console.error('Group creation failed:', errorData);
        toast({
          title: 'Error',
          description: 'Failed to create group. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        title: 'Error',
        description:
          'Network error. Please check your connection and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleShareSummary = async (summary: any) => {
    if (!selectedConversation) return;

    setAnimatingSummary(summary.id);

    // Format the summary message using real data
    const summaryText = `📋 **${
      summary.toolContext ? `${summary.toolContext} - ` : ''
    }${summary.summary}**

Created: ${new Date(summary.createdAt).toLocaleDateString()} ${new Date(
      summary.createdAt,
    ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
Messages: ${summary.messageCount}${
      summary.selectedAircraft
        ? `
Aircraft: ${(() => {
            try {
              const aircraft = JSON.parse(summary.selectedAircraft);
              return aircraft.tail_number || 'N/A';
            } catch {
              return 'N/A';
            }
          })()}`
        : ''
    }`;

    // Set the formatted summary as the new message text
    setNewMessage(summaryText);

    // Automatically send the message using existing send function
    try {
      const response = await fetch('/api/messaging/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          content: summaryText,
          recipientUserIds: selectedConversation.isGroup
            ? []
            : [selectedConversation.contactId],
          recipientEmails: [],
          conversationId: selectedConversation.isGroup
            ? selectedConversation.id
            : `chat_${selectedConversation.contactId}`,
        }),
      });

      if (response.ok) {
        const result = await response.json();

        // Add message to local state for immediate UI feedback
        const message = {
          id: result.messageId || Date.now(),
          message: summaryText,
          content: summaryText,
          isCurrentUser: true,
          timestamp: new Date(),
          isSummary: true,
        };

        const conversationKey =
          selectedConversation.id || selectedConversation.contactId;

        // Update messages for current conversation
        setMessages((prev) => [...prev, message]);

        // Store in conversation-specific storage
        setConversationMessages((prev) => ({
          ...prev,
          [conversationKey]: [...(prev[conversationKey] || []), message],
        }));

        setNewMessage('');
      } else {
        const error = await response.json();
        console.error('Failed to send summary:', error);
        alert('Failed to send summary. Please try again.');
      }
    } catch (error) {
      console.error('Error sending summary:', error);
      alert('Failed to send summary. Please check your connection.');
    }

    // Clear animation after delay
    setTimeout(() => setAnimatingSummary(null), 800);
  };

  // Use the helper function to get filtered contacts
  const filteredContacts = filterContacts(initialSelectedContacts, searchQuery);

  // Combine contacts and groups for display with type safety
  const allConversations = [
    ...(Array.isArray(availableContacts) ? availableContacts : []),
    ...(Array.isArray(userGroups)
      ? userGroups.map((group) => ({ ...group, isGroup: true }))
      : []),
  ];

  const filteredConversations = allConversations.filter((item) => {
    if (!item) return false;

    const name =
      item.name ||
      `${item.contactFirstName || ''} ${item.contactLastName || ''}`.trim();
    const email = item.email || item.contactEmail || '';
    const phone = item.phone || item.contactPhone || '';

    return (
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      phone.includes(searchQuery)
    );
  });

  const getTabContent = (tab: string) => {
    switch (tab) {
      case 'all':
        return filteredConversations;
      case 'groups':
        return filteredConversations.filter((item) => item.isGroup);
      case 'direct':
        return filteredConversations.filter((item) => !item.isGroup);
      default:
        return filteredConversations;
    }
  };

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  // Modify the conversation selection to close drawer
  const handleConversationSelect = (conversation: any) => {
    setSelectedConversation(conversation);
    setIsDrawerOpen(false);
  };

  return (
    <div className="h-full w-full bg-white flex flex-col">
      {/* Chat Interface Header - full tools header */}
      <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-white gap-1">
        {/* Desktop view - Button list */}
        <div className="hidden md:flex items-center flex-wrap gap-2">
          {tools.map((tool) => (
            <button
              key={tool.id}
              className={`px-2 py-1 text-xs rounded-full border font-normal transition-colors flex items-center gap-1.5 ${
                tool.name === 'Chat with Others'
                  ? 'border-blue-500 bg-blue-100 text-blue-700'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400'
              }`}
              onClick={
                tool.name === 'Chat with Others'
                  ? undefined
                  : () => handleToolNavigation(tool.name)
              }
            >
              {renderIcon(tool.icon, 'h-4 w-4')}
              <span>{tool.name}</span>
            </button>
          ))}
        </div>

        {/* Mobile/Tablet view - Dropdown menu */}
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2 h-11 mb-2"
              >
                <span className="text-sm">Tools</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {tools.map((tool) => (
                <DropdownMenuItem
                  key={tool.id}
                  className={`flex items-center gap-2 ${
                    tool.name === 'Chat with Others'
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                  onClick={
                    tool.name === 'Chat with Others'
                      ? undefined
                      : () => handleToolNavigation(tool.name)
                  }
                >
                  {renderIcon(tool.icon, 'h-4 w-4')}
                  <span>{tool.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ✅ Mobile-only tab buttons */}
        <div className="flex sm:hidden items-center justify-around border border-gray-200 bg-white shadow-sm rounded-md p-1 mb-2">
          <Button
            variant={activeTab === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              if (activeTab === 'all') {
                toggleDrawer();
              } else {
                setActiveTab('all');
                if (!isDrawerOpen) setIsDrawerOpen(true);
              }
            }}
            className="flex-1 flex items-center justify-center gap-1"
          >
            {renderIcon('message-circle', 'w-4 h-4')}
            <span className="text-xs">All</span>
          </Button>

          <Button
            variant={activeTab === 'groups' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              if (activeTab === 'groups') {
                toggleDrawer();
              } else {
                setActiveTab('groups');
                if (!isDrawerOpen) setIsDrawerOpen(true);
              }
            }}
            className="flex-1 flex items-center justify-center gap-1"
          >
            <Users className="w-4 h-4" />
            <span className="text-xs">Groups</span>
          </Button>

          <Button
            variant={activeTab === 'direct' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              if (activeTab === 'direct') {
                toggleDrawer();
              } else {
                setActiveTab('direct');
                if (!isDrawerOpen) setIsDrawerOpen(true);
              }
            }}
            className="flex-1 flex items-center justify-center gap-1"
          >
            <User className="w-4 h-4" />
            <span className="text-xs">Direct</span>
          </Button>
        </div>

        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 flex overflow-hidden">
        {/* Tab Icons - Vertical */}
        <div className="hidden sm:flex w-12 border-r border-gray-200 bg-gray-100 flex-col items-center py-2 p-1">
          <Button
            variant={activeTab === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              if (activeTab === 'all') {
                toggleDrawer();
              } else {
                setActiveTab('all');
                if (!isDrawerOpen) {
                  setIsDrawerOpen(true);
                }
              }
            }}
            className="w-8 h-8 p-0 mb-2"
          >
            {renderIcon('message-circle', 'w-4 h-4')}
          </Button>
          <Button
            variant={activeTab === 'groups' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              if (activeTab === 'groups') {
                toggleDrawer();
              } else {
                setActiveTab('groups');
                if (!isDrawerOpen) {
                  setIsDrawerOpen(true);
                }
              }
            }}
            className="w-8 h-8 p-0 mb-2"
          >
            <Users className="w-4 h-4" />
          </Button>
          <Button
            variant={activeTab === 'direct' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              if (activeTab === 'direct') {
                toggleDrawer();
              } else {
                setActiveTab('direct');
                if (!isDrawerOpen) {
                  setIsDrawerOpen(true);
                }
              }
            }}
            className="w-8 h-8 p-0 mb-2"
          >
            <User className="w-4 h-4" />
          </Button>
        </div>

        {/* Left Sidebar - Now only closes on explicit actions */}
        <div
          className={`border-r border-gray-200 flex flex-col bg-gray-50 transition-all duration-300 ease-in-out ${
            isDrawerOpen ? 'w-80 opacity-100' : 'w-0 opacity-0 overflow-hidden'
          }`}
        >
          {/* Search and Action Buttons */}
          <div className="p-3 border-b border-gray-200 bg-white shadow-sm">
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 py-1.5 text-sm h-9 border-gray-200 focus:border-blue-300"
                />
              </div>
              <Button
                onClick={() => setShowNewContactModal(true)}
                size="sm"
                className="bg-blue-500 hover:bg-blue-600 text-white border-blue-500 h-9 w-9 p-0 shadow-sm"
              >
                <UserPlus className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => setShowNewGroupModal(true)}
                size="sm"
                className="bg-blue-500 hover:bg-blue-600 text-white border-blue-500 h-9 w-9 p-0 shadow-sm"
              >
                <Users className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Conversations List - 50% height */}
          <div
            className="flex-1 overflow-y-auto px-2 py-3"
            style={{ height: '50%' }}
          >
            <div className="space-y-1.5">
              {getTabContent(activeTab).map((conversation) => (
                <div
                  key={conversation.id || conversation.contactId}
                  onClick={() => handleConversationSelect(conversation)}
                  className={`flex items-center space-x-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                    (selectedConversation?.id &&
                      selectedConversation.id === conversation.id) ||
                    (selectedConversation?.contactId &&
                      selectedConversation.contactId === conversation.contactId)
                      ? 'bg-blue-50 border border-blue-200 shadow-sm'
                      : 'hover:bg-gray-100 border border-transparent'
                  }`}
                >
                  <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                    <AvatarFallback
                      className={
                        conversation.isGroup
                          ? 'bg-gradient-to-br from-purple-100 to-purple-200 text-purple-700 text-sm font-medium'
                          : 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 text-sm font-medium'
                      }
                    >
                      {conversation.isGroup ? (
                        <UsersIcon className="h-4 w-4" />
                      ) : (
                        conversation.name?.[0]?.toUpperCase() ||
                        conversation.contactFirstName?.[0]?.toUpperCase() ||
                        conversation.email?.[0]?.toUpperCase() ||
                        '?'
                      )}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {conversation.name ||
                        `${conversation.contactFirstName || ''} ${
                          conversation.contactLastName || ''
                        }`.trim() ||
                        conversation.email ||
                        conversation.phone}
                    </p>
                    <p className="text-xs text-gray-600 truncate mt-0.5">
                      {conversation.isGroup
                        ? `${conversation.memberCount || 0} members`
                        : (
                            <>
                              <span className="sm:hidden">
                                {truncateEmail(conversation.email)}
                              </span>
                              <span className="hidden sm:inline">
                                {conversation.email}
                              </span>
                            </>
                          ) ||
                          conversation.phone ||
                          'No contact info'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Summaries Section - 50% height, scrollable */}
          <div
            className={`border-t border-gray-200 bg-white shadow-inner ${
              summaries.length > 0 ? 'h-[45%]' : ''
            }`}
          >
            <div className="p-3 h-full flex flex-col">
              <h3 className="text-sm font-semibold text-gray-700 mb-2.5">
                Recent Summaries
              </h3>

              {/* Search input for summaries */}
              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 h-3.5 w-3.5" />
                <Input
                  type="text"
                  placeholder="Search summaries..."
                  value={summarySearchQuery}
                  onChange={(e) => setSummarySearchQuery(e.target.value)}
                  className="pl-9 text-sm h-9 border-gray-200 focus:border-blue-300"
                />
              </div>

              <ScrollArea className="flex-1">
                <div className="space-y-2.5 pr-2">
                  {/* Filter summaries based on search query */}
                  {(() => {
                    const filteredSummaries = summarySearchQuery.trim()
                      ? summaries.filter(
                          (summary) =>
                            summary.summary
                              .toLowerCase()
                              .includes(summarySearchQuery.toLowerCase()) ||
                            summary.toolContext
                              ?.toLowerCase()
                              .includes(summarySearchQuery.toLowerCase()) ||
                            (summary.selectedAircraft &&
                              summary.selectedAircraft
                                .toLowerCase()
                                .includes(summarySearchQuery.toLowerCase())),
                        )
                      : summaries;

                    if (filteredSummaries.length === 0) {
                      return summarySearchQuery.trim() ? (
                        <div className="text-center py-4">
                          <p className="text-xs text-gray-500 mb-2">
                            No summaries found
                          </p>
                          <p className="text-xs text-gray-400">
                            Try different search terms
                          </p>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-xs text-gray-500 mb-2">
                            No summaries available yet
                          </p>
                          <p className="text-xs text-gray-400">
                            Start conversations in Ask Question, Troubleshoot,
                            Find Parts, or Make Observation to see summaries
                            here
                          </p>
                        </div>
                      );
                    }

                    return filteredSummaries.map((summary) => {
                      // Find the tool for this summary to get its icon
                      const tool = tools.find(
                        (t) => t.name === summary.toolContext,
                      );
                      const toolIcon = tool?.icon || 'message-circle';

                      // Create a 50-character summary
                      const truncatedSummary =
                        summary.summary.length > 50
                          ? `${summary.summary.substring(0, 47)}...`
                          : summary.summary;

                      // Extract timestamp from summary content and show relative time
                      let timeDisplay = 'Recent';
                      try {
                        // Extract UTC timestamp from summary content (format: 2025-06-07 18:40:44 UTC)
                        const utcMatch = summary.summary.match(
                          /(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) UTC/,
                        );

                        if (utcMatch) {
                          // Parse the UTC timestamp from the summary content
                          const summaryDate = new Date(utcMatch[1] + 'Z'); // Add Z for UTC

                          if (!isNaN(summaryDate.getTime())) {
                            const now = new Date();
                            const diffMs =
                              now.getTime() - summaryDate.getTime();
                            const diffMins = Math.floor(diffMs / (1000 * 60));
                            const diffHours = Math.floor(
                              diffMs / (1000 * 60 * 60),
                            );
                            const diffDays = Math.floor(
                              diffMs / (1000 * 60 * 60 * 24),
                            );
                            const diffWeeks = Math.floor(diffDays / 7);

                            if (diffMins < 1) timeDisplay = 'Just now';
                            else if (diffMins < 60)
                              timeDisplay = `${diffMins}m ago`;
                            else if (diffHours < 24)
                              timeDisplay = `${diffHours}h ago`;
                            else if (diffDays === 1) timeDisplay = 'Yesterday';
                            else if (diffDays < 7)
                              timeDisplay = `${diffDays}d ago`;
                            else if (diffWeeks === 1)
                              timeDisplay = '1 week ago';
                            else if (diffWeeks < 4)
                              timeDisplay = `${diffWeeks} weeks ago`;
                            else
                              timeDisplay = summaryDate.toLocaleDateString(
                                'en-US',
                                {
                                  month: 'short',
                                  day: 'numeric',
                                  year:
                                    summaryDate.getFullYear() !==
                                    now.getFullYear()
                                      ? 'numeric'
                                      : undefined,
                                },
                              );
                          }
                        } else {
                          // Fallback to createdAt field if no UTC timestamp found
                          const summaryDate = new Date(summary.createdAt);
                          if (!isNaN(summaryDate.getTime())) {
                            const now = new Date();
                            const diffHours = Math.floor(
                              (now.getTime() - summaryDate.getTime()) /
                                (1000 * 60 * 60),
                            );
                            if (diffHours < 24)
                              timeDisplay = `${diffHours}h ago`;
                            else
                              timeDisplay = summaryDate.toLocaleDateString(
                                'en-US',
                                { month: 'short', day: 'numeric' },
                              );
                          }
                        }
                      } catch {
                        timeDisplay = 'Recent';
                      }

                      return (
                        <div
                          key={summary.id}
                          className={`p-2 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-all text-xs relative cursor-pointer ${
                            animatingSummary === summary.id
                              ? 'animate-pulse scale-95'
                              : ''
                          }`}
                          onClick={async () => {
                            // Fetch the actual conversation history for this summary
                            try {
                              console.log(
                                'Fetching conversation history for:',
                                summary.conversationThreadId ||
                                  summary.conversationId,
                              );
                              const response = await fetch(
                                `/api/conversation-history/${
                                  summary.conversationThreadId ||
                                  summary.conversationId
                                }`,
                                {
                                  method: 'GET',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                },
                              );

                              console.log(
                                'Conversation history response status:',
                                response.status,
                              );

                              if (response.ok) {
                                const data = await response.json();
                                console.log(
                                  'Conversation history response data:',
                                  data,
                                );
                                const conversationMessages = data.history || [];
                                console.log(
                                  'Parsed conversation messages:',
                                  conversationMessages,
                                );

                                setViewingConversation({
                                  ...summary,
                                  messages: conversationMessages,
                                });
                              } else {
                                console.log('Conversation history API failed');
                                // Fallback to showing just the summary
                                setViewingConversation({
                                  ...summary,
                                  messages: [],
                                });
                              }
                            } catch (error) {
                              console.error(
                                'Error fetching conversation history:',
                                error,
                              );
                              // Fallback to showing just the summary
                              setViewingConversation({
                                ...summary,
                                messages: [],
                              });
                            }
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              {/* Tool icon and summary title */}
                              <div className="flex items-center gap-2 mb-1">
                                {renderIcon(toolIcon, 'h-3 w-3 text-blue-600')}
                                <span
                                  className="font-medium text-blue-800 text-xs flex-1"
                                  title={summary.summary}
                                >
                                  {truncatedSummary}
                                </span>
                              </div>

                              {/* Timestamp */}
                              <div className="text-gray-500 text-xs mb-1">
                                {timeDisplay}
                              </div>

                              {/* Aircraft info if available */}
                              {summary.selectedAircraft &&
                                (() => {
                                  try {
                                    const aircraft = JSON.parse(
                                      summary.selectedAircraft,
                                    );
                                    return (
                                      <div className="text-gray-600 text-xs mb-1">
                                        Aircraft:{' '}
                                        {aircraft.tail_number || 'N/A'}
                                      </div>
                                    );
                                  } catch {
                                    return null;
                                  }
                                })()}

                              {/* Message preview */}
                              {(() => {
                                const preview = getMessagePreview(
                                  messages,
                                  summary.conversationId,
                                );
                                return preview ? (
                                  <div className="text-gray-600 text-xs mb-1 truncate">
                                    "{preview}"
                                  </div>
                                ) : null;
                              })()}

                              {/* Message count */}
                              <div className="text-gray-500 text-xs">
                                {summary.messageCount} message
                                {summary.messageCount !== 1 ? 's' : ''}
                              </div>
                            </div>

                            <div className="flex gap-1 ml-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  // Fetch the actual conversation history for this summary
                                  try {
                                    const response = await fetch(
                                      `/api/conversation-history/${summary.conversationThreadId}`,
                                      {
                                        method: 'GET',
                                        headers: {
                                          'Content-Type': 'application/json',
                                        },
                                      },
                                    );

                                    if (response.ok) {
                                      const data = await response.json();
                                      const conversationMessages =
                                        data.history || [];

                                      setViewingConversation({
                                        ...summary,
                                        messages: conversationMessages,
                                      });
                                    } else {
                                      // Fallback to showing just the summary
                                      setViewingConversation({
                                        ...summary,
                                        messages: [],
                                      });
                                    }
                                  } catch (error) {
                                    console.error(
                                      'Error fetching conversation history:',
                                      error,
                                    );
                                    // Fallback to showing just the summary
                                    setViewingConversation({
                                      ...summary,
                                      messages: [],
                                    });
                                  }
                                }}
                                className="h-6 w-6 p-0 hover:bg-blue-200"
                              >
                                <Eye className="h-3 w-3 text-blue-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleShareSummary(summary)}
                                disabled={!selectedConversation}
                                className="h-6 w-6 p-0 hover:bg-blue-200"
                              >
                                <Zap className="h-3 w-3 text-blue-600" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>

        {/* Chat Area */}

        <div className="flex-1 flex flex-col p-2 md:p-3">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 bg-white shadow-sm rounded-t-lg flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                    <AvatarFallback
                      className={
                        selectedConversation.isGroup
                          ? 'bg-gradient-to-br from-purple-100 to-purple-200 text-purple-700 text-base font-medium'
                          : 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 text-base font-medium'
                      }
                    >
                      {selectedConversation.isGroup ? (
                        <UsersIcon className="h-5 w-5" />
                      ) : (
                        selectedConversation.name?.[0]?.toUpperCase() ||
                        selectedConversation.contactFirstName?.[0]?.toUpperCase() ||
                        selectedConversation.email?.[0]?.toUpperCase() ||
                        '?'
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-base">
                      <span className="sm:hidden">
                        {truncateContactName(
                          selectedConversation.name ||
                            `${selectedConversation.contactFirstName || ''} ${
                              selectedConversation.contactLastName || ''
                            }`.trim() ||
                            selectedConversation.email ||
                            selectedConversation.phone,
                        )}
                      </span>
                      <span className="hidden sm:inline">
                        {selectedConversation.name ||
                          `${selectedConversation.contactFirstName || ''} ${
                            selectedConversation.contactLastName || ''
                          }`.trim() ||
                          selectedConversation.email ||
                          selectedConversation.phone}
                      </span>
                    </h3>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {selectedConversation.isGroup
                        ? `${selectedConversation.memberCount || 0} members`
                        : (
                            <>
                              <span className="sm:hidden">
                                {truncateEmail(selectedConversation.email)}
                              </span>
                              <span className="hidden sm:inline">
                                {selectedConversation.email}
                              </span>
                            </>
                          ) ||
                          selectedConversation.phone ||
                          'Available'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hover:bg-gray-100"
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hover:bg-gray-100"
                  >
                    <VideoIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4 bg-gradient-to-b from-gray-50 to-gray-100">
                <div className="space-y-2">
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center p-4 bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-lg border border-blue-100 max-w-md mx-4">
                        {/* Animated icon container */}
                        <div className="relative mb-6">
                          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center shadow-inner">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg">
                              <svg
                                className="w-6 h-6 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                />
                              </svg>
                            </div>
                          </div>
                          {/* Decorative dots */}
                          <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-300 rounded-full animate-pulse"></div>
                          <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-200 rounded-full animate-pulse delay-300"></div>
                        </div>

                        {/* Main content */}
                        <h3 className="text-xl font-bold text-gray-900 mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                          Start Your Conversation
                        </h3>

                        <p className="text-gray-600 mb-6 leading-relaxed">
                          Send your first message to begin chatting with{' '}
                          <span className="font-semibold text-blue-700">
                            {selectedConversation?.name ||
                              selectedConversation?.contactFirstName ||
                              selectedConversation?.email ||
                              'your contact'}
                          </span>
                        </p>

                        {/* Stats card */}
                        <div className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm mb-6">
                          <div className="grid grid-cols-2 gap-4 text-center">
                            <div>
                              <div className="text-2xl font-bold text-blue-600">
                                {messages.length}
                              </div>
                              <div className="text-xs text-gray-500 uppercase tracking-wide">
                                Messages
                              </div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-purple-600">
                                {selectedConversation?.isGroup
                                  ? 'Group'
                                  : 'Direct'}
                              </div>
                              <div className="text-xs text-gray-500 uppercase tracking-wide">
                                Chat Type
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Call to action */}
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-100">
                          <p className="text-sm text-blue-800 font-medium mb-2">
                            💡 Quick Tips:
                          </p>
                          <ul className="text-xs text-blue-700 space-y-1 text-left">
                            <li>• Type your message below and press Enter</li>
                            <li>• Share summaries from other tools</li>
                            {/* <li>• Use @mentions for group chats</li> */}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.isCurrentUser
                            ? 'justify-end'
                            : 'justify-start'
                        }`}
                      >
                        <div className="max-w-xs lg:max-w-md">
                          {/* Sender name and timestamp for non-current user messages */}
                          {!message.isCurrentUser && (
                            <div className="flex items-center gap-2 mb-1 px-1">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                                  {message.senderName?.[0]?.toUpperCase() ||
                                    'U'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs font-medium text-gray-600">
                                {message.senderName || 'Unknown'}
                              </span>
                            </div>
                          )}

                          <div
                            className={`px-4 py-2.5 rounded-2xl shadow-sm ${
                              message.isSummary
                                ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-gray-800'
                                : message.isCurrentUser
                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                                : 'bg-white border border-gray-200 text-gray-900'
                            } ${
                              message.isCurrentUser
                                ? 'rounded-br-md'
                                : 'rounded-bl-md'
                            }`}
                          >
                            {message.isSummary ? (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-blue-600 font-medium text-sm">
                                  📋 Chat Summary
                                </div>
                                <div className="text-sm whitespace-pre-line">
                                  {message.message
                                    .replace(/^\📋 \*\*/, '**')
                                    .replace(/\*\*/g, '')}
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                {message.message}
                              </p>
                            )}
                          </div>

                          {/* Timestamp and read status */}
                          <div
                            className={`text-xs mt-1.5 px-1 flex items-center gap-1.5 ${
                              message.isCurrentUser
                                ? 'justify-end text-gray-400'
                                : 'justify-start text-gray-500'
                            }`}
                          >
                            <span>{formatMessageTime(message.sentAt)}</span>
                            {message.isCurrentUser && (
                              <span
                                className={`text-xs ${
                                  message.isRead
                                    ? 'text-blue-400'
                                    : 'text-gray-300'
                                }`}
                              >
                                {message.isRead ? '✓✓' : '✓'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200 bg-white shadow-sm rounded-b-lg">
                <div className="text-xs text-gray-500 mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                  Press Enter to send, Shift+Enter for new line
                </div>
                <div className="flex items-end space-x-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="resize-none h-11 border-gray-200 focus:border-blue-300 shadow-sm"
                    />
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="bg-blue-600 hover:bg-blue-700 h-11 px-4 shadow-sm"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
              <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-gray-100 max-w-md">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center">
                  <Users className="h-10 w-10 text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Select a Conversation
                </h3>
                <p className="text-gray-600 mb-4">
                  Choose a contact or group to start messaging
                </p>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-sm text-blue-800">
                    <strong>Tip:</strong> You can drag chat summaries from the
                    main interface into any conversation to share them
                    automatically.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Contact Modal - Using existing functionality */}
      <Dialog open={showNewContactModal} onOpenChange={setShowNewContactModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Connection</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={newContactData.email}
                onChange={(e) =>
                  setNewContactData((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                className="col-span-3"
                placeholder="email@example.com"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Phone
              </Label>
              <Input
                id="phone"
                value={newContactData.phone}
                onChange={(e) =>
                  setNewContactData((prev) => ({
                    ...prev,
                    phone: e.target.value,
                  }))
                }
                className="col-span-3"
                placeholder="+1-555-0123"
              />
            </div>

            {/* Consent Checkbox */}
            <div className="grid grid-cols-4 items-start gap-4">
              <div></div>
              <div className="col-span-3">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="consent"
                    checked={newContactData.hasConsent}
                    onCheckedChange={(checked) =>
                      setNewContactData((prev) => ({
                        ...prev,
                        hasConsent: checked as boolean,
                      }))
                    }
                  />
                  <Label
                    htmlFor="consent"
                    className="text-xs text-gray-600 leading-tight"
                  >
                    I confirm this person has given consent to be added to my
                    aviation network and to receive communications.
                  </Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex justify-end sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setShowNewContactModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleNewContact}
              disabled={
                !newContactData.hasConsent ||
                (!newContactData.email && !newContactData.phone)
              }
              className="mb-2"
            >
              Add Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Group Modal */}
      <Dialog open={showNewGroupModal} onOpenChange={setShowNewGroupModal}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="groupName" className="text-right">
                Group Name
              </Label>
              <Input
                id="groupName"
                value={newGroupData.name}
                onChange={(e) =>
                  setNewGroupData((prev) => ({ ...prev, name: e.target.value }))
                }
                className="col-span-3"
                placeholder="Enter group name"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="groupDescription" className="text-right">
                Description
              </Label>
              <Input
                id="groupDescription"
                value={newGroupData.description}
                onChange={(e) =>
                  setNewGroupData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="col-span-3"
                placeholder="Optional description"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right mt-2">Members</Label>
              <div className="col-span-3">
                <ScrollArea className="h-32 border rounded p-2">
                  <div className="space-y-2">
                    {availableContacts.map((contact) => (
                      <div
                        key={contact.id || contact.contactId}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={contact.id || contact.contactId}
                          checked={newGroupData.selectedMembers.includes(
                            contact.contactId || contact.id,
                          )}
                          onCheckedChange={(checked) => {
                            const memberId = contact.contactId || contact.id;
                            if (checked) {
                              setNewGroupData((prev) => ({
                                ...prev,
                                selectedMembers: [
                                  ...prev.selectedMembers,
                                  memberId,
                                ],
                              }));
                            } else {
                              setNewGroupData((prev) => ({
                                ...prev,
                                selectedMembers: prev.selectedMembers.filter(
                                  (id) => id !== memberId,
                                ),
                              }));
                            }
                          }}
                        />
                        <Label
                          htmlFor={contact.id || contact.contactId}
                          className="text-sm"
                        >
                          {contact.name ||
                            `${contact.contactFirstName || ''} ${
                              contact.contactLastName || ''
                            }`.trim() ||
                            contact.email ||
                            contact.phone}
                        </Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewGroupModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleNewGroup}
              disabled={isCreatingGroup}
              className="mb-2"
            >
              {isCreatingGroup ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Group'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conversation Viewer Modal */}
      <Dialog
        open={!!viewingConversation}
        onOpenChange={() => setViewingConversation(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90%]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewingConversation &&
                (() => {
                  const tool = tools.find(
                    (t) => t.name === viewingConversation.toolContext,
                  );
                  const toolIcon = tool?.icon || 'message-circle';
                  return (
                    <>
                      {renderIcon(toolIcon, 'h-4 w-4 text-blue-600')}
                      {viewingConversation.toolContext} Conversation
                    </>
                  );
                })()}
            </DialogTitle>
            <div className="text-sm text-gray-600">
              {viewingConversation?.summary}
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-3">
              {viewingConversation?.messages &&
              viewingConversation.messages.length > 0 ? (
                (() => {
                  // Sort all messages by timestamp to show chronological order
                  const allMessages: any[] = [];

                  viewingConversation.messages.forEach((message: any) => {
                    // Handle conversation_history table format (threadid, messagetext, messagetype)
                    if (message.messagetext && message.messagetype) {
                      allMessages.push({
                        id: message.id,
                        text: message.messagetext,
                        isUser: message.messagetype === 'user',
                        timestamp: message.createdat || message.timestamp,
                        type: message.messagetype,
                      });
                    }
                    // Handle legacy format (userPrompt, agentResponse)
                    else {
                      if (message.userPrompt) {
                        allMessages.push({
                          id: `${message.id}-user`,
                          text: message.userPrompt,
                          isUser: true,
                          timestamp: message.timestamp,
                          type: 'user',
                        });
                      }
                      if (message.agentResponse) {
                        allMessages.push({
                          id: `${message.id}-agent`,
                          text: message.agentResponse,
                          isUser: false,
                          timestamp: message.timestamp,
                          type: 'system',
                        });
                      }
                    }
                  });

                  // Sort messages chronologically
                  allMessages.sort((a, b) => {
                    const timeA = new Date(a.timestamp).getTime();
                    const timeB = new Date(b.timestamp).getTime();
                    return timeA - timeB;
                  });

                  return allMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.isUser ? 'justify-end' : 'justify-start'
                      } overflow-y-auto`}
                    >
                      <div
                        className={`max-w-[80%] ${
                          message.isUser
                            ? 'bg-blue-500 text-white rounded-lg px-3 py-2'
                            : 'bg-gray-100 text-gray-900 rounded-lg px-3 py-2'
                        }`}
                      >
                        <div className="text-sm whitespace-pre-wrap">
                          {message.text && /<[^>]*>/g.test(message.text) ? (
                            <div
                              dangerouslySetInnerHTML={{ __html: message.text }}
                            />
                          ) : (
                            message.text
                          )}
                        </div>
                        <div
                          className={`text-xs mt-1 flex justify-between items-center ${
                            message.isUser ? 'text-blue-100' : 'text-gray-500'
                          }`}
                        >
                          <span>{message.isUser ? 'You' : 'Assistant'}</span>
                          <span>{formatMessageTime(message.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  ));
                })()
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="mb-2">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                      {renderIcon('message-circle', 'h-6 w-6 text-gray-400')}
                    </div>
                    <p className="text-sm font-medium">
                      Loading Conversation History...
                    </p>
                    <p className="text-xs mt-1">
                      Retrieving conversation details from{' '}
                      {viewingConversation?.toolContext}.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setViewingConversation(null)}
            >
              Close
            </Button>
            {viewingConversation && (
              <Button
                onClick={() => {
                  handleShareSummary(viewingConversation);
                  setViewingConversation(null);
                }}
                disabled={!selectedConversation}
                className="mb-2"
              >
                Share to Conversation
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
