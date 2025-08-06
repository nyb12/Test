import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ChatbotHeader from "@/components/layout/ChatbotHeader";
import { Textarea } from "@/components/ui/textarea";
import { 
  smartScroll, 
  isNearBottom, 
  autoSmartScroll, 
  addScrollListener 
} from "@/lib/scroll-utils";
import { 
  Loader2, 
  Send, 
  FileText, 
  Plus, 
  Upload, 
  Video, 
  Mic, 
  MicOff,
  Volume2,
  VolumeX,
  ArrowLeft,
  Search,
  History,
  User,
  MessageSquare,
  X,
  MoreHorizontal,
  Share,
  Plane,
  Wrench,
  MapPin,
  ShieldCheck,
  BarChart3,
  AlertTriangle,
  Cloud,
  Settings,
  HelpCircle,
  Eye,
  MessageCircle,
  LogOut,
  Phone,
  ChevronDown
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { TypingIndicator } from "@/components/ui/typing-indicator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type Message = {
  text: string;
  isUser: boolean;
  rating?: number;
  id?: number; // Database ID for the conversation
  isAircraftCard?: boolean;
  aircraft?: any;
  isSelectiveAction?: boolean;
  selectivePrompts?: any[];
  isContactsList?: boolean;
  contacts?: any[];
  toolOutputId?: string; // Unique identifier for scroll targeting
  isAircraftSelector?: boolean;
};

const BOT_RESPONSES = [
  "I'm Ironfleet, your helpful assistant!",
  "That's an interesting question. How can I help you further?",
  "I'm designed to assist you with your queries.",
  "Thanks for chatting with me today!",
  "I don't have all the answers, but I'm here to help.",
  "I appreciate your patience as I'm still learning.",
  "Could you tell me more about that?",
  "Let me know if there's anything else I can help with.",
  "The Ironfleet system is ready to assist with your shipping needs.",
  "Our tracking system ensures your packages never get lost.",
  "We offer competitive rates for both domestic and international shipping.",
  "Ironfleet prides itself on reliable and efficient delivery services."
];

export default function SimpleChatbot({ selectedAircraft, onAircraftSelect }: { 
  selectedAircraft?: any; 
  onAircraftSelect?: (aircraft: any) => void; 
} = {}) {
  const [messages, setMessages] = useState<Message[]>([
    { text: "How can I help you today?", isUser: false }
  ]);
  const [input, setInput] = useState("");
  
  const handleOptionClick = (option: string) => {
    setInput(`[${option}] `);
  };
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState("");
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [greetingTools, setGreetingTools] = useState<any[]>([]);
  const [toolboxTools, setToolboxTools] = useState<any[]>([]);
  const [isLoadingToolboxTools, setIsLoadingToolboxTools] = useState(true);
  const [localSelectedAircraft, setLocalSelectedAircraft] = useState<any>(selectedAircraft);
  const [isFleetSpanMode, setIsFleetSpanMode] = useState(false);
  const [lastSelectiveActionTool, setLastSelectiveActionTool] = useState<string | null>(null);
  const [selectedGreetingTool, setSelectedGreetingTool] = useState<string | null>(null);
  const [clickedActions, setClickedActions] = useState<Set<string>>(new Set());
  const [selectedContacts, setSelectedContacts] = useState<Set<number>>(new Set());
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  
  // Collapsible history feature with tokenized containers
  const [completedSections, setCompletedSections] = useState<Array<{
    id: string;
    toolName: string;
    messages: Message[];
    timestamp: number;
    isExpanded: boolean;
    token: string;
  }>>([]);
  const [currentSectionMessages, setCurrentSectionMessages] = useState<Message[]>([]);
  const [isCapturingToolSession, setIsCapturingToolSession] = useState(false);
  const [currentToolName, setCurrentToolName] = useState<string>("");
  const [hasCreatedInitialContainer, setHasCreatedInitialContainer] = useState(false);

  // Function to collapse current tool section and create new tokenized container
  const collapseCurrentSection = (toolName: string) => {
    console.log(`📦 collapseCurrentSection called with: ${toolName}, messages: ${currentSectionMessages.length}`);
    if (currentSectionMessages.length > 0) {
      const newSection = {
        id: `section_${Date.now()}`,
        toolName,
        messages: [...currentSectionMessages],
        timestamp: Date.now(),
        isExpanded: false,
        token: `collapsed_${Date.now()}`
      };
      console.log(`✅ Creating new section:`, newSection);
      setCompletedSections(prev => [...prev, newSection]);
      setCurrentSectionMessages([]);
    } else {
      console.log(`❌ No messages to collapse for ${toolName}`);
    }
  };

  // Function to toggle section expansion
  const toggleSectionExpansion = (sectionId: string) => {
    setCompletedSections(prev => 
      prev.map(section => 
        section.id === sectionId 
          ? { ...section, isExpanded: !section.isExpanded }
          : section
      )
    );
  };

  // Function to add message to current section
  const addToCurrentSection = (message: Message) => {
    console.log(`📝 Adding to current section:`, {
      text: message.text?.substring(0, 50) + "...",
      isUser: message.isUser,
      isSelectiveAction: message.isSelectiveAction,
      isAircraftCard: message.isAircraftCard,
      toolOutputId: message.toolOutputId
    });
    setCurrentSectionMessages(prev => [...prev, message]);
  };

  // Create initial container for new chat (excluding greeting)
  const createInitialContainer = () => {
    if (!hasCreatedInitialContainer && messages.length > 1) {
      // Skip the first message (greeting) and only include user interactions
      const nonGreetingMessages = messages.slice(1);
      if (nonGreetingMessages.length > 0) {
        const initialSection = {
          id: `section_${Date.now()}`,
          toolName: "New Chat",
          messages: nonGreetingMessages,
          timestamp: Date.now(),
          isExpanded: false,
          token: `initial_${Date.now()}`
        };
        console.log(`🎬 Creating initial container:`, initialSection);
        setCompletedSections(prev => [...prev, initialSection]);
        setHasCreatedInitialContainer(true);
      }
    }
  };

  // Auto-create initial container only when user starts interacting (not for greeting)
  useEffect(() => {
    if (!hasCreatedInitialContainer && messages.length > 1 && !isCapturingToolSession) {
      // Only create container when there's more than just the greeting message
      setTimeout(() => createInitialContainer(), 500);
    }
  }, [messages.length, hasCreatedInitialContainer, isCapturingToolSession]);

  // Wrapper function for setMessages that automatically captures during tool sessions
  const addMessage = (messageOrUpdater: Message | ((prev: Message[]) => Message[])) => {
    setMessages(prevMessages => {
      const newMessages = typeof messageOrUpdater === 'function' 
        ? messageOrUpdater(prevMessages) 
        : [...prevMessages, messageOrUpdater];
      
      // Create initial container when first tool is accessed
      if (!hasCreatedInitialContainer && newMessages.length > 0 && !isCapturingToolSession) {
        setTimeout(() => createInitialContainer(), 100);
      }
      
      // If we're capturing a tool session, add new messages to current section
      if (isCapturingToolSession && typeof messageOrUpdater !== 'function') {
        addToCurrentSection(messageOrUpdater);
      } else if (isCapturingToolSession && typeof messageOrUpdater === 'function') {
        // Handle updater function case - capture any newly added messages
        const addedMessages = newMessages.slice(prevMessages.length);
        addedMessages.forEach(msg => addToCurrentSection(msg));
      }
      
      return newMessages;
    });
  };

  // Function to manually end current tool session and create container
  const endCurrentToolSession = () => {
    if (isCapturingToolSession && currentSectionMessages.length > 0) {
      collapseCurrentSection(currentToolName || "Tool Interaction");
      setIsCapturingToolSession(false);
      setCurrentToolName("");
    }
  };

  // Function to reset container system for new chat
  const resetContainerSystem = () => {
    console.log(`🔄 Resetting container system for new chat`);
    setCompletedSections([]);
    setCurrentSectionMessages([]);
    setIsCapturingToolSession(false);
    setCurrentToolName("");
    setHasCreatedInitialContainer(false);
  };

  // Function to toggle contact selection
  const toggleContactSelection = (contactId: number) => {
    setSelectedContacts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  };





  // Handle scroll events to show/hide scroll-to-bottom button
  const handleScroll = () => {
    const nearBottom = isNearBottom('messages-container', 400);
    const messagesContainer = document.getElementById('messages-container');
    if (messagesContainer) {
      const { scrollHeight, clientHeight } = messagesContainer;
      setShowScrollToBottom(!nearBottom && scrollHeight > clientHeight);
    }
  };

  // Scroll to bottom function using utility
  const handleScrollToBottom = () => {
    smartScroll({ scrollBottom: true, containerId: 'messages-container' });
    setShowScrollToBottom(false);
  };

  // Messages auto-scroll to bottom when new messages arrive - but respect token-based scrolling
  useEffect(() => {
    const container = document.getElementById('messages-container');
    if (container && !isNearBottom()) {
      // Check if the latest message has token-based scroll targeting
      const lastMessage = messages[messages.length - 1];
      const hasTokenTarget = lastMessage?.toolOutputId || lastMessage?.isSelectiveAction || lastMessage?.isAircraftSelector;
      
      // Only auto-scroll if no token-based targeting is active
      if (!hasTokenTarget) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [messages]);

  // Add scroll event listener using utility
  useEffect(() => {
    return addScrollListener(handleScroll, 'messages-container');
  }, []);

  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [newContactForm, setNewContactForm] = useState({
    name: "",
    role: "",
    company: "",
    email: "",
    phone: ""
  });
  const [contactSearchQuery, setContactSearchQuery] = useState("");

  // Generic selective action click handler with double-click prevention
  const handleSelectiveActionClick = async (prompt: any) => {
    // Debug logging
    console.log('Click handler - prompt object:', prompt);
    console.log('allow_double_click value:', prompt.allow_double_click);
    console.log('allow_double_click type:', typeof prompt.allow_double_click);
    
    // Check if double-click prevention should be active
    const actionKey = `${prompt.on_click_event}_${prompt.prompt_value}`;
    console.log('Action key:', actionKey);
    console.log('Clicked actions set:', Array.from(clickedActions));
    
    // Determine if prevention is active (explicit false OR specific actions where undefined means false)
    const preventDoubleClick = prompt.allow_double_click === false || 
      (prompt.prompt_value === 'Manage Contacts' && prompt.allow_double_click === undefined);
    
    console.log('Prevention active:', preventDoubleClick);
    
    // If double-click prevention is active and action was already clicked, prevent execution
    if (preventDoubleClick && clickedActions.has(actionKey)) {
      console.log('Double-click prevented for:', prompt.prompt_value);
      return true; // Return true to indicate click was handled
    }
    
    // Clear cooldowns for other actions when any new action is clicked
    setClickedActions(prev => {
      const newSet = new Set();
      // Only keep the current action if it has prevention active
      if (preventDoubleClick) {
        newSet.add(actionKey);
      }
      return newSet;
    });
    
    // Set cooldown timer only if prevention is active for this action
    if (preventDoubleClick) {
      // Reset after 10 seconds to allow future clicks
      setTimeout(() => {
        setClickedActions(prev => {
          const newSet = new Set(prev);
          newSet.delete(actionKey);
          return newSet;
        });
      }, 10000);
    }
    
    setSelectedSelectiveAction(prompt.prompt_value);
    console.log('Filtering by:', prompt.prompt_value);
    
    // Use the function registry to execute the action
    console.log('Full prompt object:', prompt);
    console.log('Looking for function:', prompt.on_click_event);
    console.log('Available functions:', Object.keys(selectiveActionFunctions));
    const eventHandler = selectiveActionFunctions[prompt.on_click_event as keyof typeof selectiveActionFunctions];
    if (eventHandler) {
      console.log('Found and calling function:', prompt.on_click_event);
      await eventHandler(prompt.prompt_value);
      return;
    } else {
      console.log('Function not found, using fallback logic');
      // Fallback to aircraft filtering logic for FleetSpan actions
      const filterMessage = {
        text: `Show all ${prompt.prompt_value.toLowerCase()} aircraft`,
        isUser: true
      };
      setMessages(prev => [...prev, filterMessage]);
      
      // Auto-scroll to show the filter message
      setTimeout(() => {
        const messagesContainer = document.getElementById('messages-container');
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }, 100);
      
      // Show typing indicator while fetching
      setIsTyping(true);
      
      try {
        // Fetch all aircraft
        const response = await fetch('/api/aircraft');
        const allAircraft = await response.json();
        
        // Filter aircraft based on status
        const filteredAircraft = allAircraft.filter((aircraft: any) => {
          const status = prompt.prompt_value.toLowerCase();
          if (status === 'operational') {
            return aircraft.primary_status === 'operational';
          } else if (status === 'grounded') {
            return aircraft.primary_status === 'grounded';
          } else if (status === 'limited/monitor') {
            return aircraft.primary_status === 'limited/monitor' || 
                   aircraft.secondary_statuses?.includes('limited/monitor');
          } else if (status === 'scheduled') {
            return aircraft.primary_status === 'scheduled' || 
                   aircraft.secondary_statuses?.includes('scheduled');
          }
          return false;
        });
        
        setIsTyping(false);
        
        if (filteredAircraft.length === 0) {
          const noResultsMessage = {
            text: `No ${prompt.prompt_value.toLowerCase()} aircraft found in the fleet.`,
            isUser: false,
            toolOutputId: `fleetspan_${Date.now()}` // Unique ID for scroll targeting
          };
          setMessages(prev => [...prev, noResultsMessage]);
        } else {
          const aircraftMessage = {
            text: `Found ${filteredAircraft.length} ${prompt.prompt_value.toLowerCase()} aircraft:`,
            isUser: false,
            isAircraftCard: true,
            aircraft: filteredAircraft,
            toolOutputId: `fleetspan_${Date.now()}` // Unique ID for scroll targeting
          };
          setMessages(prev => [...prev, aircraftMessage]);
          
          // Auto-scroll handled by Smart 3-Rule system
        }
        
        // Auto-scroll handled by useEffect
        
      } catch (error) {
        setIsTyping(false);
        console.error('Error fetching aircraft:', error);
        const errorMessage = {
          text: `Sorry, I couldn't fetch the ${prompt.prompt_value.toLowerCase()} aircraft data. Please try again.`,
          isUser: false
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    }
  };
  const [selectedSelectiveAction, setSelectedSelectiveAction] = useState<string | null>(null);
  const [selectedToolboxTool, setSelectedToolboxTool] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => 
    // Generate unique session ID when component loads
    `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );

  // Helper function to check if a tool is summarizable
  const checkIfToolSummarizable = async (toolName: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/tools`);
      const tools = await response.json();
      const tool = tools.find((t: any) => t.name === toolName);
      return tool?.summarizeable !== false; // Default to true if not specified
    } catch (error) {
      console.error('Error checking tool summarizable status:', error);
      return true; // Default to true on error
    }
  };

  // Active event handler registry for checking button states
  const activeEventHandlers = {
    hasSelectedContacts: () => selectedContacts.size > 0,
    hasSelectedAircraft: () => selectedAircraft !== null,
    alwaysActive: () => true,
    alwaysInactive: () => false
  };

  // Function registry for selective actions
  const selectiveActionFunctions = {
    filterFleetByStatus: async (promptValue: string) => {
      console.log('Filtering by:', promptValue);
      
      // Show typing indicator while fetching
      setIsTyping(true);
      
      try {
        // Fetch all aircraft
        const response = await fetch('/api/aircraft');
        if (!response.ok) {
          throw new Error(`Failed to fetch aircraft: ${response.status}`);
        }
        const aircraftData = await response.json();
        console.log('Aircraft data received:', aircraftData);
        
        // Filter aircraft by status
        const filteredAircraft = aircraftData.filter((aircraft: any) => {
          const status = promptValue.toLowerCase();
          console.log(`Filtering aircraft ${aircraft.tail_number} with status ${aircraft.primary_status} against filter ${status}`);
          
          if (status === 'operational') {
            return aircraft.primary_status === 'operational';
          } else if (status === 'grounded') {
            return aircraft.primary_status === 'grounded';
          } else if (status === 'limited/monitor') {
            return aircraft.primary_status === 'limited/monitor' || 
                   aircraft.secondary_statuses?.includes('limited/monitor');
          } else if (status === 'scheduled') {
            return aircraft.primary_status === 'scheduled' || 
                   aircraft.secondary_statuses?.includes('scheduled');
          }
          return false;
        });
        
        console.log('Filtered aircraft result:', filteredAircraft);
        setIsTyping(false);
        
        // Add filtered results
        if (filteredAircraft.length === 0) {
          const noResultsMessage = {
            text: `No ${promptValue.toLowerCase()} aircraft found in the fleet.`,
            isUser: false,
            toolOutputId: `fleetspan_${Date.now()}`
          };
          addMessage(noResultsMessage);
        } else {
          const aircraftMessage = {
            text: `Found ${filteredAircraft.length} ${promptValue.toLowerCase()} aircraft:`,
            isUser: false,
            isAircraftCard: true,
            aircraft: filteredAircraft,
            toolOutputId: `fleetspan_${Date.now()}`
          };
          addMessage(aircraftMessage);
        }
      } catch (error) {
        console.error('Error filtering fleet:', error);
        console.error('Error details:', error.message, error.stack);
        setIsTyping(false);
        const errorMessage = {
          text: `Sorry, I couldn't filter the fleet data right now. Error: ${error.message}`,
          isUser: false
        };
        addMessage(errorMessage);
      }
    },

    manageContacts: async () => {
      console.log('Managing contacts');
      
      try {
        // Fetch real contacts from database
        const response = await fetch('/api/contacts/all');
        const contactsData = await response.json();
        console.log('Fetched contacts from database:', contactsData);
      
        // Add unique identifier for scroll targeting
        const contactsToken = `contacts_${Date.now()}`;
        const contactsMessage = {
          text: `Aviation Network Contacts (${contactsData.length} total)`,
          isUser: false,
          isContactsList: true,
          contacts: contactsData,
          toolOutputId: contactsToken // Unique ID for scroll targeting
        };
        addMessage(contactsMessage);
        
        // No scroll needed - the initial selective actions scroll handles targeting
        
      } catch (error) {
        console.error('Error fetching contacts:', error);
        const errorMessage = {
          text: "Could not load contacts. Please try again.",
          isUser: false
        };
        addMessage(errorMessage);
      }
    },

    chatNow: async () => {
      console.log('Starting chat');
      
      const chatMessage = {
        text: "Chat feature is ready! You can now communicate with your aviation network contacts.",
        isUser: false
      };
      setMessages(prev => [...prev, chatMessage]);
      
      // Auto-scroll to bottom after chat action
      setTimeout(() => {
        const messagesContainer = document.getElementById('messages-container');
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }, 100);
    },

    selectAircraft: async () => {
      console.log('Selecting aircraft');
      
      try {
        // Fetch aircraft data
        const response = await fetch('/api/aircraft');
        const aircraftData = await response.json();
        console.log('Fetched aircraft from database:', aircraftData);
        
        const toolOutputId = `aircraft-selector-${Date.now()}`;
        const aircraftSelectorMessage = {
          text: "Please select an aircraft to continue:",
          isUser: false,
          isAircraftSelector: true,
          aircraft: aircraftData,
          toolOutputId,
          selectiveActions: aircraftData.map((aircraft: any, index: number) => ({
            id: aircraft.id || index + 1,
            prompt_value: `${aircraft.tail_number} - ${aircraft.model}`,
            inactive_label: null,
            active_event_handler: null,
            css_classes: getStatusClasses(aircraft.primary_status),
            on_click_event: "selectSpecificAircraft",
            aircraft_data: aircraft
          }))
        };
        
        addMessage(aircraftSelectorMessage);
        
        return toolOutputId; // Return token for precise targeting
        
      } catch (error) {
        console.error('Error fetching aircraft:', error);
        const errorMessage = {
          text: "Could not load aircraft list. Please try again.",
          isUser: false
        };
        addMessage(errorMessage);
        return null;
      }
    },

    selectSpecificAircraft: async (promptValue: string, aircraftData: any) => {
      console.log('selectSpecificAircraft function called!', aircraftData);
      
      // Update the selected aircraft
      setLocalSelectedAircraft(aircraftData);
      onSelectAircraft(aircraftData);
      
      // Show confirmation message
      const confirmationMessage = {
        text: `Selected: ${aircraftData.tail_number} - ${aircraftData.model}`,
        isUser: false,
        toolOutputId: `aircraft-selected-${Date.now()}`,
        isAircraftSelected: true,
        selectedAircraft: aircraftData
      };
      
      setMessages(prev => [...prev, confirmationMessage]);
      
      // Force scroll to bottom for aircraft selection confirmation
      setTimeout(() => {
        const messagesContainer = document.getElementById('messages-container');
        if (messagesContainer) {
          console.log('Scrolling to bottom after aircraft selection:', messagesContainer.scrollHeight);
          messagesContainer.scrollTo({
            top: messagesContainer.scrollHeight,
            behavior: 'smooth'
          });
        } else {
          console.log('Messages container not found for aircraft scroll');
        }
      }, 500); // Increased delay to ensure DOM update
    }
  };

  // Debounce map to prevent duplicate tool executions
  const toolExecutionRef = useRef<Map<string, number>>(new Map());
  
  // Generic tool handler that shows selective actions first, then executes onClick actions serially
  const handleToolClick = async (tool: any) => {
    // Prevent duplicate executions within 1 second
    const now = Date.now();
    const lastExecution = toolExecutionRef.current.get(tool.id);
    if (lastExecution && (now - lastExecution) < 1000) {
      console.log(`Preventing duplicate execution of ${tool.name}`);
      return;
    }
    toolExecutionRef.current.set(tool.id, now);
    
    console.log(`${tool.name} clicked from greeting!`);
    console.log(`Tool data:`, tool);
    console.log(`SelectiveActionLabel:`, tool.selectiveActionLabel, `HasSelectiveActions:`, tool.hasSelectiveActions, `ToolId:`, tool.toolId);
    
    // Create initial container if this is the first tool interaction (but not just greeting)
    if (!hasCreatedInitialContainer && messages.length > 1) {
      console.log(`🎬 Creating initial container before first tool: ${tool.name}`);
      createInitialContainer();
    }
    
    // Collapse previous tool section before starting new one
    if (isCapturingToolSession) {
      const previousToolName = currentToolName || lastSelectiveActionTool || "Previous Interaction";
      console.log(`🔄 Collapsing previous section: ${previousToolName}, messages count: ${currentSectionMessages.length}`);
      collapseCurrentSection(previousToolName);
    }
    
    // Start capturing new tool session
    console.log(`🎯 Starting new tool session for: ${tool.name}`);
    setIsCapturingToolSession(true);
    setCurrentToolName(tool.name);
    
    // Check for direct actions first (when aircraft is selected)
    if (selectedAircraft && tool.onClickEventSelectedAircraftEqTrue === 'showAircraftCard') {
      // Show aircraft card directly when aircraft is selected
      const aircraftCardMessage = {
        text: `${tool.name}: ${selectedAircraft.tail_number}`,
        isUser: false,
        isAircraftCard: true,
        aircraft: selectedAircraft
      };
      setMessages(prev => [...prev, aircraftCardMessage]);
      return; // Exit early, don't show selective actions
    } else if (selectedAircraft && tool.onClickEventSelectedAircraftEqTrue === 'scrollBottom') {
      // For FleetSpan with aircraft selected, scroll to bottom instead of showing aircraft card
      setTimeout(() => {
        const messagesContainer = document.getElementById('messages-container');
        if (messagesContainer) {
          messagesContainer.scrollTo({
            top: messagesContainer.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 100);
      return; // Exit early, don't show selective actions
    }
    
    // Check if this tool has selective actions
    if ((tool.selectiveActionLabel === true || tool.selectiveActionLabel === 't') && tool.toolId) {
      try {
        // Fetch and show selective action prompts
        const response = await fetch(`/api/tools/${tool.toolId}/selective-prompts`);
        const promptData = await response.json();
        console.log(`${tool.name} prompts received:`, promptData);
        
        const prompts = promptData.map((item: any, index: number) => ({
          id: item.id || index + 1,
          prompt_value: item.prompt_value || item.promptValue,
          inactive_label: item.inactive_label || item.inactiveLabel,
          active_event_handler: item.active_event_handler || item.activeEventHandler,
          css_classes: item.css_classes || item.cssClasses,
          on_click_event: item.on_click_event || item.onClickEvent,
          allow_double_click: item.allow_double_click || item.allowDoubleClick
        }));
        
        const selectiveActionMessage = {
          text: tool.primaryActionLabel || "Choose an action:",
          isUser: false,
          isSelectiveAction: true,
          selectivePrompts: prompts,
          toolOutputId: `selective_${Date.now()}` // Add unique ID for scroll targeting
        };
        
        addMessage(selectiveActionMessage);
        setLastSelectiveActionTool(tool.name);

        // Trigger scroll immediately - no hardcoded waits
        const targetToken = selectiveActionMessage.toolOutputId;
        const hasAircraft = !!selectedAircraft;
        autoSmartScroll(targetToken, { hasSelectiveActions: tool.hasSelectiveActions }, tool.name);

        // Execute the tool's primary action after showing selective actions
        setTimeout(() => {
          if (selectedAircraft) {
            const actionName = tool.onClickEventSelectedAircraftEqTrue;
            if (actionName && selectiveActionFunctions[actionName]) {
              selectiveActionFunctions[actionName]();
            }
          } else {
            const actionName = tool.onClickEventSelectedAircraftEqFalse;
            if (actionName && selectiveActionFunctions[actionName]) {
              selectiveActionFunctions[actionName]();
            }
          }
        }, 50);
        
      } catch (error) {
        console.error(`Error fetching selective prompts for ${tool.name}:`, error);
        const fallbackMessage = {
          text: `Unable to load ${tool.name} options. Please try again.`,
          isUser: false
        };
        setMessages(prev => [...prev, fallbackMessage]);
      }
    } else {
      // No selective actions, handle as regular tool
      console.log(`${tool.name} has no selective actions, handling as regular tool`);
      
      // Execute the appropriate action based on aircraft selection
      if (selectedAircraft) {
        const actionName = tool.onClickEventSelectedAircraftEqTrue;
        if (actionName === 'scrollBottom') {
          const messagesContainer = document.getElementById('messages-container');
          if (messagesContainer) {
            messagesContainer.scrollTo({
              top: messagesContainer.scrollHeight,
              behavior: 'smooth'
            });
          }
        } else if (actionName === 'showAircraftCard') {
          // Show aircraft card when aircraft is selected
          const aircraftCardMessage = {
            text: `${tool.name}: ${selectedAircraft.tail_number}`,
            isUser: false,
            isAircraftCard: true,
            aircraft: selectedAircraft
          };
          setMessages(prev => [...prev, aircraftCardMessage]);
        } else {
          // Handle other tools that work with selected aircraft using database-driven logic
          const actionName = tool.onClickEventSelectedAircraftEqTrue;
          if (actionName === 'scrollBottom') {
            const messagesContainer = document.getElementById('messages-container');
            if (messagesContainer) {
              messagesContainer.scrollTo({
                top: messagesContainer.scrollHeight,
                behavior: 'smooth'
              });
            }
          } else {
            // Default behavior: set input with tool name for regular tools
            setInput(`[${tool.name}] `);
          }
        }
      } else {
        const actionName = tool.onClickEventSelectedAircraftEqFalse;
        if (actionName === 'selectAircraft') {
          console.log('Selecting aircraft');
          // Show aircraft selector and get its token
          const aircraftToken = await selectiveActionFunctions.selectAircraft();
          
          // Use the returned token for precise targeting
          if (aircraftToken) {
            autoSmartScroll(aircraftToken, { hasSelectiveActions: false }, tool.name);
          }
        }
      }
    }
  };

  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [selectedToolIndex, setSelectedToolIndex] = useState(0);

  // Handle new contact form submission
  const handleNewContactSubmit = async () => {
    // Validate required fields - either email or phone must be provided
    if (!newContactForm.name || (!newContactForm.email && !newContactForm.phone)) {
      toast({
        title: "Validation Error",
        description: "Name and either Email or Phone are required.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Save contact to database
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          name: newContactForm.name,
          role: newContactForm.role,
          company: newContactForm.company,
          email: newContactForm.email || null,
          phone: newContactForm.phone || null,
          invitation_status: 'Invited'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save contact');
      }

      // Close modal and reset form
      setShowNewContactModal(false);
      setNewContactForm({
        name: "",
        role: "",
        company: "",
        email: "",
        phone: ""
      });

      toast({
        title: "Contact Added",
        description: `${newContactForm.name} has been added to your network.`,
      });

      // Refresh the contacts list by calling manageContacts again
      setTimeout(() => {
        selectiveActionFunctions.manageContacts();
      }, 500);

    } catch (error) {
      console.error('Error saving contact:', error);
      toast({
        title: "Error",
        description: "Failed to save contact. Please try again.",
        variant: "destructive",
      });
    }
  };

  // New Chat functionality
  const handleNewChat = async () => {
    try {
      // Save current conversation to history if there are messages (excluding initial greeting)
      const conversationMessages = messages.filter((msg, index) => 
        index > 0 && !msg.isSelectiveAction && !msg.isAircraftCard
      );
      
      if (conversationMessages.length > 0) {
        // Create a conversation summary for saving
        const userMessages = conversationMessages.filter(msg => msg.isUser);
        const botMessages = conversationMessages.filter(msg => !msg.isUser);
        
        if (userMessages.length > 0 && botMessages.length > 0) {
          // Save each user-bot exchange to the database
          for (let i = 0; i < Math.min(userMessages.length, botMessages.length); i++) {
            await apiRequest('POST', '/api/conversations', {
              user_message: userMessages[i].text,
              bot_response: botMessages[i].text,
              rank: 0 // Default rating
            });
          }
        }
      }

      // Reset chat to initial state
      setMessages([{ text: "How can I help you today?", isUser: false }]);
      setInput("");
      setIsTyping(false);
      setIsLoading(false);
      setShowSummary(false);
      setSummary("");
      setLocalSelectedAircraft(null);
      setIsFleetSpanMode(false);
      
      // Clear aircraft selection
      if (onAircraftSelect) {
        onAircraftSelect(null);
      }

      toast({
        title: "New chat started",
        description: "Previous conversation saved to history",
        duration: 2000,
      });

    } catch (error) {
      console.error('Error starting new chat:', error);
      toast({
        title: "New chat started",
        description: "Ready for a fresh conversation",
        duration: 2000,
      });
      
      // Still reset the chat even if saving fails
      setMessages([{ text: "How can I help you today?", isUser: false }]);
      setInput("");
      setIsTyping(false);
      setIsLoading(false);
      setShowSummary(false);
      setSummary("");
      setLocalSelectedAircraft(null);
      setIsFleetSpanMode(false);
      
      if (onAircraftSelect) {
        onAircraftSelect(null);
      }
    }
  };

  // Update local state when external selectedAircraft changes
  useEffect(() => {
    setLocalSelectedAircraft(selectedAircraft);
    console.log('Selected aircraft updated:', selectedAircraft);
    
    // Reset selective action tracking when aircraft changes
    setLastSelectiveActionTool(null);
  }, [selectedAircraft]);

  const { toast } = useToast();
  const { logoutMutation } = useAuth();

  // Icon mapping function
  const getIconComponent = (iconName: string) => {
    const iconMap = {
      'plane': Plane,
      'wrench': Wrench,
      'help-circle': HelpCircle,
      'search': Search,
      'eye': Eye,
      'message-circle': MessageCircle,
      'file-text': FileText,
      'map-pin': MapPin,
      'shield-check': ShieldCheck,
      'bar-chart-3': BarChart3,
      'alert-triangle': AlertTriangle,
      'cloud': Cloud,
      'settings': Settings,
      'log-out': LogOut
    };
    return iconMap[iconName as keyof typeof iconMap] || Settings;
  };
  
  // Fetch both tool sets in parallel to reduce loading time
  useEffect(() => {
    const fetchTools = async () => {
      try {
        const [greetingResponse, toolboxResponse] = await Promise.all([
          fetch('/api/tools?showWithGreeting=true'),
          fetch('/api/tools?showInToolbox=true')
        ]);
        
        if (greetingResponse.ok) {
          const greetingTools = await greetingResponse.json();
          setGreetingTools(greetingTools);
        }
        
        if (toolboxResponse.ok) {
          const toolboxTools = await toolboxResponse.json();
          setToolboxTools(toolboxTools);
        }
      } catch (error) {
        console.error('Error fetching tools:', error);
      } finally {
        setIsLoadingToolboxTools(false);
      }
    };

    fetchTools();
  }, []);
  
  // Mutation to save conversation to the database
  const saveConversationMutation = useMutation({
    mutationFn: async ({ userPrompt, agentResponse }: { userPrompt: string, agentResponse: string }) => {
      const res = await apiRequest("POST", "/api/ratings/save-conversation", {
        userPrompt,
        agentResponse
      });
      return await res.json();
    },
    onSuccess: (data) => {
      // When the conversation is saved successfully, update the local messages with the database ID
      const latestMessages = [...messages];
      const botMessageIndex = latestMessages.length - 1;
      
      if (botMessageIndex >= 0 && !latestMessages[botMessageIndex].isUser) {
        latestMessages[botMessageIndex] = {
          ...latestMessages[botMessageIndex],
          id: data.id
        };
        setMessages(latestMessages);
      }
    },
    onError: (error) => {
      console.error("Failed to save conversation:", error);
      toast({
        title: "Error",
        description: "Failed to save conversation to the database",
        variant: "destructive"
      });
    }
  });
  
  // Mutation to update rating
  const updateRatingMutation = useMutation({
    mutationFn: async ({ id, rating }: { id: number, rating: number }) => {
      const res = await apiRequest("POST", `/api/ratings/save-rating`, { id, rating });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Rating Saved",
        description: "Your feedback has been recorded. Thank you!",
        variant: "default",
        duration: 700
      });
    },
    onError: (error) => {
      console.error("Failed to update rating:", error);
      toast({
        title: "Error",
        description: "Failed to save your rating",
        variant: "destructive"
      });
    }
  });
  
  // Function to generate a conversation summary
  const generateSummary = async () => {
    setIsSummaryLoading(true);
    setSummary("");
    
    try {
      const res = await apiRequest("GET", "/api/ratings/summary");
      const data = await res.json();
      
      setSummary(data.summary);
      setShowSummary(true);
    } catch (error) {
      console.error("Failed to generate summary:", error);
      toast({
        title: "Error",
        description: "Failed to generate conversation summary",
        variant: "destructive"
      });
    } finally {
      setIsSummaryLoading(false);
    }
  };

  // Add scroll event listener - simple and robust
  useEffect(() => {
    const messagesContainer = document.getElementById('messages-container');
    if (messagesContainer) {
      messagesContainer.addEventListener('scroll', handleScroll);
      
      return () => {
        messagesContainer.removeEventListener('scroll', handleScroll);
      };
    }
  }, [messages]); // Re-attach whenever messages change

  // Function to handle aircraft selection for FleetSpan
  const handleAircraftSelect = (aircraft: any) => {
    const previousAircraft = localSelectedAircraft;
    setLocalSelectedAircraft(aircraft);
    
    // Update parent component if callback provided
    if (onAircraftSelect) {
      onAircraftSelect(aircraft);
    }
    
    // If in FleetSpan mode and re-selecting an aircraft, show aircraft card in chat
    if (isFleetSpanMode && aircraft && previousAircraft) {
      const aircraftCardMessage = createAircraftCardMessage(aircraft);
      setMessages(prev => [...prev, aircraftCardMessage]);
      
      // Auto-scroll to show new message
      setTimeout(() => {
        const messagesContainer = document.getElementById('messages-container');
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }, 100);
    }
  };

  // Function to create aircraft card message
  const createAircraftCardMessage = (aircraft: any) => {
    const statusColor = getStatusColor(aircraft.primary_status);
    
    return {
      text: `Aircraft Details: ${aircraft.tail_number}`,
      isUser: false,
      isAircraftCard: true,
      aircraft: aircraft
    };
  };

  // Function to get status color classes
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'operational':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'grounded':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'monitor':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Function to get status classes for buttons (includes hover states)
  const getStatusClasses = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'operational':
        return 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200';
      case 'grounded':
        return 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200';
      case 'limited/monitor':
        return 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200';
      case 'maintenance':
        return 'bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200';
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) return;

    const userMessage = input;
    
    // Start capturing session for direct chat if not already active
    if (!isCapturingToolSession) {
      setIsCapturingToolSession(true);
      setCurrentToolName("Direct Chat");
    }
    
    addMessage({ text: userMessage, isUser: true });
    
    // Reset selective action tracking since user sent a message
    setLastSelectiveActionTool(null);
    
    setIsLoading(true);
    setIsTyping(true);

    // Auto-scroll to show typing indicator
    setTimeout(() => {
      const messagesContainer = document.getElementById('messages-container');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }, 100);

    // Simulate typing delay for realistic feel
    setTimeout(() => {
      const lowerInput = userMessage.toLowerCase();
      let randomResponse;

      if (lowerInput.includes('ship') || lowerInput.includes('delivery') || lowerInput.includes('package')) {
        const shippingResponses = BOT_RESPONSES.slice(8);
        randomResponse = shippingResponses[Math.floor(Math.random() * shippingResponses.length)];
      } else if (lowerInput.includes('hello') || lowerInput.includes('hi') || lowerInput.includes('hey')) {
        randomResponse = "Hello! How can I assist you with Ironfleet's shipping services today?";
      } else if (lowerInput.includes('thank')) {
        randomResponse = "You're welcome! Is there anything else I can help you with?";
      } else {
        const generalResponses = BOT_RESPONSES.slice(0, 8);
        randomResponse = generalResponses[Math.floor(Math.random() * generalResponses.length)];
      }

      addMessage({ text: randomResponse, isUser: false });
      setIsLoading(false);
      setIsTyping(false);

      // Save the conversation to the database (direct chat input - always save)
      saveConversationMutation.mutate({
        userPrompt: userMessage,
        agentResponse: randomResponse,
        toolContext: 'direct_chat', // Mark as direct chat input
        sessionId: currentSessionId // Group conversations by session
      });

      // Use Smart 3-rule scroll pattern
      smartScroll({ scrollBottom: true });

      // Return focus to the input field after bot response
      setTimeout(() => {
        const inputField = document.querySelector('textarea[placeholder="Ask, Action, or Observe"]') as HTMLTextAreaElement;
        if (inputField) {
          inputField.focus();
        }
      }, 100);
    }, 1500); // Increased delay to show typing indicator longer

    setInput("");
  };

  return (
    <div className="h-full flex flex-col">
      {/* Single header is now managed by App.tsx */}

      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4"
        id="messages-container"
      >
        {/* Greeting System - Long or Short based on interaction state */}
        {messages.length > 0 && (
          <div className="space-y-3">
            {/* Long Greeting - initial greeting message + tool buttons */}
            {messages.length === 1 && !isCapturingToolSession && (
              <>
                <div className={`flex justify-start`}>
                  <div className="max-w-[80%] rounded-lg p-3 bg-gray-50 text-gray-800 rounded-tl-none">
                    {messages[0].text}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 mb-3">Choose a tool to get started:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {greetingTools.map((tool) => (
                      <Button
                        key={tool.id}
                        onClick={() => handleToolClick(tool)}
                        variant="outline"
                        className="text-left justify-start h-auto p-3 whitespace-normal"
                      >
                        <div>
                          <div className="font-medium text-sm">{tool.name}</div>
                          <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {tool.description}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Short Greeting - just tool buttons (after interactions start) */}
            {(messages.length > 1 || isCapturingToolSession) && (
              <div className="flex flex-wrap gap-2">
                {greetingTools.map((tool) => (
                  <Button
                    key={tool.id}
                    onClick={() => handleToolClick(tool)}
                    variant="ghost"
                    size="sm"
                    className="h-7 px-3 text-xs"
                  >
                    {tool.name}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Containers Section - appears below greeting */}
        <div className="space-y-4">
          {/* Completed Sections */}
          {completedSections.map((section) => (
            <div key={section.id} className="flex justify-start">
              <div className="max-w-[80%] border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                <button
                  onClick={() => toggleSectionExpansion(section.id)}
                  className="w-full px-3 py-2 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      section.toolName === "New Chat" ? "bg-green-500" : "bg-blue-500"
                    }`}></div>
                    <span className="text-xs font-medium text-gray-600">
                      {section.toolName}
                      {section.messages.length > 0 && (
                        <span className="ml-1 text-gray-400">({section.messages.length} items)</span>
                      )}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(section.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  <ChevronDown 
                    className={`h-3 w-3 text-gray-400 transition-transform ${
                      section.isExpanded ? 'rotate-180' : ''
                    }`} 
                  />
                </button>
                {section.isExpanded && (
                  <div className="p-3 border-t border-gray-200 bg-white">
                    {section.messages.map((message, msgIndex) => (
                      <div key={msgIndex} className={`mb-2 last:mb-0 ${message.isUser ? "text-right" : "text-left"}`}>
                        <div className={`inline-block p-2 rounded-lg text-sm ${
                          message.isUser 
                            ? "bg-blue-500 text-white" 
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {message.text}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Current Active Session Container */}
          {isCapturingToolSession && (
            <div className="flex justify-start">
              <div className="max-w-[80%] border border-blue-300 rounded-lg overflow-hidden bg-blue-50 shadow-sm">
                <button
                  onClick={() => {
                    const currentExpanded = document.querySelector('[data-current-session]')?.getAttribute('data-expanded') === 'true';
                    document.querySelector('[data-current-session]')?.setAttribute('data-expanded', (!currentExpanded).toString());
                  }}
                  className="w-full px-3 py-2 bg-blue-100 hover:bg-blue-200 flex items-center justify-between text-left transition-colors"
                  data-current-session
                  data-expanded="true"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></div>
                    <span className="text-xs font-medium text-blue-700">
                      {currentToolName} (Active)
                      <span className="ml-1 text-blue-500">({currentSectionMessages.length} items)</span>
                    </span>
                    <span className="text-xs text-blue-500">Live</span>
                  </div>
                  <ChevronDown className="h-3 w-3 text-blue-500" />
                </button>
                <div className="p-3 border-t border-blue-200 bg-white">
                  {currentSectionMessages.map((message, msgIndex) => (
                    <div key={msgIndex} className={`mb-2 last:mb-0 ${message.isUser ? "text-right" : "text-left"}`}>
                      <div className={`inline-block p-2 rounded-lg text-sm ${
                        message.isUser 
                          ? "bg-blue-500 text-white" 
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        {message.isSelectiveAction && message.selectivePrompts ? (
                  <div className="space-y-3" data-selective-action="true" data-tool-output={message.toolOutputId} data-selective-actions={`buttons-${message.toolOutputId}`}>
                    <p className="font-medium">{message.text}</p>
                    <div className="flex flex-wrap gap-2">
                      {message.selectivePrompts.map((prompt: any) => (
                        <Button
                          key={prompt.id}
                          variant="outline"
                          size="sm"
                          className={`${prompt.css_classes} ${
                            selectedSelectiveAction === prompt.prompt_value ? 
                            "ring-2 ring-blue-500 ring-offset-1" : ""
                          } ${
                            prompt.active_event_handler && !activeEventHandlers[prompt.active_event_handler]?.() ? 
                            "opacity-60 cursor-not-allowed" : ""
                          }`}
                          onClick={async () => {
                            // Check if button should be active using dynamic handler
                            if (prompt.active_event_handler && !activeEventHandlers[prompt.active_event_handler]?.()) {
                              return; // Don't execute if handler returns false
                            }
                            
                            // Always use regular selective action handler for selective action buttons
                            // Only greeting tool buttons should use handleToolClick directly
                            handleSelectiveActionClick(prompt);
                          }}
                        >
                          {(() => {
                            // Check if handler exists and evaluate it (handle both camelCase and snake_case)
                            const handlerName = prompt.activeEventHandler || prompt.active_event_handler;
                            const handlerFunc = handlerName ? activeEventHandlers[handlerName] : null;
                            // If no handler specified (null), assume button is always active
                            const handlerResult = handlerFunc ? handlerFunc() : true;
                            const inactiveLabel = prompt.inactiveLabel || prompt.inactive_label;
                            const promptText = prompt.promptValue || prompt.prompt_value;
                            const shouldShowInactive = handlerName && handlerFunc && !handlerResult && inactiveLabel;
                            return shouldShowInactive ? inactiveLabel : promptText;
                          })()}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : message.isAircraftCard && message.aircraft ? (
                  <div className="space-y-3" data-tool-output={message.toolOutputId}>
                    {/* Handle both single aircraft and array of aircraft */}
                    {Array.isArray(message.aircraft) ? (
                      // Multiple aircraft - show all in grid
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {message.aircraft.map((aircraft, index) => (
                          <div key={aircraft.id || index} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                            {/* Header with tail number and model */}
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">{aircraft.tail_number}</h3>
                                <p className="text-sm text-gray-600">{aircraft.model} ({aircraft.manufacturer})</p>
                              </div>
                            </div>

                            {/* Status Pills */}
                            <div className="flex flex-wrap gap-2">
                              {aircraft.status_tags ? 
                                aircraft.status_tags.split(',').map((tag: any, tagIndex: any) => (
                                  <span key={tagIndex} className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(tag.trim())}`}>
                                    {tag.trim()}
                                  </span>
                                )) : (
                                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(aircraft.primary_status)}`}>
                                    {aircraft.primary_status}
                                  </span>
                                )
                              }
                            </div>

                            {/* Aircraft Details */}
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-gray-500">Year:</span>
                                <span className="ml-1 font-medium">{aircraft.year_manufactured || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Flight Hours:</span>
                                <span className="ml-1 font-medium">{aircraft.flight_hours ? Number(aircraft.flight_hours).toLocaleString() : 'N/A'}</span>
                              </div>
                            </div>

                            {/* Conditional Status Details */}
                            {aircraft.grounding_reason && aircraft.grounding_reason.trim() !== '' && (
                              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <h4 className="font-medium text-red-800 mb-1">Grounding Reason:</h4>
                                <p className="text-sm text-red-700">{aircraft.grounding_reason}</p>
                                {aircraft.next_maintenance_date && (
                                  <p className="text-xs text-red-600 mt-1">
                                    Est. Return: {new Date(aircraft.next_maintenance_date).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            )}

                            {aircraft.limitation_details && aircraft.limitation_details.trim() !== '' && (
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                <h4 className="font-medium text-yellow-800 mb-1">Operational Limitations:</h4>
                                <p className="text-sm text-yellow-700">{aircraft.limitation_details}</p>
                              </div>
                            )}

                            {(aircraft.primary_status === 'scheduled' || 
                              aircraft.secondary_statuses?.includes('scheduled')) && 
                             aircraft.status_details && aircraft.status_details.trim() !== '' && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <h4 className="font-medium text-blue-800 mb-1">Scheduled Service:</h4>
                                <p className="text-sm text-blue-700">{aircraft.status_details}</p>
                                {aircraft.next_maintenance_date && (
                                  <p className="text-xs text-blue-600 mt-1">
                                    Date: {new Date(aircraft.next_maintenance_date).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      // Single aircraft - show single card
                      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                        {/* Header with tail number and model */}
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{message.aircraft.tail_number}</h3>
                            <p className="text-sm text-gray-600">{message.aircraft.model} ({message.aircraft.manufacturer})</p>
                          </div>
                        </div>

                        {/* Status Pills */}
                        <div className="flex flex-wrap gap-2">
                          {message.aircraft.status_tags ? 
                            message.aircraft.status_tags.split(',').map((tag: any, index: any) => (
                              <span key={index} className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(tag.trim())}`}>
                                {tag.trim()}
                              </span>
                            )) : (
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(message.aircraft.primary_status)}`}>
                                {message.aircraft.primary_status}
                              </span>
                            )
                          }
                        </div>

                        {/* Aircraft Details */}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500">Year:</span>
                            <span className="ml-1 font-medium">{message.aircraft.year_manufactured || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Flight Hours:</span>
                            <span className="ml-1 font-medium">{message.aircraft.flight_hours ? Number(message.aircraft.flight_hours).toLocaleString() : 'N/A'}</span>
                          </div>
                        </div>

                        {/* Conditional Status Details */}
                        {message.aircraft.grounding_reason && message.aircraft.grounding_reason.trim() !== '' && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <h4 className="font-medium text-red-800 mb-1">Grounding Reason:</h4>
                            <p className="text-sm text-red-700">{message.aircraft.grounding_reason}</p>
                            {message.aircraft.next_maintenance_date && (
                              <p className="text-xs text-red-600 mt-1">
                                Est. Return: {new Date(message.aircraft.next_maintenance_date).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        )}

                        {message.aircraft.limitation_details && message.aircraft.limitation_details.trim() !== '' && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <h4 className="font-medium text-yellow-800 mb-1">Operational Limitations:</h4>
                            <p className="text-sm text-yellow-700">{message.aircraft.limitation_details}</p>
                          </div>
                        )}

                        {(message.aircraft.primary_status === 'scheduled' || 
                          message.aircraft.secondary_statuses?.includes('scheduled')) && 
                         message.aircraft.status_details && message.aircraft.status_details.trim() !== '' && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <h4 className="font-medium text-blue-800 mb-1">Scheduled Service:</h4>
                            <p className="text-sm text-blue-700">{message.aircraft.status_details}</p>
                            {message.aircraft.next_maintenance_date && (
                              <p className="text-xs text-blue-600 mt-1">
                                Date: {new Date(message.aircraft.next_maintenance_date).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : message.isContactsList && message.contacts ? (
                  <div className="w-full max-w-none space-y-3" data-tool-output={message.toolOutputId}>
                    {/* Search Filter with New Connection Button */}
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search contacts..."
                          className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={contactSearchQuery}
                          onChange={(e) => setContactSearchQuery(e.target.value)}
                        />
                      </div>
                      <Button
                        onClick={() => setShowNewContactModal(true)}
                        variant="outline"
                        size="sm"
                        className="text-gray-600 hover:text-gray-800 border-gray-300 hover:border-gray-400 px-3 py-2"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {/* Responsive grid layout for contact cards */}
                    <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {message.contacts
                        .filter((contact: any) => {
                          if (!contactSearchQuery) return true;
                          const searchLower = contactSearchQuery.toLowerCase();
                          return (
                            contact.name.toLowerCase().includes(searchLower) ||
                            contact.company.toLowerCase().includes(searchLower) ||
                            contact.role.toLowerCase().includes(searchLower) ||
                            contact.invitation_status.toLowerCase().includes(searchLower)
                          );
                        })
                        .map((contact: any, index: number) => (
                        <div key={contact.id} className={`bg-white border rounded-lg p-3 space-y-2 cursor-pointer transition-all ${
                          selectedContacts.has(contact.id) 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`} onClick={() => toggleContactSelection(contact.id)}>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={selectedContacts.has(contact.id)}
                                onChange={() => toggleContactSelection(contact.id)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded flex-shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm text-gray-900 truncate">{contact.name}</h4>
                                <p className="text-xs text-gray-500 truncate">{contact.company}</p>
                                <p className="text-xs text-blue-600 truncate">{contact.role}</p>
                              </div>
                            </div>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ml-2 flex-shrink-0 ${
                              contact.invitation_status === 'Accepted' ? 'bg-green-100 text-green-800' :
                              contact.invitation_status === 'Declined' ? 'bg-red-100 text-red-800' :
                              contact.invitation_status === 'Expired' ? 'bg-gray-100 text-gray-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {contact.invitation_status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500">Email:</span>
                              {contact.email ? (
                                <span className="text-green-600">✓</span>
                              ) : (
                                <span className="text-gray-400">✗</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500">Phone:</span>
                              {contact.phone ? (
                                <span className="text-green-600">✓</span>
                              ) : (
                                <span className="text-gray-400">✗</span>
                              )}
                            </div>
                          </div>
                          {selectedContacts.has(contact.id) && (
                            <div className="text-xs text-blue-600 font-medium">
                              ✓ Added to chat
                            </div>
                          )}
                          
                          {/* Communication buttons for accepted contacts */}
                          {contact.invitation_status === 'Accepted' && (
                            <div className="flex items-center justify-center gap-2 mt-2 pt-2 border-t border-gray-100">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-1 text-xs px-2 py-1 h-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Video call functionality
                                  console.log('Starting video call with:', contact.name);
                                }}
                              >
                                <Video className="h-3 w-3" />
                                Video
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-1 text-xs px-2 py-1 h-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Phone call functionality
                                  if (contact.phone) {
                                    window.open(`tel:${contact.phone}`, '_self');
                                  } else {
                                    console.log('No phone number available for:', contact.name);
                                  }
                                }}
                              >
                                <Phone className="h-3 w-3" />
                                Call
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : message.isAircraftSelector && message.aircraft ? (
                  <div className="w-full max-w-none space-y-3" data-tool-output={message.toolOutputId} data-primary-event={`aircraft-selector-${message.toolOutputId}`}>
                    <p className="font-medium">{message.text}</p>
                    
                    {/* Aircraft Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="text"
                        placeholder="Search aircraft by tail number or model..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        onChange={(e) => {
                          const searchTerm = e.target.value.toLowerCase();
                          const aircraftCards = document.querySelectorAll(`[data-tool-output="${message.toolOutputId}"] .aircraft-card`);
                          aircraftCards.forEach((card: any) => {
                            const text = card.textContent.toLowerCase();
                            if (text.includes(searchTerm)) {
                              card.style.display = 'block';
                            } else {
                              card.style.display = 'none';
                            }
                          });
                        }}
                      />
                    </div>
                    
                    {/* Aircraft Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {message.aircraft.map((aircraft: any) => (
                        <div
                          key={aircraft.id}
                          className="aircraft-card bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all"
                          onClick={async () => {
                            console.log('selectSpecificAircraft function called!', aircraft);
                            
                            // Update the selected aircraft
                            setLocalSelectedAircraft(aircraft);
                            onAircraftSelect(aircraft);
                            
                            // Show confirmation message
                            const confirmationMessage = {
                              text: `Selected: ${aircraft.tail_number} - ${aircraft.model}`,
                              isUser: false,
                              toolOutputId: `aircraft-selected-${Date.now()}`,
                              isAircraftSelected: true,
                              selectedAircraft: aircraft
                            };
                            
                            addMessage(confirmationMessage);
                            
                            // Force scroll to bottom for aircraft selection confirmation
                            setTimeout(() => {
                              const messagesContainer = document.getElementById('messages-container');
                              if (messagesContainer) {
                                console.log('Scrolling to bottom after aircraft selection:', messagesContainer.scrollHeight);
                                messagesContainer.scrollTo({
                                  top: messagesContainer.scrollHeight,
                                  behavior: 'smooth'
                                });
                              } else {
                                console.log('Messages container not found for aircraft scroll');
                              }
                            }, 500); // Increased delay to ensure DOM update
                          }}
                        >
                          {/* Header with tail number and status */}
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">{aircraft.tail_number}</h3>
                              <p className="text-sm text-gray-600">{aircraft.model} ({aircraft.manufacturer})</p>
                            </div>
                            <div className="flex flex-wrap gap-1 justify-end">
                              {aircraft.status_tags?.split(', ').map((tag: string, index: number) => (
                                <span key={index} className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(tag.trim())}`}>
                                  {tag.trim()}
                                </span>
                              )) || (
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(aircraft.primary_status)}`}>
                                  {aircraft.primary_status}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Aircraft Details */}
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-gray-500">Year:</span>
                              <span className="ml-1 font-medium">{aircraft.year_manufactured || 'N/A'}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-gray-500">Flight Hours:</span>
                              <span className="ml-1 font-medium">{aircraft.flight_hours ? Number(aircraft.flight_hours).toLocaleString() : 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                ) : (
                  <p>{message.text}</p>
                )}
                {!message.isUser && index > 0 && !message.isAircraftCard && message.text !== "Filter fleet by ..." && !message.isSelectiveAction && !message.isContactsList && !message.isAircraftSelector && !message.text.includes("Found") && (
                  <div className="flex items-center mt-1">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span 
                          key={star}
                          className={`text-xs cursor-pointer ${
                            message.rating && star <= message.rating ? "text-yellow-400" : "text-gray-300"
                          }`}
                          onClick={() => {
                            // Update the rating for this message locally
                            setMessages(prev => 
                              prev.map((m, i) => 
                                i === index ? { ...m, rating: star } : m
                              )
                            );
                            
                            // If we have the message ID, save the rating to the database
                            if (message.id) {
                              updateRatingMutation.mutate({
                                id: message.id,
                                rating: star
                              });
                            }
                            
                            // Return focus to input field after rating
                            setTimeout(() => {
                              const inputField = document.querySelector('textarea[placeholder="Ask, Action, or Observe"]') as HTMLTextAreaElement;
                              if (inputField) {
                                inputField.focus();
                              }
                            }, 100);
                            
                            console.log(`Message rated: ${star} stars`);
                          }}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Show quick action buttons only after the first (greeting) message */}
            {index === 0 && !message.isUser && (
              <>
                <div className="flex justify-start mt-3 mb-4">
                  <div className="flex flex-wrap gap-2 max-w-[80%]">
                    {greetingTools.length > 0 ? (
                      greetingTools.map((tool) => (
                        <Button
                          key={tool.id}
                          variant="ghost"
                          size="sm"
                          className={selectedGreetingTool === tool.name ? 
                            "bg-blue-100 border-blue-500 text-blue-700 hover:bg-blue-200" : 
                            "hover:bg-gray-50"
                          }
                          onClick={() => {
                            setSelectedGreetingTool(tool.name);
                            setSelectedToolboxTool(tool.name); // Also highlight in toolbox
                            
                            // All tools are now completely database-driven
                            handleToolClick(tool);
                          }}
                          style={{
                            height: '28px',
                            padding: '0 12px',
                            fontSize: '12px',
                            fontWeight: 'normal',
                            borderRadius: '6px',
                            border: selectedToolboxTool === tool.name ? '1px solid rgb(59 130 246)' : '1px solid rgb(209 213 219)',
                            backgroundColor: selectedToolboxTool === tool.name ? 'rgb(219 234 254)' : 'transparent',
                            color: selectedToolboxTool === tool.name ? 'rgb(29 78 216)' : 'rgb(75 85 99)'
                          }}
                        >
                          {tool.icon && (() => {
                            const IconComponent = getIconComponent(tool.icon);
                            return <IconComponent className="w-3 h-3 mr-1.5" />;
                          })()}
                          {tool.name}
                        </Button>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500">Loading tools...</div>
                    )}
                  </div>
                </div>

              </>
            )}
          </div>
        ))}
        
        {/* Containers Section - appears below greeting */}
        <div className="space-y-4">
          {/* Completed Sections */}
          {completedSections.map((section) => (
            <div key={section.id} className="flex justify-start">
              <div className="max-w-[80%] border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                <button
                  onClick={() => toggleSectionExpansion(section.id)}
                  className="w-full px-3 py-2 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      section.toolName === "New Chat" ? "bg-green-500" : "bg-blue-500"
                    }`}></div>
                    <span className="text-xs font-medium text-gray-600">
                      {section.toolName}
                      {section.messages.length > 0 && (
                        <span className="ml-1 text-gray-400">({section.messages.length} items)</span>
                      )}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(section.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  <ChevronDown 
                    className={`h-3 w-3 text-gray-400 transition-transform ${
                      section.isExpanded ? 'rotate-180' : ''
                    }`} 
                  />
                </button>
                {section.isExpanded && (
                  <div className="p-3 border-t border-gray-200 bg-white">
                    {section.messages.map((message, msgIndex) => (
                      <div key={msgIndex} className={`mb-2 last:mb-0 ${message.isUser ? "text-right" : "text-left"}`}>
                        <div className={`inline-block p-2 rounded-lg text-sm ${
                          message.isUser 
                            ? "bg-blue-500 text-white" 
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {message.text}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Current Active Session Container */}
          {isCapturingToolSession && (
            <div className="flex justify-start">
              <div className="max-w-[80%] border border-blue-300 rounded-lg overflow-hidden bg-blue-50 shadow-sm">
                <button
                  onClick={() => {
                    const currentExpanded = document.querySelector('[data-current-session]')?.getAttribute('data-expanded') === 'true';
                    document.querySelector('[data-current-session]')?.setAttribute('data-expanded', (!currentExpanded).toString());
                  }}
                  className="w-full px-3 py-2 bg-blue-100 hover:bg-blue-200 flex items-center justify-between text-left transition-colors"
                  data-current-session
                  data-expanded="true"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></div>
                    <span className="text-xs font-medium text-blue-700">
                      {currentToolName} (Active)
                      <span className="ml-1 text-blue-500">({currentSectionMessages.length} items)</span>
                    </span>
                    <span className="text-xs text-blue-500">Live</span>
                  </div>
                  <ChevronDown className="h-3 w-3 text-blue-500" />
                </button>
                <div className="p-3 border-t border-blue-200 bg-white">
                  {currentSectionMessages.map((message, msgIndex) => (
                    <div key={msgIndex} className={`mb-2 last:mb-0 ${message.isUser ? "text-right" : "text-left"}`}>
                      <div className={`inline-block p-2 rounded-lg text-sm ${
                        message.isUser 
                          ? "bg-blue-500 text-white" 
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        {message.text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Show typing indicator when bot is typing */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg p-3 bg-gray-50 text-gray-800 rounded-tl-none">
              <TypingIndicator />
            </div>
          </div>
        )}
      </div>

      {/* Scroll to Bottom Button */}
      {showScrollToBottom && (
        <div className="absolute bottom-24 right-6 z-40">
          <Button
            onClick={handleScrollToBottom}
            size="sm"
            className="h-10 w-10 rounded-full bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg hover:bg-white hover:shadow-xl transition-all duration-200 text-gray-600 hover:text-gray-800"
            variant="ghost"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="p-6 flex-shrink-0">

        <TooltipProvider>
          <form onSubmit={handleSendMessage} className="relative">
            {/* Command Palette - appears when "/" is typed or wrench is clicked */}
            {showCommandPalette && (
              <div className="absolute bottom-full mb-2 right-4 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-80 max-h-64 overflow-y-auto">
                <div className="p-2">
                  <div className="text-sm font-medium text-gray-700 mb-2 px-2">Commands</div>
                  {toolboxTools.map((tool, index) => (
                    <div
                      key={tool.id}
                      data-tool-index={index}
                      className={`flex items-center px-2 py-2 cursor-pointer rounded text-sm ${
                        index === selectedToolIndex 
                          ? 'bg-blue-100 border border-blue-300' 
                          : 'hover:bg-gray-100'
                      }`}
                      onClick={() => {
                        // Use consistent tool handler for all tools
                        setSelectedToolboxTool(tool.name);
                        handleToolClick(tool);
                        setShowCommandPalette(false);
                        setTimeout(() => {
                          const textarea = document.querySelector('textarea');
                          if (textarea) {
                            textarea.focus();
                            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
                          }
                        }, 50);
                      }}
                    >
                      {tool.icon && (() => {
                        const IconComponent = getIconComponent(tool.icon);
                        return <IconComponent className="h-5 w-5 mr-3 text-gray-600 flex-shrink-0" />;
                      })()}
                      <div>
                        <div className="font-medium text-gray-900">/{tool.name.toLowerCase().replace(/\s+/g, '')}</div>
                        <div className="text-gray-500 text-xs">{tool.description || tool.name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="bg-gray-50 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
              {/* Mobile layout: Stacked */}
              <div className="flex sm:hidden flex-col">
                {/* Text area - full width on mobile */}
                <div className="p-4 pb-2">
                  <Textarea
                    value={input}
                    onChange={(e) => {
                      const value = e.target.value;
                      setInput(value);
                      
                      // Show command palette when "/" is typed as first character
                      if (value === '/') {
                        setShowCommandPalette(true);
                        setSelectedToolIndex(0);
                      } else if (!value.startsWith('/')) {
                        setShowCommandPalette(false);
                        setSelectedToolIndex(0);
                      }
                    }}
                    placeholder="Ask, Action, or Observe"
                    disabled={isLoading}
                    rows={3}
                    className="w-full border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base placeholder:text-gray-500 resize-none min-h-[72px] max-h-[72px] p-0"
                    onKeyDown={(e) => {
                      if (showCommandPalette) {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setSelectedToolIndex(prev => {
                            const newIndex = prev < toolboxTools.length - 1 ? prev + 1 : 0;
                            // Scroll to the selected item
                            setTimeout(() => {
                              const selectedElement = document.querySelector(`[data-tool-index="${newIndex}"]`);
                              if (selectedElement) {
                                selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                              }
                            }, 0);
                            return newIndex;
                          });
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setSelectedToolIndex(prev => {
                            const newIndex = prev > 0 ? prev - 1 : toolboxTools.length - 1;
                            // Scroll to the selected item
                            setTimeout(() => {
                              const selectedElement = document.querySelector(`[data-tool-index="${newIndex}"]`);
                              if (selectedElement) {
                                selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                              }
                            }, 0);
                            return newIndex;
                          });
                        } else if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          const selectedTool = toolboxTools[selectedToolIndex];
                          if (selectedTool) {
                            // Use consistent tool handler for all tools
                            setSelectedToolboxTool(selectedTool.name);
                            handleToolClick(selectedTool);
                            setShowCommandPalette(false);
                            setTimeout(() => {
                              const textarea = document.querySelector('textarea');
                              if (textarea) {
                                textarea.focus();
                                textarea.setSelectionRange(textarea.value.length, textarea.value.length);
                              }
                            }, 50);
                          }
                        } else if (e.key === 'Escape') {
                          setShowCommandPalette(false);
                        }
                      } else {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e as any);
                        }
                      }
                    }}
                  />
                </div>
                
                {/* Controls row below text on mobile */}
                <div className="flex items-center justify-between px-4 pb-4">
                  <div className="flex items-center gap-1">
                    {/* Plus icon */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-full hover:bg-gray-200"
                          type="button"
                        >
                          <Plus className="h-4 w-4 text-gray-600" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48">
                        <DropdownMenuItem className="flex items-center gap-2">
                          <Upload className="h-4 w-4" />
                          Upload File
                        </DropdownMenuItem>
                        <DropdownMenuItem className="flex items-center gap-2">
                          <Video className="h-4 w-4" />
                          Video Capture
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Tools trigger - opens command palette */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-full hover:bg-gray-200"
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setShowCommandPalette(true);
                            setSelectedToolIndex(0);
                            setInput('/');
                            
                            // Set up keyboard navigation for the command palette
                            const handleKeyDown = (keyEvent) => {
                              if (keyEvent.key === 'ArrowDown') {
                                keyEvent.preventDefault();
                                setSelectedToolIndex(prev => {
                                  const newIndex = prev < toolboxTools.length - 1 ? prev + 1 : 0;
                                  // Scroll to the selected item
                                  setTimeout(() => {
                                    const selectedElement = document.querySelector(`[data-tool-index="${newIndex}"]`);
                                    if (selectedElement) {
                                      selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                                    }
                                  }, 0);
                                  return newIndex;
                                });
                              } else if (keyEvent.key === 'ArrowUp') {
                                keyEvent.preventDefault();
                                setSelectedToolIndex(prev => {
                                  const newIndex = prev > 0 ? prev - 1 : toolboxTools.length - 1;
                                  // Scroll to the selected item
                                  setTimeout(() => {
                                    const selectedElement = document.querySelector(`[data-tool-index="${newIndex}"]`);
                                    if (selectedElement) {
                                      selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                                    }
                                  }, 0);
                                  return newIndex;
                                });
                              } else if (keyEvent.key === 'Enter' && !keyEvent.shiftKey) {
                                keyEvent.preventDefault();
                                const selectedTool = toolboxTools[selectedToolIndex];
                                if (selectedTool) {
                                  setSelectedToolboxTool(selectedTool.name);
                                  handleToolClick(selectedTool);
                                  setShowCommandPalette(false);
                                  document.removeEventListener('keydown', handleKeyDown);
                                }
                              } else if (keyEvent.key === 'Escape') {
                                setShowCommandPalette(false);
                                document.removeEventListener('keydown', handleKeyDown);
                              }
                            };
                            
                            document.addEventListener('keydown', handleKeyDown);
                            
                            setTimeout(() => {
                              const textarea = document.querySelector('textarea');
                              if (textarea) {
                                textarea.focus();
                                textarea.setSelectionRange(1, 1); // Position cursor after the "/"
                              }
                            }, 50);
                          }}
                        >
                          <Wrench className="h-4 w-4 text-gray-600" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Open tools menu</p>
                      </TooltipContent>
                    </Tooltip>

                  </div>

                  {/* Audio controls grouped together */}
                  <div className="flex items-center gap-1">
                    {/* Voice mode toggle */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-full hover:bg-gray-200"
                          type="button"
                          onClick={() => setIsVoiceMode(!isVoiceMode)}
                        >
                          {isVoiceMode ? (
                            <Volume2 className="h-4 w-4 text-blue-600" />
                          ) : (
                            <VolumeX className="h-4 w-4 text-gray-600" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{isVoiceMode ? "Disable voice mode" : "Enable voice mode"}</p>
                      </TooltipContent>
                    </Tooltip>

                    {/* Microphone */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-full hover:bg-gray-200"
                          type="button"
                          onClick={() => setIsRecording(!isRecording)}
                        >
                          {isRecording ? (
                            <MicOff className="h-4 w-4 text-red-600" />
                          ) : (
                            <Mic className="h-4 w-4 text-gray-600" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{isRecording ? "Stop recording" : "Start voice input"}</p>
                      </TooltipContent>
                    </Tooltip>

                    {/* Send button */}
                    <Button
                      type="submit"
                      disabled={isLoading || (!input.trim() && !isRecording)}
                      className="h-8 w-8 rounded-full bg-black hover:bg-gray-800 text-white p-0 ml-1"
                    >
                      {isLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Send className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Desktop layout: Original horizontal layout */}
              <div className="hidden sm:flex items-center">
                {/* Left side - Plus icon with dropdown */}
                <div className="flex items-center pl-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-full hover:bg-gray-200"
                        type="button"
                      >
                        <Plus className="h-4 w-4 text-gray-600" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      <DropdownMenuItem className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        Upload File
                      </DropdownMenuItem>
                      <DropdownMenuItem className="flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        Video Capture
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Input field - Multi-line textarea */}
                <Textarea
                  value={input}
                  onChange={(e) => {
                    const value = e.target.value;
                    setInput(value);
                    
                    // Show command palette when "/" is typed as first character
                    if (value === '/') {
                      setShowCommandPalette(true);
                      setSelectedToolIndex(0);
                    } else if (!value.startsWith('/')) {
                      setShowCommandPalette(false);
                      setSelectedToolIndex(0);
                    }
                  }}
                  placeholder="Ask, Action, or Observe"
                  disabled={isLoading}
                  rows={3}
                  className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-4 py-3 text-base placeholder:text-gray-500 resize-none min-h-[72px] max-h-[72px]"
                  onKeyDown={(e) => {
                    if (showCommandPalette) {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setSelectedToolIndex(prev => {
                          const newIndex = prev < toolboxTools.length - 1 ? prev + 1 : 0;
                          // Scroll to the selected item
                          setTimeout(() => {
                            const selectedElement = document.querySelector(`[data-tool-index="${newIndex}"]`);
                            if (selectedElement) {
                              selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                            }
                          }, 0);
                          return newIndex;
                        });
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setSelectedToolIndex(prev => {
                          const newIndex = prev > 0 ? prev - 1 : toolboxTools.length - 1;
                          // Scroll to the selected item
                          setTimeout(() => {
                            const selectedElement = document.querySelector(`[data-tool-index="${newIndex}"]`);
                            if (selectedElement) {
                              selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                            }
                          }, 0);
                          return newIndex;
                        });
                      } else if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        const selectedTool = toolboxTools[selectedToolIndex];
                        if (selectedTool) {
                          // Use standardized tool handler - same as click handler
                          setSelectedToolboxTool(selectedTool.name);
                          handleToolClick(selectedTool);
                          setShowCommandPalette(false);
                          setTimeout(() => {
                            const textarea = document.querySelector('textarea');
                            if (textarea) {
                              textarea.focus();
                              textarea.setSelectionRange(textarea.value.length, textarea.value.length);
                            }
                          }, 50);
                        }
                      } else if (e.key === 'Escape') {
                        setShowCommandPalette(false);
                      }
                    } else {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e as any);
                      }
                    }
                  }}
                />

                {/* Right side - Tools dropdown, then audio controls (speaker + microphone), and send */}
                <div className="flex items-center gap-1 pr-2">
                  {/* Tools trigger - opens command palette */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-full hover:bg-gray-200"
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setShowCommandPalette(true);
                          setSelectedToolIndex(0);
                          setInput('/');
                          
                          // Set up keyboard navigation for the command palette
                          const handleKeyDown = (keyEvent) => {
                            if (keyEvent.key === 'ArrowDown') {
                              keyEvent.preventDefault();
                              setSelectedToolIndex(prev => {
                                const newIndex = prev < toolboxTools.length - 1 ? prev + 1 : 0;
                                // Scroll to the selected item
                                setTimeout(() => {
                                  const selectedElement = document.querySelector(`[data-tool-index="${newIndex}"]`);
                                  if (selectedElement) {
                                    selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                                  }
                                }, 0);
                                return newIndex;
                              });
                            } else if (keyEvent.key === 'ArrowUp') {
                              keyEvent.preventDefault();
                              setSelectedToolIndex(prev => {
                                const newIndex = prev > 0 ? prev - 1 : toolboxTools.length - 1;
                                // Scroll to the selected item
                                setTimeout(() => {
                                  const selectedElement = document.querySelector(`[data-tool-index="${newIndex}"]`);
                                  if (selectedElement) {
                                    selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                                  }
                                }, 0);
                                return newIndex;
                              });
                            } else if (keyEvent.key === 'Enter' && !keyEvent.shiftKey) {
                              keyEvent.preventDefault();
                              const selectedTool = toolboxTools[selectedToolIndex];
                              if (selectedTool) {
                                setSelectedToolboxTool(selectedTool.name);
                                handleToolClick(selectedTool);
                                setShowCommandPalette(false);
                                document.removeEventListener('keydown', handleKeyDown);
                              }
                            } else if (keyEvent.key === 'Escape') {
                              setShowCommandPalette(false);
                              document.removeEventListener('keydown', handleKeyDown);
                            }
                          };
                          
                          document.addEventListener('keydown', handleKeyDown);
                          
                          setTimeout(() => {
                            const textarea = document.querySelector('textarea');
                            if (textarea) {
                              textarea.focus();
                              textarea.setSelectionRange(1, 1); // Position cursor after the "/"
                            }
                          }, 50);
                        }}
                      >
                        <Wrench className="h-4 w-4 text-gray-600" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Open tools menu</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  {/* Audio controls group - speaker and microphone */}
                  <div className="flex items-center gap-1">
                    {/* Voice mode toggle */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-full hover:bg-gray-200"
                          type="button"
                          onClick={() => setIsVoiceMode(!isVoiceMode)}
                        >
                          {isVoiceMode ? (
                            <Volume2 className="h-4 w-4 text-blue-600" />
                          ) : (
                            <VolumeX className="h-4 w-4 text-gray-600" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{isVoiceMode ? "Disable voice mode" : "Enable voice mode"}</p>
                      </TooltipContent>
                    </Tooltip>

                    {/* Microphone */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-full hover:bg-gray-200"
                          type="button"
                          onClick={() => setIsRecording(!isRecording)}
                        >
                          {isRecording ? (
                            <MicOff className="h-4 w-4 text-red-600" />
                          ) : (
                            <Mic className="h-4 w-4 text-gray-600" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{isRecording ? "Stop recording" : "Start voice input"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Send button */}
                  <Button
                    type="submit"
                    disabled={isLoading || (!input.trim() && !isRecording)}
                    className="h-8 w-8 rounded-full bg-black hover:bg-gray-800 text-white p-0 ml-1"
                  >
                    {isLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            </div>


          </form>
        </TooltipProvider>
        
        {/* Summary Dialog */}
        <AlertDialog open={showSummary} onOpenChange={setShowSummary}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Conversation Recap</AlertDialogTitle>
              <AlertDialogDescription className="whitespace-pre-line">
                {summary || "Generating summary..."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => {
                  // Future: Implement sharing functionality
                  toast({ title: "Share feature coming soon!", description: "This will allow you to share conversation insights." });
                }}
                className="flex items-center gap-2"
              >
                <Share className="h-4 w-4" />
                Share Insights
              </Button>
              <AlertDialogAction>Close</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* New Contact Modal */}
      <Dialog open={showNewContactModal} onOpenChange={setShowNewContactModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Connection</DialogTitle>
            <DialogDescription>
              Create a new contact in your aviation network. Either email or phone is required.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name *
              </Label>
              <Input
                id="name"
                value={newContactForm.name}
                onChange={(e) => setNewContactForm(prev => ({ ...prev, name: e.target.value }))}
                className="col-span-3"
                placeholder="Full name"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Role
              </Label>
              <Input
                id="role"
                value={newContactForm.role}
                onChange={(e) => setNewContactForm(prev => ({ ...prev, role: e.target.value }))}
                className="col-span-3"
                placeholder="Job title"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="company" className="text-right">
                Company
              </Label>
              <Input
                id="company"
                value={newContactForm.company}
                onChange={(e) => setNewContactForm(prev => ({ ...prev, company: e.target.value }))}
                className="col-span-3"
                placeholder="Company name"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                value={newContactForm.email}
                onChange={(e) => setNewContactForm(prev => ({ ...prev, email: e.target.value }))}
                className="col-span-3"
                placeholder="email@example.com"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Phone *
              </Label>
              <Input
                id="phone"
                value={newContactForm.phone}
                onChange={(e) => setNewContactForm(prev => ({ ...prev, phone: e.target.value }))}
                className="col-span-3"
                placeholder="+1-555-555-0123"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowNewContactModal(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleNewContactSubmit}>
              Add Connection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}