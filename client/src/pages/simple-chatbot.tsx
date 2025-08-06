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
  ChevronDown
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { TypingIndicator } from "@/components/ui/typing-indicator";
import MessageContainer from "@/components/MessageContainer";

// Aircraft List Component
function AircraftList({ filter, onAircraftSelect }: { filter?: string; onAircraftSelect?: (aircraft: any) => void }) {
  const { data: aircraft = [] } = useQuery({
    queryKey: ['/api/aircraft'],
    enabled: true
  });

  // Filter aircraft based on selected status
  const filteredAircraft = aircraft.filter((plane: any) => {
    if (!filter || filter === 'All') return true;

    const statusTags = plane.status_tags?.toLowerCase() || '';
    const filterLower = filter.toLowerCase();

    if (filterLower === 'operational') return statusTags.includes('operational');
    if (filterLower === 'grounded') return statusTags.includes('grounded');
    if (filterLower === 'scheduled') return statusTags.includes('scheduled');
    if (filterLower === 'limited/monitor') return statusTags.includes('limited');

    return true;
  });

  return (
    <div className="grid grid-cols-1 gap-2">
      {filteredAircraft.map((plane: any) => (
        <div
          key={plane.id}
          className="p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors"
          onClick={() => onAircraftSelect?.(plane)}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium text-gray-900">{plane.tail_number}</p>
              <p className="text-sm text-gray-600">{plane.model}</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {plane.status_tags ? plane.status_tags.split(',').map((status: string, index: number) => {
                const trimmedStatus = status.trim();
                return (
                  <span
                    key={index}
                    className={`px-2 py-1 text-xs rounded-full ${
                      trimmedStatus === 'operational' ? 'bg-green-100 text-green-800' :
                      trimmedStatus === 'grounded' ? 'bg-red-100 text-red-800' :
                      trimmedStatus === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                      trimmedStatus === 'limited' ? 'bg-gray-100 text-gray-800' :
                      'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {trimmedStatus.charAt(0).toUpperCase() + trimmedStatus.slice(1)}
                  </span>
                );
              }) : (
                <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">Unknown</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

type Message = {
  text: string;
  isUser: boolean;
  rating?: number;
  id?: number;
  isAircraftCard?: boolean;
  aircraft?: any;
  isSelectiveAction?: boolean;
  selectivePrompts?: any[];
  isContactsList?: boolean;
  contacts?: any[];
  toolOutputId?: string;
  isAircraftSelector?: boolean;
  isAircraftList?: boolean;
  filter?: string;
};

export default function SimpleChatbot({ selectedAircraft, onAircraftSelect }: {
  selectedAircraft: any;
  onAircraftSelect: (aircraft: any) => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();

  // State management
  const [messages, setMessages] = useState<Message[]>([
    { text: "How can I help you today?", isUser: false }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string>("");

  // Simplified container system state
  const [completedSections, setCompletedSections] = useState<any[]>([]);
  const [currentContainer, setCurrentContainer] = useState<any>(null);

  // Greeting tools
  const { data: greetingTools = [] } = useQuery({
    queryKey: ['/api/tools', { showWithGreeting: true }],
    enabled: true
  });

  // Container management functions
  const toggleSectionExpansion = (sectionId: string) => {
    setCompletedSections(prev =>
      prev.map(section =>
        section.id === sectionId
          ? { ...section, isExpanded: !section.isExpanded }
          : section
      )
    );
  };

  const createNewContainer = (toolName: string) => {
    console.log("🎯 Starting new tool session for:", toolName);

    // If we have a current container, move it to completed sections
    if (currentContainer) {
      const completedSection = {
        ...currentContainer,
        isExpanded: false
      };

      setCompletedSections(prev => [...prev, completedSection]);
    }

    // Create new current container
    const newContainer = {
      id: `section_${Date.now()}`,
      toolName: toolName,
      messages: []
    };
    console.log("📦 Created new container:", newContainer);
    setCurrentContainer(newContainer);
  };

  const addMessage = (messageOrUpdater: Message | ((prev: Message[]) => Message[])) => {
    console.log("📨 Adding message:", messageOrUpdater);
    console.log("📦 Current container state:", currentContainer);

    setMessages(prevMessages => {
      const newMessages = typeof messageOrUpdater === 'function'
        ? messageOrUpdater(prevMessages)
        : [...prevMessages, messageOrUpdater];

      // Add to current container if we have one and it's not a function update
      if (currentContainer && typeof messageOrUpdater !== 'function') {
        console.log("✅ Adding to current container");
        setCurrentContainer((prev: any) => ({
          ...prev,
          messages: [...prev.messages, messageOrUpdater]
        }));
      } else {
        console.log("❌ Not adding to container - currentContainer:", currentContainer, "isFunction:", typeof messageOrUpdater === 'function');
      }

      return newMessages;
    });
  };

  // Fetch selective prompts for tools
  const { data: fleetspanPrompts = [] } = useQuery({
    queryKey: ['/api/tools/1006/selective-prompts'],
    enabled: true
  });

  // Helper function to get selective action text for each tool
  const getSelectiveActionText = (toolName: string): string => {
    switch (toolName) {
      case "FleetSpan": return "Filter fleet by status:";
      case "Chat with Others": return "Choose how to connect:";
      case "Sort": return "Choose sorting option:";
      default: return "Choose an action:";
    }
  };

  // Helper function to get primary action for each tool
  const getPrimaryActionForTool = async (tool: any) => {
    switch (tool.name) {
      case "Chat with Others":
        try {
          const response = await fetch('/api/contacts');
          const contactsData = await response.json();

          return contactsData && contactsData.length > 0
            ? {
                text: "Select a contact to start chatting:",
                isUser: false,
                isContactsList: true,
                contacts: contactsData,
                toolOutputId: `contacts_${Date.now()}`
              }
            : {
                text: "No contacts found. Add some contacts first.",
                isUser: false,
                toolOutputId: `no_contacts_${Date.now()}`
              };
        } catch (error) {
          return {
            text: "Authentication required to load contacts.",
            isUser: false,
            toolOutputId: `contacts_error_${Date.now()}`
          };
        }

      case "FleetSpan":
        // FleetSpan only shows aircraft after filter selection, no primary action on initial load
        return null;

      default:
        // Most tools don't have primary actions by default
        return null;
    }
  };

  // Tool click handler
  const handleToolClick = (tool: any) => {
    try {
      console.log(`${tool.name} clicked from greeting!`);

      // Set selected tool for highlighting
      setSelectedTool(tool.name);

      // Generic handler for ALL tools - dynamic sub-container system
      const handleToolWithActions = async () => {
        const toolMessages = [];

        // Step 1: Always check for Selective Actions first
        try {
          const selectiveResponse = await fetch(`/api/tools/${tool.id}/selective-prompts`);

          if (selectiveResponse.ok) {
            const promptData = await selectiveResponse.json();

            if (promptData && promptData.length > 0) {
              // Add Selective Actions sub-container
              const selectiveMessage = {
                text: getSelectiveActionText(tool.name),
                isUser: false,
                isSelectiveAction: true,
                selectivePrompts: promptData,
                toolOutputId: `selective_${Date.now()}`
              };
              toolMessages.push(selectiveMessage);
            }
          }
        } catch (error) {
          console.error(`Error fetching selective prompts for ${tool.name}:`, error);
        }

        // Step 2: Check if tool needs Primary Actions sub-container
        const primaryAction = await getPrimaryActionForTool(tool);
        if (primaryAction) {
          toolMessages.push(primaryAction);
        }

        // Step 3: If no sub-containers, create default activation
        if (toolMessages.length === 0) {
          toolMessages.push({
            text: `${tool.name} tool activated.`,
            isUser: false,
            toolOutputId: `tool_${Date.now()}`
          });
        }

        // Create new container with all sub-containers
        setCurrentContainer({
          id: `section_${Date.now()}`,
          toolName: tool.name,
          messages: toolMessages
        });
      };

      handleToolWithActions();
    } catch (error) {
      console.error('Error in tool handling:', error);
      // Fallback: create simple container
      setCurrentContainer({
        id: `section_${Date.now()}`,
        toolName: tool.name,
        messages: [{
          text: `${tool.name} tool activated.`,
          isUser: false,
          toolOutputId: `tool_${Date.now()}`
        }]
      });
    }
  };

  // Message sending
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input;

    // Start capturing session for direct chat if not already active
    if (!currentContainer) {
      createNewContainer("Direct Chat");
    }

    addMessage({ text: userMessage, isUser: true });
    setInput("");
    setIsLoading(true);
    setIsTyping(true);

    // Simulate bot response
    setTimeout(() => {
      const botResponse = "This is a response to your message.";
      addMessage({ text: botResponse, isUser: false });
      setIsLoading(false);
      setIsTyping(false);
    }, 1500);
  };

  // Handle tool click from selective actions (filter buttons)
  const handleSelectiveAction = (action: any, toolName: string) => {
    console.log(`Selective action clicked: ${action.promptValue} for ${toolName}`);

    if (toolName === "FleetSpan") {
      // Handle FleetSpan filter actions
      const aircraftMessage = {
        text: "",
        isUser: false,
        isAircraftList: true,
        filter: action.promptValue,
        toolOutputId: `aircraft_list_${Date.now()}`
      };
      addMessage(aircraftMessage);
    } else if (toolName === "Chat with Others") {
      // Handle Chat selective actions - could trigger contacts loading
      const chatMessage = {
        text: "Loading contacts...",
        isUser: false,
        toolOutputId: `chat_action_${Date.now()}`
      };
      addMessage(chatMessage);
    }
  };



  // Handle aircraft selection
  const handleAircraftSelect = (aircraft: any) => {
    setSelectedAircraft(aircraft);
  };

  // Handle container selection from actions
  const handleContainerSelect = () => {
    // Implementation for container selection
  };

  // Container state management
  const [hasInteracted, setHasInteracted] = useState(false);

  // Render functions for the interface
  const renderGreeting = () => {
    if (!hasInteracted) {
      return (
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
            How can I help you today?
          </h2>
          <div className="flex flex-wrap gap-2 justify-center">
            {tools.filter(tool => tool.showWithGreeting).map((tool) => (
              <button
                key={tool.id}
                onClick={() => handleToolClick(tool)}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  selectedTool === tool.name
                    ? 'bg-blue-100 border-blue-300 text-blue-800'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tool.name}
              </button>
            ))}
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex flex-wrap gap-2 justify-center mb-6">
          {tools.filter(tool => tool.showWithGreeting).map((tool) => (
            <button
              key={tool.id}
              onClick={() => handleToolClick(tool)}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                selectedTool === tool.name
                  ? 'bg-blue-100 border-blue-300 text-blue-800'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tool.name}
            </button>
          ))}
        </div>
      );
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {renderGreeting()}

        {/* Render prior containers */}
        {/* {priorContainers.map((container) => (
          <MessageContainer
            key={container.id}
            container={container}
            isCurrentContainer={false}
            onSelectiveAction={handleSelectiveAction}
            onAircraftSelect={handleAircraftSelect}
          />
        ))} */}

        {/* Render current container */}
        {currentContainer && (
          <MessageContainer
            container={currentContainer}
            isCurrentContainer={true}
            onSelectiveAction={handleSelectiveAction}
            onAircraftSelect={handleAircraftSelect}
          />
        )}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-3 max-w-xs">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input form */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default SimpleChatbot;
              <>
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-lg p-3 bg-gray-50 text-gray-800 rounded-tl-none">
                    {messages[0].text}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(greetingTools as any[]).map((tool: any) => (
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
              </>
            )}

            {/* Short Greeting - just tool buttons (after interactions start) */}
            {(messages.length > 1 || currentContainer) && (
              <div className="flex flex-wrap gap-2">
                {(greetingTools as any[]).map((tool: any) => (
                  <Button
                    key={tool.id}
                    onClick={() => handleToolClick(tool)}
                    variant="outline"
                    size="sm"
                    className={`h-7 px-3 text-xs font-normal ${
                      selectedTool === tool.name
                        ? "bg-blue-100 border-blue-500 text-blue-700 hover:bg-blue-200"
                        : "hover:bg-gray-50"
                    }`}
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
                      section.toolName === "Direct Chat" ? "bg-green-500" : "bg-blue-500"
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
                    {section.messages.map((message: Message, msgIndex: number) => (
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

          {/* Current Container - No borders, flows naturally */}
          {currentContainer && (
            <div className="space-y-3">
              {currentContainer.messages.map((message: Message, msgIndex: number) => (
                <div key={msgIndex} className={`mb-2 last:mb-0 ${message.isUser ? "text-right" : "text-left"}`}>
                  {message.isSelectiveAction && message.selectivePrompts ? (
                    <div className="space-y-3 w-full">
                      <p className="font-medium text-gray-800">{message.text}</p>
                      <div className="flex flex-wrap gap-2">
                        {message.selectivePrompts.map((prompt: any) => (
                          <Button
                            key={prompt.id}
                            variant="outline"
                            size="sm"
                            className={prompt.cssClasses || "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200"}
                            onClick={() => {
                              // Clear previous aircraft list and show new filtered results

                              // Clear previous aircraft list and show new filtered results
                              const filteredMessages = currentContainer.messages.filter((msg: Message) => !msg.isAircraftList);
                              const aircraftListMessage = {
                                text: "",
                                isUser: false,
                                isAircraftList: true,
                                filter: prompt.promptValue,
                                toolOutputId: `aircraft_list_${Date.now()}`
                              };

                              // Override previous results in current container
                              setCurrentContainer(prev => ({
                                ...prev,
                                messages: [...filteredMessages, aircraftListMessage]
                              }));
                              addMessage(aircraftListMessage);
                            }}
                          >
                            {prompt.promptValue}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : message.isAircraftList ? (
                    <AircraftList filter={message.filter} onAircraftSelect={onAircraftSelect} />
                  ) : (
                    <div className={`inline-block p-2 rounded-lg text-sm ${
                      message.isUser
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}>
                      {message.text}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg p-3 bg-gray-50 text-gray-800 rounded-tl-none">
              <TypingIndicator />
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Input form with full controls */}
      <div className="border-t p-4">
        <form onSubmit={handleSendMessage} className="space-y-3">
          {/* Multi-line textarea */}
          <div className="relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask, Action, or Observe..."
              className="flex-1 min-h-[80px] max-h-[200px] resize-none pr-4 pb-12"
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />

            {/* Control buttons overlay */}
            <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
              <div className="flex space-x-2">
                {/* Upload button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  title="Upload file"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </Button>

                {/* Microphone button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  title="Voice input"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </Button>

                {/* Speaker button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  title="Text to speech"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M9 12a1 1 0 01-1-1V9a1 1 0 011-1h1a1 1 0 011 1v2a1 1 0 01-1 1H9z" />
                  </svg>
                </Button>
              </div>

              {/* Send button */}
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                size="sm"
                className="h-8"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
