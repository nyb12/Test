import React, { useEffect, useRef, useState } from 'react';
import { aitroubleshoot, questionSuggestion } from '../../components/svg';
import { useChatbot } from '@/hooks/use-chatbot';
import { useChatStore } from '../../stores/chatStore';
import { CheckCircle, FileText, Mic, Camera, File, Image } from 'lucide-react';
import { SafeHtml, stripHtml } from '@/utils/helper';
import { clip, emoji } from '../../components/svg';
import EmojiPicker from 'emoji-picker-react';
import ChatSidebar from './chatHistorysidebar';
import { useAuth } from '@/hooks/use-auth';
import FileDisplay from '@/components/FileDisplay';
import { FileDisplayMetadata, FileInfo } from '@/utils/fileUtils';

const questionSuggestionList = [
  {
    title: 'Troubleshoot a technical issue',
    icon: questionSuggestion,
  },
  {
    title: 'Help me locate a replacement part.',
    icon: questionSuggestion,
  },
];

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const ChatMessageBubble = ({
  text,
  isUser,
  timestamp,
  sender,
  isSuccess,
  attachment,
  isHtml,
  files,
  responseFiles,
}: any) => {
  // Convert File objects to FileInfo format for display
  const [fileInfo, setFileInfo] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (!files || files.length === 0) {
      setFileInfo([]);
      return;
    }

    const first = files[0] as any;

    const isFileObject =
      typeof first === 'object' &&
      typeof first.name === 'string' &&
      typeof first.size === 'number' &&
      typeof first.type === 'string';

    if (isFileObject) {
      const urls = (files as File[]).map((file) => ({
        FileUrl: URL.createObjectURL(file),
        FileName: file.name,
        FileType: file.type,
      }));
      setFileInfo(urls);
      return () => {
        urls.forEach((u) => URL.revokeObjectURL(u.FileUrl));
      };
    } else {
      // assume these already are FileInfo[]
      setFileInfo(files as FileInfo[]);
    }
  }, [files]);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
      {!isUser && (
        <img
          src={aitroubleshoot}
          alt="AI"
          className="w-6 h-6 mr-2 self-start mt-1"
        />
      )}
      <div
        className={`max-w-[75%] rounded-2xl shadow relative
        ${
          isSuccess
            ? 'border border-green-400 bg-green-50 px-4 py-3 flex items-center gap-2'
            : isUser
            ? 'bg-blue-50 text-blue-900 px-4 py-3'
            : 'bg-white text-gray-800 border px-4 py-3'
        }
      `}
      >
        {isSuccess && (
          <CheckCircle className="text-green-500 w-5 h-5 mr-2 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          {text && <SafeHtml html={text} />}

          {/* Display uploaded files using FileDisplay component */}
          {fileInfo.length > 0 && (
            <FileDisplay
              metadata={{
                Files: fileInfo,
              }}
              className="mt-2"
            />
          )}

          {/* Display response files from API */}
          {responseFiles && responseFiles.length > 0 && (
            <FileDisplay
              metadata={{
                Files: responseFiles,
              }}
              className="mt-2"
            />
          )}

          {attachment && (
            <FileDisplay
              metadata={{
                FileUrl: attachment.url,
                FileName: attachment.name,
                FileType: attachment.type || 'application/octet-stream',
              }}
              className="mt-2"
            />
          )}
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-gray-400">{sender || ''}</span>
            <span className="text-xs text-gray-400 ml-2">
              {formatTime(timestamp)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const TroubleShoot = ({ selectedAircraft, key, onAircraftSelect }: any) => {
  const [activeChatId, setActiveChatId] = useState<string | undefined>();

  const handleNewConversationCreated = (conversationId: string) => {
    // Add a small delay to ensure the sidebar has time to refresh
    setTimeout(() => {
      setActiveChatId(conversationId);
    }, 100);
  };

  const {
    input,
    setInput,
    isLoading,
    isTyping,
    messages,
    sendMessage,
    setMessages: setChatbotMessages,
    clearConversationId,
  } = useChatbot(activeChatId, handleNewConversationCreated);
  const {
    pendingMessage,
    clearPendingMessage,
    setMessages: setStoreMessages,
  } = useChatStore();
  const { user } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAttachDropdown, setShowAttachDropdown] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isProcessingPendingMessage, setIsProcessingPendingMessage] =
    useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const attachBtnRef = useRef<HTMLButtonElement>(null);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (pendingMessage) {
      setIsProcessingPendingMessage(true);
      setInput(pendingMessage);
      const timer = setTimeout(() => {
        sendMessage(pendingMessage, selectedFiles);
        clearPendingMessage();
        setIsProcessingPendingMessage(false);
      }, 200);

      return () => {
        clearTimeout(timer);
        setIsProcessingPendingMessage(false);
      };
    }
  }, [pendingMessage, setInput, sendMessage, clearPendingMessage]);

  const handleMicClick = () => {
    alert('Mic clicked! (Implement audio recording here)');
  };

  // File input handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate file sizes (max 50MB per file)
    const maxSize = 50 * 1024 * 1024; // 50MB
    const validFiles = files.filter((file) => {
      if (file.size > maxSize) {
        alert(`File ${file.name} is too large. Maximum size is 50MB.`);
        return false;
      }
      return true;
    });

    // Add valid files to selected files state
    setSelectedFiles(validFiles);

    // Clear the file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Dropdown actions
  const handleCameraUpload = () => {
    setShowAttachDropdown(false);
    // For now, just trigger file input for camera uploads
    fileInputRef.current?.click();
  };
  const handleFileUpload = () => {
    setShowAttachDropdown(false);
    fileInputRef.current?.click();
  };
  const handleImageUpload = () => {
    setShowAttachDropdown(false);
    // For image uploads, we can use the same file input
    fileInputRef.current?.click();
  };
  // Emoji picker handler
  const handleEmojiClick = (emojiData: any) => {
    try {
      if (emojiData && emojiData.emoji) {
        setInput(input + emojiData.emoji);
        setShowEmojiPicker(false); // Close picker after selection
      } else {
        setInput(input + '🙂');
      }
    } catch (error) {
      console.error('Error handling emoji click:', error);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input, selectedFiles);
    setSelectedFiles([]); // Clear selected files after sending
    if (textareaRef.current) textareaRef.current.focus();
  };

  const handleSuggestion = (suggestion: string) => {
    setInput(suggestion);
    setTimeout(() => sendMessage(suggestion, selectedFiles), 100);
  };

  const handleChatSelect = (chatId: string) => {
    setActiveChatId(chatId);
  };

  const handleNewChat = () => {
    setActiveChatId(undefined);
    clearConversationId();
    setStoreMessages([]);
    setInput('');
  };

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Auto-scroll to bottom when a new message is added
  useEffect(() => {
    if (messages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="flex h-screen bg-gradient-to-b from-[#D8DEF1] to-[#FAFBFF]">
      {/* Chat History Sidebar */}
      <ChatSidebar
        onChatSelect={handleChatSelect}
        onNewChat={handleNewChat}
        activeChatId={activeChatId}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        userId={user?.id}
      />

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col">
        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <img
                src={aitroubleshoot}
                alt="aitroubleshoot"
                className="w-16 h-16 mb-8"
              />
              <span className="flex flex-col items-center justify-center">
                <span className="text-center md:text-4xl text-sm font-semibold text-gray-800 ">
                  What would you like to check
                </span>
                <span className="text-center md:text-4xl text-sm font-semibold text-gray-800 mb-6">
                  on your fleet today?
                </span>
              </span>

              {isProcessingPendingMessage && (
                <div className="flex items-center justify-center mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-blue-700 text-sm font-medium">
                      Processing your message...
                    </span>
                  </div>
                </div>
              )}

              <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {questionSuggestionList.map((item) => (
                  <button
                    key={item.title}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-white shadow-sm text-sm sm:text-base font-medium text-gray-800"
                    type="button"
                    onClick={() => handleSuggestion(item.title)}
                    disabled={isLoading || isProcessingPendingMessage}
                  >
                    <div className="flex items-center justify-center w-6 h-6">
                      <img
                        src={item.icon}
                        alt="questionSuggestion"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <span className="text-left">{item.title}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl max-h-[calc(100vh-100px)] mx-auto space-y-2">
              {messages.map((msg, idx) => (
                <ChatMessageBubble
                  key={idx}
                  text={msg.text}
                  isUser={msg.isUser}
                  timestamp={msg.timestamp}
                  sender={selectedAircraft?.tail_number}
                  isSuccess={msg.isSuccess}
                  attachment={msg.attachment}
                  isHtml={msg.isHtml}
                  files={msg.files}
                  responseFiles={msg.responseFiles}
                />
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border rounded-2xl px-4 py-3 shadow">
                    <span className="typing-indicator inline-flex items-center gap-1">
                      <span
                        className="dot bg-gray-400 inline-block w-2 h-2 rounded-full animate-bounce"
                        style={{ animationDelay: '0s' }}
                      ></span>
                      <span
                        className="dot bg-gray-400 inline-block w-2 h-2 rounded-full animate-bounce"
                        style={{ animationDelay: '0.2s' }}
                      ></span>
                      <span
                        className="dot bg-gray-400 inline-block w-2 h-2 rounded-full animate-bounce"
                        style={{ animationDelay: '0.4s' }}
                      ></span>
                    </span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="px-4 py-4">
          <div className="max-w-4xl mx-auto">
            {/* File preview area */}
            {selectedFiles.length > 0 && (
              <div className="mb-3 p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Selected Files ({selectedFiles.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedFiles([])}
                    className="text-sm text-red-500 hover:text-red-700"
                  >
                    Clear All
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-white p-2 rounded border"
                    >
                      {file.type.startsWith('image/') ? (
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-6 h-6 object-cover rounded"
                        />
                      ) : (
                        <FileText className="w-4 h-4 text-purple-500" />
                      )}
                      <span className="text-sm text-gray-600 truncate max-w-32">
                        {file.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form
              onSubmit={handleSend}
              className="relative flex items-center bg-white rounded-xl border border-gray-300 shadow-sm px-2"
            >
              {/* Left-side: Attach and Emoji */}
              <div className="flex flex-col md:flex-row items-center gap-1 mr-2 relative">
                <button
                  type="button"
                  ref={attachBtnRef}
                  onClick={() => setShowAttachDropdown((v) => !v)}
                  className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Attach"
                  disabled={isLoading || isProcessingPendingMessage}
                >
                  <img src={clip} alt="attach" className="w-5 h-5" />
                </button>
                {showAttachDropdown && (
                  <div className="absolute left-0 bottom-10 bg-white border border-gray-200 rounded-lg shadow-lg z-20 w-40">
                    <ul className="py-1 text-sm text-gray-700">
                      <li
                        className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer justify-between"
                        onClick={handleCameraUpload}
                      >
                        Camera Upload <Camera className="w-4 h-4" />
                      </li>
                      <li
                        className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer justify-between"
                        onClick={handleFileUpload}
                      >
                        Upload Files <File className="w-4 h-4" />
                      </li>
                      <li
                        className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer justify-between"
                        onClick={handleImageUpload}
                      >
                        Upload Images <Image className="w-4 h-4" />
                      </li>
                    </ul>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  multiple
                  accept="*/*"
                />
                <button
                  type="button"
                  ref={emojiBtnRef}
                  onClick={() => setShowEmojiPicker((v) => !v)}
                  className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Emoji"
                  disabled={isLoading || isProcessingPendingMessage}
                >
                  <img src={emoji} alt="emoji" className="w-5 h-5" />
                </button>
                {/* Emoji picker placeholder */}
                {showEmojiPicker && (
                  <div
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
                      onEmojiClick={handleEmojiClick}
                      height={350}
                      width={300}
                    />
                  </div>
                )}
              </div>
              <textarea
                ref={textareaRef}
                placeholder="Send a message..."
                rows={1}
                className="w-full py-3 text-sm sm:text-base outline-none resize-none border-none rounded-xl pr-12 h-28"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading || isProcessingPendingMessage}
              />
              {/* Right-side: Mic and Send */}
              <div className="flex items-center gap-2 absolute right-4 top-1/2 -translate-y-1/2">
                <button
                  type="button"
                  onClick={handleMicClick}
                  className="p-1 hover:bg-gray-100 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Record audio"
                  tabIndex={0}
                  disabled={isLoading || isProcessingPendingMessage}
                >
                  <Mic className="w-5 h-5 text-[#0b1c33]" />
                </button>
                <button
                  className="bg-[#0b1c33] hover:bg-[#14273f] text-white w-9 h-9 rounded-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="send"
                  type="submit"
                  disabled={
                    isLoading ||
                    (!input.trim() && selectedFiles.length === 0) ||
                    isProcessingPendingMessage
                  }
                >
                  ↑
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Bouncing dots animation styles */}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-8px); }
        }
        .typing-indicator .dot {
          animation: bounce 1s infinite;
        }
      `}</style>
    </div>
  );
};

export default TroubleShoot;
