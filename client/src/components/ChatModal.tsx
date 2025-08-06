import { useState, useEffect } from "react";
import { X, Search, Send, Phone, VideoIcon, Plus, Bell, Users, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ChatModalProps {
  selectedContacts: any[];
  contacts: any[];
  onClose: () => void;
  currentUserId?: number | string;
}

export default function ChatModal({ 
  selectedContacts, 
  contacts, 
  onClose, 
  currentUserId 
}: ChatModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);

  // Initialize with first contact if available
  useEffect(() => {
    if (selectedContacts.length > 0 && !selectedConversation) {
      setSelectedConversation(selectedContacts[0]);
    }
  }, [selectedContacts, selectedConversation]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const message = {
      id: Date.now(),
      message: newMessage,
      isCurrentUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, message]);
    setNewMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Filter contacts based on search
  const filteredContacts = contacts.filter(contact =>
    contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Create conversations data structure
  const getTabContent = (tab: string) => {
    if (tab === "all") {
      return filteredContacts.map(contact => ({
        id: contact.id || contact.contactId,
        name: contact.name || contact.email || contact.phone || `Contact ${contact.id}`,
        lastMessage: "No messages yet",
        timestamp: "Now",
        unreadCount: 0,
        isOnline: true,
        isGroup: false,
        avatar: contact.avatar || ""
      }));
    } else if (tab === "direct") {
      return filteredContacts.filter(contact => !contact.isGroup).map(contact => ({
        id: contact.id || contact.contactId,
        name: contact.name || contact.email || contact.phone || `Contact ${contact.id}`,
        lastMessage: "No messages yet",
        timestamp: "Now", 
        unreadCount: 0,
        isOnline: true,
        isGroup: false,
        avatar: contact.avatar || ""
      }));
    } else if (tab === "groups") {
      return filteredContacts.filter(contact => contact.isGroup).map(contact => ({
        id: contact.id || contact.contactId,
        name: contact.name || contact.email || contact.phone || `Group ${contact.id}`,
        lastMessage: "No messages yet",
        timestamp: "Now",
        unreadCount: 0,
        isOnline: false,
        isGroup: true,
        avatar: contact.avatar || ""
      }));
    }
    return [];
  };

  return (
    <>
      {/* Modal Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="fixed inset-x-4 top-24 bottom-4 bg-white rounded-lg shadow-2xl z-50 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-96 border-r border-gray-200 flex flex-col bg-gray-50">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-blue-600" />
                <span className="text-blue-600 font-medium">Notifications</span>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-3">
              <h1 className="text-2xl font-bold text-gray-900">avi.OS</h1>
              <p className="text-sm text-gray-600">avi.OS Chat</p>
            </div>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-hidden">
            <Tabs defaultValue="all" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-3 mx-4 mt-4">
                <TabsTrigger value="all">All Chats</TabsTrigger>
                <TabsTrigger value="groups">Groups</TabsTrigger>
                <TabsTrigger value="direct">Direct</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="flex-1 m-0">
                <ScrollArea className="h-full">
                  <div className="space-y-1 p-2">
                    {getTabContent("all").map((conversation) => (
                      <div
                        key={conversation.id}
                        onClick={() => setSelectedConversation(conversation)}
                        className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedConversation?.id === conversation.id 
                            ? 'bg-blue-50 border border-blue-200' 
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={conversation.avatar} alt={conversation.name} />
                            <AvatarFallback className="bg-blue-600 text-white">
                              {conversation.isGroup ? (
                                <Users className="h-5 w-5" />
                              ) : (
                                conversation.name?.slice(0, 2).toUpperCase() || <User className="h-5 w-5" />
                              )}
                            </AvatarFallback>
                          </Avatar>
                          {conversation.isOnline && !conversation.isGroup && (
                            <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-white rounded-full"></div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {conversation.name}
                            </p>
                            <span className="text-xs text-gray-500">{conversation.timestamp}</span>
                          </div>
                          <p className="text-sm text-gray-600 truncate">{conversation.lastMessage}</p>
                        </div>
                        
                        {conversation.unreadCount > 0 && (
                          <Badge variant="secondary" className="bg-blue-600 text-white min-w-[20px] h-5 text-xs flex items-center justify-center rounded-full">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="groups" className="flex-1 m-0">
                <ScrollArea className="h-full">
                  <div className="space-y-1 p-2">
                    {getTabContent("groups").map((conversation) => (
                      <div
                        key={conversation.id}
                        onClick={() => setSelectedConversation(conversation)}
                        className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedConversation?.id === conversation.id 
                            ? 'bg-blue-50 border border-blue-200' 
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-gray-600 text-white">
                            <Users className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {conversation.name}
                            </p>
                            <span className="text-xs text-gray-500">{conversation.timestamp}</span>
                          </div>
                          <p className="text-sm text-gray-600 truncate">{conversation.lastMessage}</p>
                        </div>
                        
                        {conversation.unreadCount > 0 && (
                          <Badge variant="secondary" className="bg-blue-600 text-white min-w-[20px] h-5 text-xs flex items-center justify-center rounded-full">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="direct" className="flex-1 m-0">
                <ScrollArea className="h-full">
                  <div className="space-y-1 p-2">
                    {getTabContent("direct").map((conversation) => (
                      <div
                        key={conversation.id}
                        onClick={() => setSelectedConversation(conversation)}
                        className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedConversation?.id === conversation.id 
                            ? 'bg-blue-50 border border-blue-200' 
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={conversation.avatar} alt={conversation.name} />
                            <AvatarFallback className="bg-blue-600 text-white">
                              {conversation.name?.slice(0, 2).toUpperCase() || <User className="h-5 w-5" />}
                            </AvatarFallback>
                          </Avatar>
                          {conversation.isOnline && (
                            <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-white rounded-full"></div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {conversation.name}
                            </p>
                            <span className="text-xs text-gray-500">{conversation.timestamp}</span>
                          </div>
                          <p className="text-sm text-gray-600 truncate">{conversation.lastMessage}</p>
                        </div>
                        
                        {conversation.unreadCount > 0 && (
                          <Badge variant="secondary" className="bg-blue-600 text-white min-w-[20px] h-5 text-xs flex items-center justify-center rounded-full">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Right Chat Area */}
        <div className="flex-1 flex flex-col bg-white">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedConversation.avatar} alt={selectedConversation.name} />
                    <AvatarFallback className="bg-blue-600 text-white">
                      {selectedConversation.isGroup ? (
                        <Users className="h-5 w-5" />
                      ) : (
                        selectedConversation.name?.slice(0, 2).toUpperCase() || <User className="h-5 w-5" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedConversation.name}</h3>
                    <p className="text-sm text-gray-500">
                      {selectedConversation.isGroup ? "Group chat" : selectedConversation.isOnline ? "Online" : "Offline"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <VideoIcon className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={onClose}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Messages Area */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  <div className="text-center">
                    <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      Today
                    </span>
                  </div>
                  
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.isCurrentUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex items-start space-x-2 max-w-xs lg:max-w-md ${
                        message.isCurrentUser ? 'flex-row-reverse space-x-reverse' : ''
                      }`}>
                        {!message.isCurrentUser && (
                          <Avatar className="h-8 w-8 mt-1">
                            <AvatarFallback className="bg-gray-300 text-gray-700 text-xs">
                              {message.senderName}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        
                        <div className={`px-4 py-2 rounded-lg ${
                          message.isCurrentUser 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-900'
                        }`}>
                          <p className="text-sm">{message.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200 bg-white">
                <div className="text-xs text-gray-500 mb-2">
                  Press Enter to send, Shift+Enter for new line
                </div>
                <div className="flex items-end space-x-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="resize-none"
                    />
                  </div>
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* New Contact Button */}
              <div className="p-4 bg-gray-50">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  New Contact
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
                <p className="text-gray-500">Choose a contact or group to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}