import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import MessageContainer from '@/components/MessageContainer';
import FileDrawer from '@/components/FileDrawer';
import FullScreenChatInterface from '@/components/FullScreenChatInterface';
import MultimediaInput from '@/components/MultimediaInput';
import { Badge } from '@/components/ui/badge';
import * as LucideIcons from 'lucide-react';
import { ChevronDown } from 'lucide-react';
import NotificationCenter from '@/components/NotificationCenter';
import { requestNative } from '@/utils/nativeBridge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

// Generate unique IDs to prevent React key conflicts
const generateUniqueId = (prefix: string = 'section') => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Custom voice input hook
function useVoiceInput({
  onFinalTranscript,
  lang = navigator.language || 'en-US',
}: {
  onFinalTranscript: (text: string) => void;
  lang?: string;
}) {
  const [isListening, setIsListening] = useState(false);
  const recogRef = useRef<any>(null);
  const restartRef = useRef(false);
  const onFinalTranscriptRef = useRef(onFinalTranscript);
  const isStartingRef = useRef(false);
  const isListeningRef = useRef(false); // Add ref to track listening state

  // Update the ref when onFinalTranscript changes
  useEffect(() => {
    onFinalTranscriptRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  // Update the ref when isListening changes
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  // Toggle handler exposed to UI
  const toggle = useCallback(() => {
    if (!recogRef.current) {
      console.warn('Speech recognition not available');
      return;
    }

    if (isListening) {
      // Stop listening
      try {
        recogRef.current.stop();
        setIsListening(false);
        isStartingRef.current = false;
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
        setIsListening(false);
        isStartingRef.current = false;
      }
    } else {
      // Start listening - prevent multiple starts
      if (isStartingRef.current) {
        return;
      }

      isStartingRef.current = true;

      // Check if we're in development environment
      const isDevelopment =
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.protocol === 'http:';

      if (isDevelopment) {
        console.log(
          'Speech recognition may not work in development - requires HTTPS',
        );
      }

      // Check if we're online before starting
      if (!navigator.onLine) {
        console.warn('Cannot start speech recognition - offline');
        setIsListening(false);
        isStartingRef.current = false;
        return;
      }

      // Request microphone permission from native app if available
      requestNative('request-microphone');

      try {
        recogRef.current.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        setIsListening(false);
        isStartingRef.current = false;
      }
    }
  }, [isListening]);

  useEffect(() => {
    const SpeechAPI =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechAPI) {
      console.warn('SpeechRecognition not supported');
      return;
    }

    const recog = new SpeechAPI();
    recogRef.current = recog;

    recog.lang = lang;
    recog.continuous = true;
    recog.interimResults = false; // change to true if you want live text

    recog.onstart = () => {
      restartRef.current = false;
      isStartingRef.current = false;
      setIsListening(true);
    };

    recog.onresult = (e: any) => {
      let finalTranscript = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalTranscript += e.results[i][0].transcript;
      }
      if (finalTranscript) onFinalTranscriptRef.current(finalTranscript.trim());
    };

    recog.onerror = (e: any) => {
      console.error('Speech error', e.error);
      isStartingRef.current = false;

      // Check if we're in development environment
      const isDevelopment =
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.protocol === 'http:';

      // Handle specific errors
      if (e.error === 'no-speech') {
        // Continue listening even if no speech is detected
        return;
      } else if (e.error === 'not-allowed') {
        console.warn('Microphone permission denied');
        setIsListening(false);
        // Could show a toast notification here
      } else if (e.error === 'network') {
        if (isDevelopment) {
          console.warn(
            'Network error in speech recognition - this is normal in development (requires HTTPS)',
          );
        } else {
          console.warn('Network error in speech recognition');
        }
        setIsListening(false);
        // Network errors are common in development, don't show as error to user
      } else if (e.error === 'audio-capture') {
        console.warn(
          'Audio capture error - microphone may be in use by another application',
        );
        setIsListening(false);
      } else if (e.error === 'service-not-allowed') {
        console.warn('Speech recognition service not allowed');
        setIsListening(false);
      } else {
        console.warn('Speech recognition error:', e.error);
        setIsListening(false);
      }
    };

    recog.onend = () => {
      // Use the ref to get current listening state to avoid stale closure
      const currentIsListening = isListeningRef.current;

      // Only restart if we're still supposed to be listening and not already restarting
      if (currentIsListening && !restartRef.current && !isStartingRef.current) {
        restartRef.current = true;
        setTimeout(() => {
          // Check again in case state changed during timeout
          if (
            isListeningRef.current &&
            !restartRef.current &&
            !isStartingRef.current
          ) {
            try {
              recog.start();
            } catch (error) {
              console.error('Error restarting speech recognition:', error);
              setIsListening(false);
              restartRef.current = false;
            }
          }
        }, 100);
      } else {
        setIsListening(false);
        isStartingRef.current = false;
      }
    };

    return () => {
      recog.onstart = recog.onresult = recog.onerror = recog.onend = null;
      try {
        recog.stop();
      } catch (error) {
        console.error('Error stopping speech recognition on cleanup:', error);
      }
    };
  }, [lang]); // Only depend on lang, use refs for state tracking

  return { isListening, toggle, supported: !!recogRef.current };
}

function SimpleChatbot({
  selectedAircraft,
  onAircraftSelect,
}: {
  selectedAircraft?: any;
  onAircraftSelect?: (aircraft: any) => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [selectedContactsCount, setSelectedContactsCount] = useState(0);
  const [isFileDrawerOpen, setIsFileDrawerOpen] = useState(false);
  const [showChatWindow, setShowChatWindow] = useState(false);
  const [selectedContactsForChat, setSelectedContactsForChat] = useState<any[]>(
    [],
  );
  const [showNotifications, setShowNotifications] = useState(false);
  const [prevNotificationCount, setPrevNotificationCount] = useState(0);
  const [showBuzz, setShowBuzz] = useState(false);
  const [showMultimediaInput, setShowMultimediaInput] = useState(false);

  // Custom voice input hook
  const { isListening, toggle, supported } = useVoiceInput({
    onFinalTranscript: useCallback((text: string) => {
      setInput((prev) => (prev.trim() ? `${prev} ${text}` : text));
    }, []),
  });

  // Poll for notification count with optimized caching
  const { data: notificationData, error: notificationError } = useQuery({
    queryKey: ['/api/messaging/pull'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/messaging/pull', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit: 50 }),
          credentials: 'include',
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn('Messaging API error:', response.status, errorText);
          throw new Error(`Failed to fetch notifications: ${response.status}`);
        }

        return response.json();
      } catch (error) {
        console.warn('Messaging API request failed:', error);
        throw error;
      }
    },
    refetchInterval: 30000, // Reduced polling frequency to 30 seconds
    staleTime: 10000, // Cache for 10 seconds
    gcTime: 60000, // Keep in memory for 1 minute
    enabled: !!user?.id, // Only poll when user is properly authenticated
    retry: 2, // Limit retries to avoid spam
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  const notificationCount =
    notificationData?.data?.messages?.filter((n: any) => !n.isRead).length || 0;

  // Buzz effect when count changes
  useEffect(() => {
    if (
      notificationCount > prevNotificationCount &&
      prevNotificationCount > 0
    ) {
      setShowBuzz(true);
      setTimeout(() => setShowBuzz(false), 2000);
    }
    setPrevNotificationCount(notificationCount);
  }, [notificationCount, prevNotificationCount]);

  // Chat area reference for auto-scroll
  const chatAreaRef = useRef<HTMLDivElement>(null);

  // Chat input reference for refocusing
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Container system state
  const [currentContainer, setCurrentContainer] = useState<any>(null);
  const [priorContainers, setPriorContainers] = useState<any[]>([]);

  // Track active tool for FleetSpan refresh
  const [activeToolName, setActiveToolName] = useState<string | null>(null);

  // Track selected status filter for highlighting
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<
    string | null
  >(null);

  // Conversation tracking for external API
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Global event handler for chat functionality
  useEffect(() => {
    const handleChatNowEvent = (event: CustomEvent) => {
      const { selectedContacts } = event.detail;

      if (selectedContacts && selectedContacts.length > 0) {
        setSelectedContactsForChat(selectedContacts);
        setShowChatWindow(true);
      }
    };

    // Listen for the global chatNow event
    window.addEventListener('chatNow' as any, handleChatNowEvent);

    return () => {
      window.removeEventListener('chatNow' as any, handleChatNowEvent);
    };
  }, []);

  // Fetch tools and commands with optimized caching
  const { data: tools = [] } = useQuery<any[]>({
    queryKey: ['/api/tools'],
    staleTime: 10 * 60 * 1000, // 10 minutes for tools data
    gcTime: 30 * 60 * 1000, // Keep in memory for 30 minutes
    enabled: true,
  });

  const { data: commands = [] } = useQuery<any[]>({
    queryKey: ['/api/tools', { showInToolbox: true }],
    staleTime: 10 * 60 * 1000, // 10 minutes for commands data
    gcTime: 30 * 60 * 1000, // Keep in memory for 30 minutes
    enabled: true,
  });

  const { data: fleetspanPrompts = [] } = useQuery<any[]>({
    queryKey: ['/api/tools/1006/selective-prompts'],
    staleTime: 0, // No caching to get fresh data
    gcTime: 5 * 60 * 1000, // Keep in memory for 5 minutes only
    enabled: true,
  });

  // Handle aircraft selection changes for FleetSpan refresh
  useEffect(() => {
    // Only proceed if we have meaningful changes
    const currentAircraft = selectedAircraft?.tail_number || 'null';
    const currentTool = currentContainer?.tool;

    // Clear status filter when aircraft selection changes
    if (
      activeToolName === 'FleetSpan' ||
      (currentContainer && currentContainer.tool === 'FleetSpan')
    ) {
      setSelectedStatusFilter(null);
    }

    // If FleetSpan is the active tool, update it with new aircraft context
    if (
      activeToolName === 'FleetSpan' ||
      (currentContainer && currentContainer.tool === 'FleetSpan')
    ) {
      setTimeout(() => {
        setCurrentContainer((prev: any) => {
          if (
            !prev ||
            (prev.tool !== 'FleetSpan' && activeToolName !== 'FleetSpan')
          ) {
            return prev;
          }

          // If aircraft is selected, show aircraft card directly
          if (selectedAircraft) {
            return {
              ...prev,
              tool: 'FleetSpan',
              messages: [
                {
                  text: `Here's your selected aircraft:`,
                  isUser: false,
                  isAircraftList: true,
                  filter: selectedAircraft.tail_number,
                  selectedAircraft: selectedAircraft,
                  toolOutputId: generateUniqueId('aircraft_card'),
                },
              ],
            };
          } else {
            return {
              ...prev,
              tool: 'FleetSpan',
              messages: [
                {
                  text: '',
                  isUser: false,
                  isSelectiveAction: true,
                  selectivePrompts: fleetspanPrompts,
                  primaryActionLabel: 'Filter by:',
                  toolOutputId: generateUniqueId('selective'),
                },
                {
                  text: 'All Aircraft:',
                  isUser: false,
                  isAircraftList: true,
                  filter: 'all',
                  toolOutputId: generateUniqueId('aircraft_list'),
                },
              ],
            };
          }
        });
      }, 100); // Small delay to ensure state is properly set
    }
  }, [
    selectedAircraft?.tail_number,
    fleetspanPrompts,
    activeToolName,
    currentContainer?.tool,
  ]); // More specific dependencies

  // Prefetch all tool selective prompts for instant loading
  useEffect(() => {
    if (tools.length > 0) {
      tools.forEach((tool) => {
        if (tool.has_selective_actions && tool.tool_id !== 1006) {
          // Prefetch selective prompts for tools other than FleetSpan (already cached)
          queryClient.prefetchQuery({
            queryKey: [`/api/tools/${tool.tool_id}/selective-prompts`],
            queryFn: async () => {
              const response = await fetch(
                `/api/tools/${tool.tool_id}/selective-prompts`,
              );
              if (!response.ok) return [];
              return response.json();
            },
            staleTime: 15 * 60 * 1000,
            gcTime: 45 * 60 * 1000,
          });
        }
      });
    }
  }, [tools, queryClient]);

  // Listen for contact selection events
  useEffect(() => {
    const handleContactSelection = (event: any) => {
      setSelectedContactsCount(event.detail.count);

      // Update the current container to reflect the new contact count
      setCurrentContainer((prev: any) => {
        if (!prev) return prev;

        return {
          ...prev,
          messages: prev.messages.map((message: any) => ({
            ...message,
            selectedContactsCount: event.detail.count,
          })),
        };
      });
    };

    window.addEventListener('contactsSelected', handleContactSelection);
    return () =>
      window.removeEventListener('contactsSelected', handleContactSelection);
  }, []);

  // Auto-scroll to bottom function
  const scrollToBottom = () => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  };

  // Handle rating for assistant responses
  const handleRating = async (responseId: string, rating: number) => {
    try {
      const response = await fetch(`/api/Chat/message/${responseId}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          rating: rating,
          userId: user?.id || 'anonymous',
          feedback: '',
        }),
      });

      if (response.ok) {
        const result = await response.json();

        // Update the message with the rating
        setCurrentContainer((prev: any) => {
          if (!prev) return prev;

          return {
            ...prev,
            messages: prev.messages.map((message: any) =>
              message.responseId === responseId
                ? { ...message, rating: rating }
                : message,
            ),
          };
        });
      } else {
        const errorText = await response.text();
        console.error('Failed to submit rating:', response.status, errorText);
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
    }
  };

  // Add message to current container
  const addMessage = (messageOrUpdater: any) => {
    if (!currentContainer) {
      return;
    }

    setCurrentContainer((prev: any) => {
      if (!prev) return prev;

      const newMessage =
        typeof messageOrUpdater === 'function'
          ? messageOrUpdater(prev.messages)
          : {
              ...messageOrUpdater,
              selectedContactsCount: messageOrUpdater.isSelectiveAction
                ? selectedContactsCount
                : messageOrUpdater.selectedContactsCount,
            };

      const updatedContainer = {
        ...prev,
        messages: [...prev.messages, newMessage],
      };

      // Auto-scroll to bottom for DirectChat messages (user messages or bot text responses)
      setTimeout(() => {
        if (
          newMessage.isUser ||
          (!newMessage.isSelectiveAction &&
            !newMessage.isPrimaryAction &&
            !newMessage.isAircraftList &&
            !newMessage.isContactsList &&
            newMessage.text)
        ) {
          scrollToBottom();
        }
      }, 100);

      return updatedContainer;
    });
  };

  // Helper functions for tool configuration
  const getSelectiveActionText = (toolName: string): string => {
    switch (toolName) {
      case 'FleetSpan':
        return 'Filter fleet by status:';
      case 'Chat with Others':
        return 'Choose how to connect:';
      case 'Sort':
        return 'Choose sorting option:';
      default:
        return 'Choose an action:';
    }
  };

  const getPrimaryActionForTool = async (tool: any) => {
    switch (tool.name) {
      case 'Chat with Others':
        try {
          const response = await fetch('/api/contacts');
          const contactsData = await response.json();

          return contactsData && contactsData.length > 0
            ? {
                text: 'Select a contact to start chatting:',
                isUser: false,
                isContactsList: true,
                contacts: contactsData,
                toolOutputId: generateUniqueId('contacts'),
              }
            : {
                text: 'No contacts found. Add some contacts first.',
                isUser: false,
                toolOutputId: generateUniqueId('no_contacts'),
              };
        } catch (error) {
          return {
            text: 'Authentication required to load contacts.',
            isUser: false,
            toolOutputId: generateUniqueId('contacts_error'),
          };
        }

      case 'FleetSpan':
        // Check if we should bypass selective actions when aircraft is selected
        if (selectedAircraft) {
          return {
            text: `Here's your selected aircraft:`,
            isUser: false,
            isAircraftList: true,
            filter: selectedAircraft.tail_number,
            toolOutputId: generateUniqueId('aircraft_card'),
          };
        }
        return null;

      default:
        return null;
    }
  };

  // Tool click handler with generic sub-container system
  const handleToolClick = (tool: any) => {
    try {
      setSelectedTool(tool.name);

      // Move current container to prior containers, filtering to only DirectChat content
      if (currentContainer) {
        const filteredContainer = filterToDirectChatOnly(currentContainer);
        if (filteredContainer) {
          // Extract DirectChat messages for summarization
          const directChatMessages = filteredContainer.messages
            .filter(
              (msg: any) =>
                !msg.isSelectiveAction &&
                !msg.isAircraftList &&
                !msg.isContactsList,
            )
            .map((msg: any) => ({
              sender: msg.isUser ? 'user' : 'bot',
              content: msg.text || '',
            }));

          // Get conversation summary if there are meaningful messages
          // Skip summarization for specific tools: Notifications, Files, FleetSpan
          const skipSummarizationTools = [
            'Notifications',
            'Files',
            'FleetSpan',
          ];

          // Check if the PREVIOUS tool (where the conversation happened) should be skipped
          const previousToolName =
            filteredContainer?.toolName || currentContainer?.toolName;
          const shouldSkipSummarization =
            skipSummarizationTools.includes(previousToolName);

          if (directChatMessages.length > 0 && !shouldSkipSummarization) {
            // Use the existing conversation ID from the chat messages instead of creating a new one
            const conversationThreadId =
              conversationId ||
              `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            fetch('/api/summarize-conversation', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                messages: directChatMessages,
                userId: user?.id || null,
                toolContext: tool.name,
                conversationThreadId,
                selectedAircraft: selectedAircraft
                  ? JSON.stringify(selectedAircraft)
                  : null,
              }),
            })
              .then((response) => {
                if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
              })
              .then((data) => {
                console.log('Summarization response:', data);
                // Update the container with the summary as the tool name
                const containerWithSummary = {
                  ...filteredContainer,
                  toolName: data.summary || filteredContainer.toolName,
                };
                setPriorContainers((prev) => [...prev, containerWithSummary]);
              })
              .catch((error) => {
                console.error('Error summarizing conversation:', error);
                // Fallback: use original tool name
                setPriorContainers((prev) => [...prev, filteredContainer]);
              });
          } else {
            // No meaningful messages, use original tool name
            setPriorContainers((prev) => [...prev, filteredContainer]);
          }
        }
      }

      // Generic handler for ALL tools - dynamic sub-container system
      const handleToolWithActions = async () => {
        const toolMessages = [];

        // Step 1: Check for both Selective Actions and Primary Actions
        let hasSelectiveActions = false;
        let hasPrimaryActions = false;
        let selectivePrompts = [];
        let primaryActions = [];

        // Check Selective Actions - use cached data for instant performance
        if (tool.id === 1006 && fleetspanPrompts.length > 0) {
          // Use pre-cached FleetSpan prompts for immediate response
          hasSelectiveActions = true;
          selectivePrompts = fleetspanPrompts;
        } else if (tool.has_selective_actions) {
          // Use prefetched data from query cache for instant loading
          const cachedPrompts = queryClient.getQueryData([
            `/api/tools/${tool.tool_id}/selective-prompts`,
          ]);
          if (
            cachedPrompts &&
            Array.isArray(cachedPrompts) &&
            cachedPrompts.length > 0
          ) {
            hasSelectiveActions = true;
            selectivePrompts = cachedPrompts;
          }
        }

        // Check Primary Actions from tools table
        const hasAircraft = selectedAircraft !== null;
        const primaryAction = hasAircraft
          ? tool.on_click_event_selected_aircraft_eq_true
          : tool.on_click_event_selected_aircraft_eq_false;

        if (primaryAction && primaryAction !== 'scrollBottom') {
          primaryActions = [
            {
              action: primaryAction,
              label: getPrimaryActionLabel(primaryAction),
              hasAircraft: hasAircraft,
            },
          ];
          hasPrimaryActions = true;
        }

        // Step 2: Database-driven bypass for tools with selected aircraft
        // Direct bypass for FleetSpan when aircraft is selected (fallback while DB field is being fixed)
        const shouldBypassSelectiveActions =
          (tool.bypassselectiveactionwhenaircraftiselected &&
            selectedAircraft) ||
          (tool.name === 'FleetSpan' && selectedAircraft);

        // Step 3: Render actions - support both Selective AND Primary Actions
        if (
          hasSelectiveActions &&
          !shouldBypassSelectiveActions &&
          tool.name !== 'Chat with Others'
        ) {
          // Render Selective Actions with primary action label (unless tool bypasses when aircraft selected or is Chat with Others)
          toolMessages.push({
            text: '',
            isUser: false,
            isSelectiveAction: true,
            selectivePrompts: selectivePrompts,
            primaryActionLabel: tool.primaryActionLabel,
            toolOutputId: generateUniqueId('selective'),
          });

          // For FleetSpan, also show all aircraft below the status filters
          if (tool.name === 'FleetSpan') {
            toolMessages.push({
              text: 'All Aircraft:',
              isUser: false,
              isAircraftList: true,
              filter: 'all',
              toolOutputId: generateUniqueId('aircraft_list'),
            });
          }
        }

        if (hasPrimaryActions) {
          // Handle immediate execution actions
          if (primaryAction === 'displayFileDrawer') {
            setIsFileDrawerOpen(true);
            // Don't add any messages for immediate actions
          } else if (tool.name === 'Chat with Others') {
            // Special case for Chat with Others - open modern interface directly

            try {
              fetch('/api/contacts')
                .then((response) => response.json())
                .then((contactsData) => {
                  setSelectedContactsForChat(contactsData || []);
                  setShowChatWindow(true);
                })
                .catch((error) => {
                  setSelectedContactsForChat([]);
                  setShowChatWindow(true);
                });
            } catch (error) {
              setSelectedContactsForChat([]);
              setShowChatWindow(true);
            }
            // Don't add any messages for immediate actions
          } else if (tool.name === 'Notifications') {
            // Special case for Notifications tool - show notifications in main window
            toolMessages.push({
              text: '',
              isUser: false,
              isNotificationCenter: true,
              toolOutputId: generateUniqueId('notifications'),
            });
          } else if (
            shouldBypassSelectiveActions &&
            tool.name === 'FleetSpan' &&
            selectedAircraft
          ) {
            // Special case for FleetSpan bypass - show aircraft card directly

            toolMessages.push({
              text: `Here's your selected aircraft:`,
              isUser: false,
              isAircraftList: true,
              filter: selectedAircraft.tail_number,
              selectedAircraft: selectedAircraft,
              toolOutputId: generateUniqueId('aircraft_card'),
            });
          } else {
            // Add primary rendering if the action supports it (skip showing buttons)
            if (shouldShowPrimaryRendering(primaryAction)) {
              const renderingMessage = getPrimaryRenderingMessage(
                primaryAction,
                tool.name,
              );
              if (renderingMessage) {
                toolMessages.push(renderingMessage);
              }
            }
          }
        }

        // If no actions configured, show appropriate defaults
        if (!hasSelectiveActions && !hasPrimaryActions) {
          // No actions configured - show default message based on tool
          if (tool.name === 'Chat with Others') {
            // Open modern chat interface directly
            try {
              const contactsResponse = await fetch('/api/contacts');
              const contactsData = await contactsResponse.json();

              // Open modern chat interface with available contacts
              setSelectedContactsForChat(contactsData || []);
              setShowChatWindow(true);

              // Don't add any messages, just open the interface
              return;
            } catch (error) {
              // If contacts fetch fails, still open the interface with empty contacts
              setSelectedContactsForChat([]);
              setShowChatWindow(true);
              return;
            }
          } else if (tool.name === 'Notifications') {
            // Show notifications in main window
            setShowNotifications(true);
            toolMessages.push({
              text: 'Loading notifications...',
              isUser: false,
              isNotifications: true,
              toolOutputId: generateUniqueId('notifications'),
            });
          }
          // Remove generic activation message for other tools
        }

        // Create new container with all messages
        const newContainer: any = {
          id: generateUniqueId('section'),
          toolName: tool.name,
          tool: tool.name, // Add tool field for refresh tracking
          messages: toolMessages,
        };

        // For FleetSpan, if there's a selected aircraft, add it to primary subcontainer
        if (tool.name === 'FleetSpan' && selectedAircraft) {
          newContainer.primarySubcontainer = {
            id: generateUniqueId('primary'),
            toolName: 'FleetSpan',
            messages: [
              {
                text: `Selected Aircraft: ${selectedAircraft.tail_number}`,
                isUser: false,
                isAircraftDetail: true,
                aircraft: selectedAircraft,
                toolOutputId: generateUniqueId('aircraft_detail'),
              },
            ],
          };
        }

        // Set active tool name for refresh tracking
        setActiveToolName(tool.name);

        setCurrentContainer(newContainer);
      };

      handleToolWithActions();

      // Return focus to chat input after tool selection
      setTimeout(() => {
        const chatInput = document.querySelector(
          'input[type="text"]',
        ) as HTMLInputElement;
        if (chatInput) {
          chatInput.focus();
        }
      }, 100);
    } catch (error) {
      console.error('Error in tool handling:', error);
      setCurrentContainer({
        id: generateUniqueId('section'),
        toolName: tool.name,
        messages: [
          {
            text: `${tool.name} tool activated.`,
            isUser: false,
            toolOutputId: generateUniqueId('tool'),
          },
        ],
      });

      // Return focus to chat input even on error
      setTimeout(() => {
        const chatInput = document.querySelector(
          'input[type="text"]',
        ) as HTMLInputElement;
        if (chatInput) {
          chatInput.focus();
        }
      }, 100);
    }
  };

  // Handle selective actions (filter buttons)
  const handleSelectiveAction = (action: any, toolName: string) => {
    // Check for displayFileDrawer event
    if (action.onClickEvent === 'displayFileDrawer') {
      setIsFileDrawerOpen(true);
      return;
    }

    // Check for chatNow event
    if (action.onClickEvent === 'chatNow') {
      // Open modern chat interface directly
      try {
        fetch('/api/contacts')
          .then((response) => response.json())
          .then((contactsData) => {
            setSelectedContactsForChat(contactsData || []);
            setShowChatWindow(true);
          })
          .catch((error) => {
            // If contacts fetch fails, still open the interface with empty contacts
            setSelectedContactsForChat([]);
            setShowChatWindow(true);
          });
      } catch (error) {
        // Fallback: open interface with empty contacts
        setSelectedContactsForChat([]);
        setShowChatWindow(true);
      }
      return;
    }

    if (toolName === 'FleetSpan') {
      // Set selected status filter for highlighting
      setSelectedStatusFilter(action.promptValue);

      // Replace any existing aircraft list in current container
      setCurrentContainer((prev: any) => {
        if (!prev) return prev;

        // Find and replace any existing aircraft list message
        const updatedMessages = prev.messages.map((msg: any) => {
          if (msg.isAircraftList) {
            return {
              text: '',
              isUser: false,
              isAircraftList: true,
              filter: action.promptValue,
              toolOutputId: generateUniqueId('aircraft_list'),
            };
          }
          return msg;
        });

        // If no aircraft list exists, add one
        const hasAircraftList = prev.messages.some(
          (msg: any) => msg.isAircraftList,
        );
        if (!hasAircraftList) {
          updatedMessages.push({
            text: '',
            isUser: false,
            isAircraftList: true,
            filter: action.promptValue,
            toolOutputId: generateUniqueId('aircraft_list'),
          });
        }

        return {
          ...prev,
          messages: updatedMessages,
        };
      });
    } else if (toolName === 'Chat with Others') {
      // Load and display contacts when "Chat Now!" is clicked
      setCurrentContainer((prev: any) => {
        if (!prev) return prev;

        // Add contacts loading message, then replace with actual contacts
        const loadingMessage = {
          text: 'Loading contacts...',
          isUser: false,
          toolOutputId: generateUniqueId('loading'),
        };

        // Fetch contacts and update the container
        fetch('/api/contacts')
          .then((response) => response.json())
          .then((contactsData) => {
            setCurrentContainer((currentPrev: any) => {
              if (!currentPrev) return currentPrev;

              // Replace loading message with contacts list
              const updatedMessages = currentPrev.messages.map((msg: any) => {
                if (
                  msg.toolOutputId &&
                  msg.toolOutputId.startsWith('loading_')
                ) {
                  return contactsData.length > 0
                    ? {
                        text: 'Select contacts to chat with:',
                        isUser: false,
                        isContactsList: true,
                        contacts: contactsData,
                        toolOutputId: generateUniqueId('contacts'),
                      }
                    : {
                        text: 'No contacts found. Add some contacts first.',
                        isUser: false,
                        toolOutputId: generateUniqueId('no_contacts'),
                      };
                }
                return msg;
              });

              return {
                ...currentPrev,
                messages: updatedMessages,
              };
            });
          })
          .catch((error) => {
            console.error('Error loading contacts:', error);
            setCurrentContainer((currentPrev: any) => {
              if (!currentPrev) return currentPrev;

              const updatedMessages = currentPrev.messages.map((msg: any) => {
                if (
                  msg.toolOutputId &&
                  msg.toolOutputId.startsWith('loading_')
                ) {
                  return {
                    text: 'Failed to load contacts. Please try again.',
                    isUser: false,
                    toolOutputId: generateUniqueId('contacts_error'),
                  };
                }
                return msg;
              });

              return {
                ...currentPrev,
                messages: updatedMessages,
              };
            });
          });

        return {
          ...prev,
          messages: [...prev.messages, loadingMessage],
        };
      });
    }
  };

  // Get icon for tools from the database
  const getToolIcon = (tool: any) => {
    if (!tool.icon) return <LucideIcons.Settings className="w-4 h-4" />;

    // Convert kebab-case to PascalCase for Lucide React components
    const iconKey = tool.icon
      .split('-')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');

    const IconComponent = (LucideIcons as any)[iconKey];

    if (IconComponent) {
      return <IconComponent className="w-4 h-4" />;
    }

    // Fallback to Settings icon if the specified icon doesn't exist
    return <LucideIcons.Settings className="w-4 h-4" />;
  };

  // Enum for actions that do NOT have primary rendering
  const NO_PRIMARY_RENDERING_ACTIONS = new Set(['logout', 'scrollBottom']);

  // Check if a primary action should trigger primary rendering
  const shouldShowPrimaryRendering = (action: string) => {
    return !NO_PRIMARY_RENDERING_ACTIONS.has(action);
  };

  // Handle multimedia content generation
  const handleMultimediaContent = (content: string) => {
    setInput(content);
    // Automatically send the generated content
    setTimeout(() => {
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      handleSendMessage(fakeEvent);
    }, 100);
  };

  // Get label for primary actions
  const getPrimaryActionLabel = (action: string) => {
    const labelMap: { [key: string]: string } = {
      generateSummary: 'Generate Summary',
      showFleetSpanFilters: 'Show Fleet Filters',
      manageContacts: 'Manage Contacts',
      logout: 'Logout',
      selectAircraft: 'Select Aircraft',
      scrollBottom: 'Continue',
    };

    return labelMap[action] || action;
  };

  // Get primary rendering message for actions that support it
  const getPrimaryRenderingMessage = (action: string, toolName: string) => {
    switch (action) {
      case 'generateSummary':
        return {
          text: 'Generating conversation summary...',
          isUser: false,
          toolOutputId: generateUniqueId('summary'),
        };

      case 'showFleetSpanFilters':
        return {
          text: 'All Aircraft:',
          isUser: false,
          isAircraftList: true,
          filter: 'all',
          toolOutputId: generateUniqueId('fleet_filters'),
        };

      case 'manageContacts':
        // This will be populated with actual contacts when the component renders
        return {
          text: '',
          isUser: false,
          isContactsList: true,
          contacts: [], // Will be fetched by MessageContainer
          toolOutputId: generateUniqueId('contacts_mgmt'),
        };

      case 'selectAircraft':
        return {
          text: 'Please select an aircraft from the fleet:',
          isUser: false,
          isAircraftList: true,
          filter: 'all',
          toolOutputId: generateUniqueId('aircraft_select'),
        };

      default:
        return null;
    }
  };

  // Handle aircraft selection
  const handleAircraftSelect = (aircraft: any) => {
    onAircraftSelect?.(aircraft);

    // Clear the Primary Action container after aircraft selection for tools with primary actions
    if (currentContainer) {
      setCurrentContainer((prev: any) => {
        if (!prev) return prev;

        // Clear primary subcontainer if it exists
        const updatedContainer = {
          ...prev,
          primarySubcontainer: null,
        };

        // Also clear any primary action messages from the main messages array
        updatedContainer.messages = prev.messages.filter(
          (msg: any) => !msg.isPrimaryAction && !msg.isAircraftList,
        );

        return updatedContainer;
      });

      // Focus the chat input after clearing the container
      setTimeout(() => {
        if (chatInputRef.current) {
          chatInputRef.current.focus();
        }
      }, 100);
    }
  };

  // Helper function to filter container messages to only include DirectChat content
  const filterToDirectChatOnly = (container: any) => {
    if (!container || !container.messages) return null;

    // Filter messages to only include DirectChat content (user messages and bot text responses)
    const directChatMessages = container.messages.filter((msg: any) => {
      // Keep user messages
      if (msg.isUser) return true;

      // Keep bot text responses that are not selective actions, primary actions, or tool outputs
      return (
        !msg.isUser &&
        msg.text &&
        !msg.isSelectiveAction &&
        !msg.isPrimaryAction &&
        !msg.isAircraftList &&
        !msg.isContactsList
      );
    });

    // Only return container if it has meaningful DirectChat content
    if (directChatMessages.length > 0) {
      return {
        ...container,
        messages: directChatMessages,
      };
    }

    return null;
  };

  // Helper function to check if container has Direct Chat content
  const hasDirectChatContent = (container: any) => {
    const filteredContainer = filterToDirectChatOnly(container);
    return filteredContainer !== null;
  };

  // Create new container helper
  const createNewContainer = (toolName: string) => {
    if (currentContainer) {
      // Filter to only DirectChat content and add to prior containers if it has meaningful content
      const filteredContainer = filterToDirectChatOnly(currentContainer);
      if (filteredContainer) {
        setPriorContainers((prev) => [...prev, filteredContainer]);
      }
    }
    setCurrentContainer({
      id: generateUniqueId('section'),
      toolName,
      messages: [],
    });
  };

  // Message sending with slash command support
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input;

    // Check for slash commands
    if (userMessage.startsWith('/')) {
      const commandName = userMessage.slice(1).split(' ')[0].toLowerCase();
      const matchingTool = (tools as any[]).find((tool: any) =>
        tool.name.toLowerCase().includes(commandName),
      );

      if (matchingTool) {
        handleToolClick(matchingTool);
        setInput('');
        return;
      }
    }

    // Create generic current container if none exists
    if (!currentContainer) {
      const newContainer = {
        id: generateUniqueId('current'),
        toolName: 'Chat',
        messages: [{ text: userMessage, isUser: true }],
      };
      setCurrentContainer(newContainer);
    } else {
      // Add to existing container
      setCurrentContainer((prev: any) => ({
        ...prev,
        messages: [...prev.messages, { text: userMessage, isUser: true }],
      }));
    }

    setInput('');
    setIsLoading(true);

    // Show typing indicator after message is sent
    setTimeout(() => {
      setIsTyping(true);
    }, 500);

    // Store user message immediately to database
    try {
      await fetch('/api/conversation-history/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          threadId: conversationId,
          messageText: userMessage,
          messageType: 'user',
        }),
      });
      console.log('Saved user message to database');
    } catch (dbError) {
      console.error('Error saving user message to database:', dbError);
    }

    // Send to backend for AI response
    try {
      const response = await fetch('/chat-api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          conversationId: conversationId,
          context: currentContainer ? 'existing_chat' : 'new_chat',
        }),
      });

      const data = await response.json();

      // Update conversationId if received from external API
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }

      // Store bot response to database immediately
      const botResponse =
        data.response || "I received your message and I'm processing it.";
      try {
        await fetch('/api/conversation-history/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            threadId: data.conversationId || conversationId,
            messageText: botResponse,
            messageType: 'system',
          }),
        });
        console.log('Saved bot response to database');
      } catch (dbError) {
        console.error('Error saving bot response to database:', dbError);
      }

      setTimeout(() => {
        // Add bot response to the Direct Chat sub-container (3rd message in the container)
        setCurrentContainer((prev: any) => {
          let response = botResponse;
          // Auto-detect HTML content
          let isHtmlContent = /<[^>]*>/g.test(response);

          // Process the response for better formatting
          if (isHtmlContent) {
            // Convert markdown-style links [text](url) to HTML links first (most specific)
            response = response.replace(
              /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
              '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">$1</a>',
            );

            // Handle relative paths by converting them to full SharePoint URLs
            response = response.replace(
              /\[([^\]]+)\]\(\/([^)]+)\)/g,
              '<a href="https://ironfleet.sharepoint.com/sites/DataIngestion/Shared%20Documents/$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">$1</a>',
            );

            // Clean up any duplicate link artifacts from the API
            response = response.replace(
              /\]\(<a href="([^"]+)"[^>]*>([^<]+)<\/a>\)\./g,
              '</a>',
            );
            response = response.replace(
              /\[([^\]]+)\]\(<a href="([^"]+)"[^>]*>[^<]*<\/a>\)\./g,
              '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">$1</a>',
            );

            // Convert standalone SharePoint URLs to clickable links (only if not already in link tags)
            response = response.replace(
              /(?<!href=")(?<!>)(https:\/\/ironfleet\.sharepoint\.com[^\s\)<]+)(?![^<]*<\/a>)/g,
              '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">$1</a>',
            );

            // Convert <br> tags to proper line breaks
            response = response.replace(/<br\s*\/?>/g, '<br/>');

            // Convert **bold** markdown to HTML if any exists
            response = response.replace(
              /\*\*([^*]+)\*\*/g,
              '<strong>$1</strong>',
            );
          } else {
            // If not already HTML, check for URLs and convert them to clickable links
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            if (urlRegex.test(response)) {
              response = response.replace(
                urlRegex,
                '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">$1</a>',
              );
              isHtmlContent = true;
            }
          }

          if (!prev) {
            console.log(
              'No currentContainer, creating new one with bot response',
            );
            // Create new container if none exists
            return {
              id: generateUniqueId(),
              subcontainers: [
                {
                  id: generateUniqueId('direct'),
                  type: 'DirectChat',
                  messages: [
                    {
                      text: response,
                      isUser: false,
                      isHtml: isHtmlContent || data.isHtml || false,
                      responseId: data.id || data.messageId,
                    },
                  ],
                },
              ],
            };
          }
          return {
            ...prev,
            messages: [
              ...prev.messages,
              {
                text: response,
                isUser: false,
                isHtml: isHtmlContent || data.isHtml || false,
                responseId: data.id || data.messageId,
              },
            ],
          };
        });
        setIsLoading(false);
        setIsTyping(false);

        // Auto-scroll to bottom after bot response
        setTimeout(() => {
          scrollToBottom();
        }, 100);

        // Refocus the chat input for continued typing
        setTimeout(() => {
          if (chatInputRef.current) {
            chatInputRef.current.focus();
          }
        }, 100);
      }, 1000);
    } catch (error) {
      console.error('Error sending message:', error);
      setTimeout(() => {
        addMessage({
          text: "I'm having trouble processing your message right now. Please try again.",
          isUser: false,
        });
        setIsLoading(false);
        setIsTyping(false);
      }, 1000);
    }
  };

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles((prev) => [...prev, ...files]);
    setShowToolsMenu(false);
  };

  // Remove uploaded file
  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Command action handler
  const handleCommandAction = (command: any) => {
    setShowToolsMenu(false);

    // Use the same tool handling logic as greeting tools
    handleToolClick(command);
  };

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

    // Fallback to Settings icon if not found
    return <LucideIcons.Settings className={className} />;
  };

  // Render Discreet Greeting system
  const renderGreeting = () => {
    const hasInteracted = currentContainer || priorContainers.length > 0;
    const greetingTools = (tools as any[]).filter(
      (tool: any) => tool.showWithGreeting,
    );

    return (
      <div
        className={`$${
          hasInteracted ? 'pb-36' : 'pt-8 pb-36'
        } text-center max-h-[80vh] overflow-scroll scroll-sm`}
      >
        {' '}
        {/* Show "How can I help..." only on first visit */}
        {!hasInteracted && (
          <h2 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-6">
            How can I help you today?
          </h2>
        )}
        {/* Desktop view - Grid layout */}
        <div className="hidden md:block">
          <div
            className={`${
              hasInteracted
                ? 'flex flex-wrap justify-center gap-3'
                : 'grid grid-cols-2 gap-4 max-w-2xl mx-auto'
            }`}
          >
            {greetingTools.map((tool: any) => (
              <button
                key={tool.id}
                onClick={() => handleToolClick(tool)}
                className={`${
                  hasInteracted
                    ? `px-4 py-2 text-sm rounded-xl border font-medium transition-all duration-200 ${
                        currentContainer?.toolName === tool.name
                          ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-500'
                      }`
                    : `p-4 rounded-2xl border text-left transition-all duration-200 hover:shadow-md ${
                        currentContainer?.toolName === tool.name
                          ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`
                }`}
              >
                {hasInteracted ? (
                  // Short greeting: icon + tool name + notification count
                  <span className="flex items-center gap-2 relative">
                    <span className="text-gray-500 dark:text-gray-400">
                      {getToolIcon(tool)}
                    </span>
                    <span className="font-medium">{tool.name}</span>
                    {tool.name === 'Notifications' && notificationCount > 0 && (
                      <Badge
                        className={`ml-1 h-5 px-2 text-xs bg-red-500 text-white font-medium ${
                          showBuzz ? 'animate-pulse ring-2 ring-red-300' : ''
                        }`}
                      >
                        {notificationCount}
                      </Badge>
                    )}
                  </span>
                ) : (
                  // Large greeting: icon + name + description + notification count
                  <>
                    <div className="font-semibold text-base flex items-center gap-3 relative mb-2">
                      <span className="text-gray-500 dark:text-gray-400">
                        {getToolIcon(tool)}
                      </span>
                      <span>{tool.name}</span>
                      {tool.name === 'Notifications' &&
                        notificationCount > 0 && (
                          <Badge
                            className={`ml-1 h-5 px-2 text-xs bg-red-500 text-white font-medium ${
                              showBuzz
                                ? 'animate-pulse ring-2 ring-red-300'
                                : ''
                            }`}
                          >
                            {notificationCount}
                          </Badge>
                        )}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      {tool.description || `Access ${tool.name} functionality`}
                    </div>
                  </>
                )}
              </button>
            ))}
          </div>
        </div>
        {/* Mobile view - Dropdown menu */}
        <div className="md:hidden flex justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="lg"
                className="flex items-center gap-2 h-12 px-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <span className="text-base font-medium">
                  {hasInteracted ? 'Quick Tools' : 'How can I help you?'}
                </span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-72">
              {greetingTools.map((tool: any) => (
                <DropdownMenuItem
                  key={tool.id}
                  className="flex items-center gap-3 p-3 cursor-pointer"
                  onClick={() => handleToolClick(tool)}
                >
                  <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    {getToolIcon(tool)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                      {tool.name}
                      {tool.name === 'Notifications' &&
                        notificationCount > 0 && (
                          <Badge
                            className={`h-5 px-2 text-xs bg-red-500 text-white font-medium ${
                              showBuzz
                                ? 'animate-pulse ring-2 ring-red-300'
                                : ''
                            }`}
                          >
                            {notificationCount}
                          </Badge>
                        )}
                    </div>
                    {!hasInteracted && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {tool.description ||
                          `Access ${tool.name} functionality`}
                      </div>
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  // Custom notification handler for navigation without UI
  const handleNotificationNavigation = (message: any) => {
    // Create a contact object from the message for opening chat
    const contact = {
      id: message.messageType === 'Group' ? message.groupId : message.senderId,
      name:
        message.messageType === 'Group'
          ? message.groupName || 'Group Chat'
          : message.senderName,
      email: `${message.senderId}@temp.com`, // Temporary email for API compatibility
      messageType: message.messageType,
      groupId: message.groupId,
      groupName: message.groupName,
      contactId: message.senderId, // Add contactId for proper message routing
    };

    setSelectedContactsForChat([contact]);
    setShowChatWindow(true);
  };

  // If chat window is open, render the full-screen chat interface
  if (showChatWindow) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-gray-900 pt-20">
        <FullScreenChatInterface
          selectedContacts={selectedContactsForChat}
          contacts={selectedContactsForChat}
          onClose={() => setShowChatWindow(false)}
          currentUserId={user?.id}
          onNavigateToTool={(toolName: string) => {
            // Close chat window and navigate to tool
            setShowChatWindow(false);

            // Find the tool and trigger its action
            const tool = tools.find((t: any) => t.name === toolName);
            if (tool) {
              handleToolClick(tool);
            }
          }}
        />
      </div>
    );
  }

  const hasInteracted = currentContainer || priorContainers.length > 0;

  return (
    <div
      className={`flex flex-col ${
        hasInteracted ? 'h-full' : ''
      } bg-gray-50 dark:bg-gray-900 pt-20`}
    >
      <div
        ref={chatAreaRef}
        className={`w-full max-w-5xl mx-auto ${
          hasInteracted ? 'flex-1' : ''
        } overflow-y-auto px-6 pt-6`}
      >
        {renderGreeting()}
        {/* Render prior containers */}
        {priorContainers.map((container) => (
          <MessageContainer
            key={container.id}
            container={container}
            isCurrentContainer={false}
            onSelectiveAction={handleSelectiveAction}
            onAircraftSelect={handleAircraftSelect}
            onRating={handleRating}
            onChatOpen={(contact) => {
              setSelectedContactsForChat([contact]);
              setShowChatWindow(true);
            }}
            selectedStatusFilter={selectedStatusFilter}
          />
        ))}
        {/* Render current container */}
        {currentContainer && (
          <MessageContainer
            container={currentContainer}
            isCurrentContainer={true}
            onSelectiveAction={handleSelectiveAction}
            onAircraftSelect={handleAircraftSelect}
            onRating={handleRating}
            onChatOpen={(contact) => {
              setSelectedContactsForChat([contact]);
              setShowChatWindow(true);
            }}
            selectedStatusFilter={selectedStatusFilter}
          />
        )}
        {isTyping && (
          <div className="flex justify-start mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 max-w-xs shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced chat input form with modern styling */}
      <div className="absolute bottom-0 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-t border-gray-200/60 dark:border-gray-700/60">
        <form
          onSubmit={handleSendMessage}
          className="p-2 w-full max-w-4xl mx-auto"
        >
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={() => setShowMultimediaInput(true)}
              className="group relative p-3 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 border border-gray-200 dark:border-gray-600 rounded-xl cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-700 transition-all duration-200 hover:scale-105 hover:shadow-md"
              title="Make observation (photo, video, audio)"
              disabled={isLoading}
            >
              <LucideIcons.Camera className="w-5 h-5 transition-transform group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/10 group-hover:to-purple-500/10 rounded-xl transition-all duration-300"></div>
            </button>

            {/* Enhanced input container with floating label effect */}
            <div className="flex-1 relative group">
              <div className="relative">
                <input
                  ref={chatInputRef}
                  type="text"
                  value={input}
                  multiple={true}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask, Action, or Observe"
                  className="w-full px-4 py-4 pr-12 bg-gray-50/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-300 dark:focus:border-blue-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800 focus:bg-white dark:focus:bg-gray-800 shadow-sm hover:shadow-md focus:shadow-lg"
                  disabled={isLoading}
                />

                {/* Voice input button with enhanced styling */}
                <button
                  type="button"
                  disabled={isLoading || !supported}
                  onClick={toggle}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-full transition-all duration-200 hover:scale-110 ${
                    isListening
                      ? 'text-red-500 bg-red-50 dark:bg-red-900/20 animate-pulse'
                      : 'text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                  } ${!supported ? 'opacity-40 cursor-not-allowed' : ''}`}
                  title={
                    !supported
                      ? 'Voice input not supported'
                      : (() => {
                          const isDevelopment =
                            window.location.hostname === 'localhost' ||
                            window.location.hostname === '127.0.0.1' ||
                            window.location.protocol === 'http:';
                          if (isDevelopment) {
                            return isListening
                              ? 'Stop listening (Note: Voice input requires HTTPS in production)'
                              : 'Voice input (Note: Requires HTTPS in production)';
                          }
                          return isListening ? 'Stop listening' : 'Voice input';
                        })()
                  }
                >
                  <div className="relative">
                    <span className="text-lg">{isListening ? '🔴' : '🎤'}</span>
                    <div
                      className={`absolute inset-0 rounded-full transition-opacity duration-300 ${
                        isListening
                          ? 'bg-red-500/20 animate-ping opacity-100'
                          : 'bg-blue-500/20 opacity-0 hover:opacity-100'
                      }`}
                    ></div>
                  </div>
                </button>
              </div>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowToolsMenu(!showToolsMenu)}
                className="group relative p-3 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-700 transition-all duration-200 hover:scale-105 hover:shadow-md"
                title="Quick tools"
              >
                <svg
                  className="w-5 h-5 transition-transform group-hover:rotate-12"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
                  />
                </svg>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/10 group-hover:to-purple-500/10 rounded-xl transition-all duration-300"></div>
              </button>

              {/* Enhanced tools dropdown */}
              {showToolsMenu && (
                <div className="absolute bottom-full right-[-50px] mb-3 w-80 bg-white/95 dark:bg-gray-800/95 border border-gray-200/60 dark:border-gray-600/60 rounded-2xl shadow-2xl backdrop-blur-sm z-10 animate-in slide-in-from-bottom-2 duration-200">
                  <div className="p-4">
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 px-2">
                      Quick Actions
                    </div>
                    <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800 space-y-2">
                      {(commands as any[]).map(
                        (command: any, index: number) => (
                          <button
                            key={command.id || index}
                            type="button"
                            onClick={() => handleCommandAction(command)}
                            className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl flex items-center space-x-3 transition-all duration-200 hover:scale-[1.02] group"
                          >
                            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors duration-200">
                              {renderIcon(command.icon, 'w-4 h-4')}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                                /{command.name}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {command.description}
                              </div>
                            </div>
                            <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <svg
                                className="w-4 h-4 text-blue-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </div>
                          </button>
                        ),
                      )}
                      {(commands as any[]).length === 0 && (
                        <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400 text-sm">
                          <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                            <svg
                              className="w-6 h-6"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
                              />
                            </svg>
                          </div>
                          No commands available
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Enhanced send button with gradient and animations */}
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="group relative p-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 disabled:hover:scale-100 overflow-hidden"
            >
              {/* Animated background effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-white/0 to-blue-400/0 group-hover:from-blue-400/20 group-hover:via-white/20 group-hover:to-blue-400/20 transition-all duration-500 transform -skew-x-12 -translate-x-full group-hover:translate-x-full"></div>

              {/* Button content */}
              <div className="relative flex items-center justify-center">
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg
                    className="w-5 h-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                )}
              </div>
            </button>
          </div>

          {/* Enhanced file upload preview */}
          {uploadedFiles.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3">
              {uploadedFiles.map((file, index) => (
                <div
                  key={index}
                  className="group flex items-center space-x-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-700 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
                >
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-blue-600 dark:text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200 truncate max-w-32">
                    {file.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="flex-shrink-0 p-1 text-blue-600 hover:text-red-600 dark:text-blue-400 dark:hover:text-red-400 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 hover:scale-110"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </form>
      </div>

      {/* File Drawer */}
      <FileDrawer
        isOpen={isFileDrawerOpen}
        onClose={() => setIsFileDrawerOpen(false)}
      />
      {/* NotificationCenter component */}
      {/* <NotificationCenter
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      /> */}

      {/* MultimediaInput component */}
      <MultimediaInput
        isOpen={showMultimediaInput}
        onClose={() => setShowMultimediaInput(false)}
        onContentGenerated={handleMultimediaContent}
      />
    </div>
  );
}

export default SimpleChatbot;
