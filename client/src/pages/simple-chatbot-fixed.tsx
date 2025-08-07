import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChevronDown, Send, Upload, Mic, Volume2 } from 'lucide-react';

function AircraftList({
  filter,
  onAircraftSelect,
}: {
  filter?: string;
  onAircraftSelect?: (aircraft: any) => void;
}) {
  const { data: aircraft = [] } = useQuery({
    queryKey: ['/api/aircraft'],
    enabled: true,
  });

  // Filter aircraft based on selected status
  const filteredAircraft = filter
    ? (aircraft as any[]).filter((plane: any) => {
        if (!plane.status_tags) return false;
        const statuses = plane.status_tags
          .toLowerCase()
          .split(',')
          .map((s: string) => s.trim());
        return statuses.includes(filter.toLowerCase());
      })
    : (aircraft as any[]);

  return (
    <div className="space-y-2">
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
              {plane.status_tags ? (
                plane.status_tags
                  .split(',')
                  .map((status: string, index: number) => {
                    const trimmedStatus = status.trim();
                    return (
                      <span
                        key={index}
                        className={`px-2 py-1 text-xs rounded-full ${
                          trimmedStatus === 'operational'
                            ? 'bg-green-100 text-green-800'
                            : trimmedStatus === 'grounded'
                            ? 'bg-red-100 text-red-800'
                            : trimmedStatus === 'scheduled'
                            ? 'bg-blue-100 text-blue-800'
                            : trimmedStatus === 'limited'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {trimmedStatus.charAt(0).toUpperCase() +
                          trimmedStatus.slice(1)}
                      </span>
                    );
                  })
              ) : (
                <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                  Unknown
                </span>
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

export default function SimpleChatbot({
  selectedAircraft,
  onAircraftSelect,
}: {
  selectedAircraft: any;
  onAircraftSelect: (aircraft: any) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([
    { text: 'How can I help you today?', isUser: false },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string>('');

  // Simplified container system state
  const [completedSections, setCompletedSections] = useState<any[]>([]);
  const [currentContainer, setCurrentContainer] = useState<any>(null);

  // Greeting tools
  const { data: greetingTools = [] } = useQuery({
    queryKey: ['/api/tools', { showWithGreeting: true }],
    enabled: true,
  });

  // Fetch selective prompts for tools
  const { data: fleetspanPrompts = [] } = useQuery({
    queryKey: ['/api/tools/1006/selective-prompts'],
    enabled: true,
  });

  // Container management functions
  const toggleSectionExpansion = (sectionId: string) => {
    setCompletedSections((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? { ...section, isExpanded: !section.isExpanded }
          : section,
      ),
    );
  };

  const createNewContainer = (toolName: string) => {
    console.log('🎯 Starting new tool session for:', toolName);

    // If we have a current container, move it to completed sections
    if (currentContainer) {
      const completedSection = {
        ...currentContainer,
        isExpanded: false,
      };

      setCompletedSections((prev) => [...prev, completedSection]);
    }

    // Create new current container
    setCurrentContainer({
      id: `section_${Date.now()}`,
      toolName: toolName,
      messages: [],
    });
  };

  const addMessage = (
    messageOrUpdater: Message | ((prev: Message[]) => Message[]),
  ) => {
    setMessages((prevMessages) => {
      const newMessages =
        typeof messageOrUpdater === 'function'
          ? messageOrUpdater(prevMessages)
          : [...prevMessages, messageOrUpdater];

      // Add to current container if we have one and it's not a function update
      if (currentContainer && typeof messageOrUpdater !== 'function') {
        setCurrentContainer((prev: any) => ({
          ...prev,
          messages: [...prev.messages, messageOrUpdater],
        }));
      }

      return newMessages;
    });
  };

  // Tool click handler
  const handleToolClick = async (tool: any) => {
    console.log(`${tool.name} clicked from greeting!`);

    // Set selected tool for highlighting
    setSelectedTool(tool.name);

    // Create new container for this tool session
    createNewContainer(tool.name);

    // Handle FleetSpan specifically - show filter buttons only (no aircraft until status chosen)
    if (tool.name === 'FleetSpan') {
      // Add FleetSpan filter buttons only
      const fleetspanMessage = {
        text: 'Filter fleet by status:',
        isUser: false,
        isSelectiveAction: true,
        selectivePrompts: fleetspanPrompts as any[],
        toolOutputId: `fleetspan_${Date.now()}`,
      };
      addMessage(fleetspanMessage);
    } else if (tool.name === 'Chat with Others') {
      // Get contacts and add them to current section
      try {
        const response = await fetch('/api/contacts');
        const contactsData = await response.json();

        if (contactsData && contactsData.length > 0) {
          // Add contacts message to conversation
          const contactsMessage = {
            text: 'Select a contact to start chatting:',
            isUser: false,
            isContactsList: true,
            contacts: contactsData,
            toolOutputId: `contacts_${Date.now()}`,
          };
          addMessage(contactsMessage);
        } else {
          const noContactsMessage = {
            text: 'No contacts found. Add some contacts first.',
            isUser: false,
            toolOutputId: `no_contacts_${Date.now()}`,
          };
          addMessage(noContactsMessage);
        }
      } catch (error) {
        console.error('Error fetching contacts:', error);
        const errorMessage = {
          text: 'Failed to load contacts.',
          isUser: false,
          toolOutputId: `contacts_error_${Date.now()}`,
        };
        addMessage(errorMessage);
      }
    } else {
      // For other tools, add a generic message
      const genericMessage = {
        text: `${tool.name} tool activated.`,
        isUser: false,
        toolOutputId: `${tool.name
          .toLowerCase()
          .replace(/\s+/g, '_')}_${Date.now()}`,
      };
      addMessage(genericMessage);
    }

    setHasInteracted(true);
  };

  const sendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = { text: inputValue, isUser: true };
    addMessage(userMessage);
    setInputValue('');
    setIsLoading(true);
    setIsTyping(true);

    // Simulate bot response
    setTimeout(() => {
      const botResponse = 'This is a response to your message.';
      addMessage({ text: botResponse, isUser: false });
      setIsLoading(false);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="h-full flex flex-col">
      <div
        className="flex-1 overflow-y-auto p-4 space-y-4"
        id="messages-container"
      >
        {/* Greeting System - Long or Short based on interaction state */}
        {messages.length > 0 && (
          <div className="space-y-3">
            {/* Long Greeting - initial greeting message + tool buttons */}
            {messages.length === 1 && !currentContainer && (
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

            {/* Short Greeting - just tool buttons after interaction */}
            {hasInteracted && !currentContainer && (
              <div className="grid grid-cols-2 gap-2">
                {(greetingTools as any[]).map((tool: any) => (
                  <Button
                    key={tool.id}
                    onClick={() => handleToolClick(tool)}
                    variant="outline"
                    className={`text-left justify-start h-auto p-3 whitespace-normal ${
                      selectedTool === tool.name
                        ? 'border-blue-500 bg-blue-50'
                        : ''
                    }`}
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
            )}
          </div>
        )}

        {/* Regular chat messages */}
        {messages.slice(1).map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.isUser ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.isUser
                  ? 'bg-blue-500 text-white rounded-br-none'
                  : 'bg-gray-50 text-gray-800 rounded-bl-none'
              }`}
            >
              {message.text}
            </div>
          </div>
        ))}

        {/* Prior Containers - Collapsible with gray borders */}
        {completedSections.map((section) => (
          <div
            key={section.id}
            className="border border-gray-300 rounded-lg overflow-hidden bg-white"
          >
            <div className="bg-gray-50">
              <button
                onClick={() => toggleSectionExpansion(section.id)}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-700 text-sm">
                    {section.toolName}
                    {section.messages.length > 0 && (
                      <span className="ml-1 text-gray-400">
                        ({section.messages.length} items)
                      </span>
                    )}
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
                  {section.messages.map(
                    (message: Message, msgIndex: number) => (
                      <div
                        key={msgIndex}
                        className={`mb-2 last:mb-0 ${
                          message.isUser ? 'text-right' : 'text-left'
                        }`}
                      >
                        {message.isSelectiveAction &&
                        message.selectivePrompts ? (
                          <div className="space-y-3 w-full">
                            <p className="font-medium text-gray-800">
                              {message.text}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {message.selectivePrompts.map((prompt: any) => (
                                <Button
                                  key={prompt.id}
                                  variant="outline"
                                  size="sm"
                                  className={
                                    prompt.cssClasses ||
                                    'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200'
                                  }
                                >
                                  {prompt.promptValue}
                                </Button>
                              ))}
                            </div>
                          </div>
                        ) : message.isAircraftList ? (
                          <AircraftList
                            filter={message.filter}
                            onAircraftSelect={onAircraftSelect}
                          />
                        ) : (
                          <div
                            className={`inline-block p-2 rounded-lg text-sm ${
                              message.isUser
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {message.text}
                          </div>
                        )}
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Current Container - No borders, flows naturally */}
        {currentContainer && currentContainer.messages.length > 0 && (
          <div className="space-y-3">
            {currentContainer.messages.map(
              (message: Message, msgIndex: number) => (
                <div
                  key={msgIndex}
                  className={`mb-2 last:mb-0 ${
                    message.isUser ? 'text-right' : 'text-left'
                  }`}
                >
                  {message.isSelectiveAction && message.selectivePrompts ? (
                    <div className="space-y-3 w-full">
                      <p className="font-medium text-gray-800">
                        {message.text}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {message.selectivePrompts.map((prompt: any) => (
                          <Button
                            key={prompt.id}
                            variant="outline"
                            size="sm"
                            className={
                              prompt.cssClasses ||
                              'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200'
                            }
                            onClick={() => {
                              // Clear previous aircraft list and show new filtered results
                              const filteredMessages =
                                currentContainer.messages.filter(
                                  (msg: Message) => !msg.isAircraftList,
                                );
                              const aircraftListMessage = {
                                text: '',
                                isUser: false,
                                isAircraftList: true,
                                filter: prompt.promptValue,
                                toolOutputId: `aircraft_list_${Date.now()}`,
                              };

                              // Override previous results in current container
                              setCurrentContainer((prev: any) => ({
                                ...prev,
                                messages: [
                                  ...filteredMessages,
                                  aircraftListMessage,
                                ],
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
                    <AircraftList
                      filter={message.filter}
                      onAircraftSelect={onAircraftSelect}
                    />
                  ) : (
                    <div
                      className={`inline-block p-2 rounded-lg text-sm ${
                        message.isUser
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {message.text}
                    </div>
                  )}
                </div>
              ),
            )}
          </div>
        )}
      </div>

      {/* Typing indicator */}
      {isTyping && (
        <div className="px-4 py-2">
          <div className="flex justify-start">
            <div className="bg-gray-50 text-gray-800 rounded-lg p-3 rounded-bl-none">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.1s' }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="border-t bg-white p-4">
        <div className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message..."
              className="resize-none pr-20 min-h-[80px]"
              rows={3}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <div className="absolute bottom-2 right-2 flex space-x-1">
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                <Upload className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                <Volume2 className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                <Mic className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Button onClick={sendMessage} disabled={isLoading} className="px-6">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
