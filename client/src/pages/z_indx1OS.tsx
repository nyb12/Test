import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ChatbotHeader from "@/components/layout/ChatbotHeader";
import { Textarea } from "@/components/ui/textarea";
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
  LogOut
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
      const newSet = new Set<string>();
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
      await eventHandler();
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
            isUser: false
          };
          setMessages(prev => [...prev, noResultsMessage]);
        } else {
          const aircraftMessage = {
            text: `Found ${filteredAircraft.length} ${prompt.prompt_value.toLowerCase()} aircraft:`,
            isUser: false,
            isAircraftCard: true,
            aircraft: filteredAircraft
          };
          setMessages(prev => [...prev, aircraftMessage]);
        }
        
        // Auto-scroll after response
        setTimeout(() => {
          const messagesContainer = document.getElementById('messages-container');
          if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          }
        }, 100);
        
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

  // Function registry for selective actions
  const selectiveActionFunctions = {
    filterFleetByStatus: async (promptValue: string) => {
      console.log('Filtering by:', promptValue);
      
      // Show user message with filter selection
      const filterMessage = {
        text: `Show all ${promptValue.toLowerCase()} aircraft`,
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
        const aircraftData = await response.json();
        
        // Filter aircraft by status
        const filteredAircraft = aircraftData.filter((aircraft: any) => 
          aircraft.primary_status?.toLowerCase() === promptValue.toLowerCase()
        );
        
        // Generate AI response about the filtered fleet
        const aiResponse = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `Fleet status report: Found ${filteredAircraft.length} ${promptValue.toLowerCase()} aircraft. Provide operational insights.`,
            conversation_history: messages.slice(-5)
          })
        });
        
        const aiData = await aiResponse.json();
        setIsTyping(false);
        
        const botMessage = {
          text: aiData.response,
          isUser: false,
          id: aiData.conversation_id
        };
        setMessages(prev => [...prev, botMessage]);
      } catch (error) {
        console.error('Error filtering fleet:', error);
        setIsTyping(false);
        const errorMessage = {
          text: "Sorry, I couldn't filter the fleet data right now. Please try again.",
          isUser: false
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    },

    manageContacts: async () => {
      console.log('Managing contacts');
      
      // Create direct JSON payload with contact data
      const contactsData = [
        {
          id: 1,
          name: "Sarah Mitchell",
          role: "Director of Maintenance", 
          company: "Aviation Tech Solutions",
          email: "sarah.mitchell@aviationtech.com",
          phone: "+1-555-555-0123",
          invitation_status: "Accepted"
        },
        {
          id: 2,
          name: "Captain James Rodriguez",
          role: "Chief Pilot",
          company: "Skyline Aviation", 
          email: "j.rodriguez@skylineaviation.com",
          phone: "+1-555-555-0456",
          invitation_status: "Accepted"
        },
        {
          id: 3,
          name: "Michael Chen",
          role: "Parts Manager",
          company: "Aerospace Parts Supply",
          email: "mchen@partsupply.net", 
          phone: "+1-555-555-0789",
          invitation_status: "Declined"
        },
        {
          id: 4,
          name: "Lisa Thompson",
          role: "Flight Operations Manager",
          company: "Elite Flight Operations",
          email: "lisa.thompson@flightops.com",
          phone: "+1-555-555-0321", 
          invitation_status: "Invited"
        }
      ];
      
      const contactsMessage = {
        text: `Aviation Network Contacts (${contactsData.length} total)`,
        isUser: false,
        isContactsList: true,
        contacts: contactsData
      };
      setMessages(prev => [...prev, contactsMessage]);
    },

    chatNow: async () => {
      console.log('Starting chat');
      
      const chatMessage = {
        text: "Chat feature is ready! You can now communicate with your aviation network contacts.",
        isUser: false
      };
      setMessages(prev => [...prev, chatMessage]);
    }
  };
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [selectedToolIndex, setSelectedToolIndex] = useState(0);

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

  return (
    <div className="h-screen flex flex-col bg-white">
      <ChatbotHeader onNewChat={handleNewChat} />
      
      <div className="flex-1 flex flex-col overflow-hidden p-4 max-w-4xl mx-auto w-full">
        <div className="flex-1 overflow-y-auto space-y-3 mb-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] p-3 rounded-lg ${
                  message.isUser
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.text}</p>
              </div>
            </div>
          ))}
          {isTyping && <TypingIndicator />}
        </div>

        <div className="border-t pt-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (input.trim()) {
                const userMessage = { text: input, isUser: true };
                setMessages(prev => [...prev, userMessage]);
                
                // Simple bot response simulation
                setTimeout(() => {
                  const randomResponse = BOT_RESPONSES[Math.floor(Math.random() * BOT_RESPONSES.length)];
                  const botMessage = { text: randomResponse, isUser: false };
                  setMessages(prev => [...prev, botMessage]);
                }, 1000);
                
                setInput("");
              }
            }}
            className="flex space-x-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}