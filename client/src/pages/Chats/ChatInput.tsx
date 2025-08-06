// ChatInput.tsx
import { ArrowUp } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { useMemo, useState } from 'react';
import { clip, emoji, mic } from '../../components/svg';
import { File, Image, Video, Music, FileText, Archive } from 'lucide-react';

interface DashboardState {
  showEmojiPicker: boolean;
  setShowEmojiPicker: (value: boolean) => void;
  handleEmojiClick: (emojiObject: any) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  pickerRef: React.RefObject<HTMLDivElement>;
  emojiBtnRef: React.RefObject<HTMLButtonElement>;
  handleUploadClick: () => void;
}

interface ChatInputProps {
  dashboardState: Omit<DashboardState, 'message' | 'setMessage'>;
  message: string;
  setMessage: (val: string) => void;
  sendMessage: (
    conversationId: string,
    recipientUserIds: string[],
    recipientEmails: string[],
    groupIds?: string[],
    files?: File[],
  ) => void;
  contacts: any[];
  groups: any[];
  selectedChatIndex: number;
  activeTab: 'individual' | 'groups';
  currentUserId: string;
  isUploading?: boolean;
}

export default function ChatInput({
  dashboardState,
  sendMessage,
  contacts,
  groups,
  selectedChatIndex,
  activeTab,
  message,
  setMessage,
  currentUserId,
  isUploading = false,
}: ChatInputProps) {
  const {
    showEmojiPicker,
    setShowEmojiPicker,
    handleEmojiClick,
    fileInputRef,
    pickerRef,
    emojiBtnRef,
  } = dashboardState;

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    // Validate file sizes (max 10MB per file)
    const maxSize = 10 * 1024 * 1024; // 10MB
    const validFiles = files.filter((file) => {
      if (file.size > maxSize) {
        alert(`File ${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      return true;
    });

    setSelectedFiles(validFiles);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Determine selected contact/group and recipient info
  const selectedContact =
    activeTab === 'individual' &&
    contacts &&
    contacts.length > 0 &&
    typeof selectedChatIndex === 'number'
      ? contacts[selectedChatIndex] || null
      : null;
  const selectedGroup =
    activeTab === 'groups' &&
    groups &&
    groups.length > 0 &&
    typeof selectedChatIndex === 'number'
      ? groups[selectedChatIndex] || null
      : null;

  // Generate conversation ID similar to ChatWindow
  const generateConversationId = (contact: any, group: any): string => {
    if (group) {
      return `group:${group.id}`;
    } else if (contact) {
      if (contact.messageType === 'Group' && contact.groupId) {
        return `group:${contact.groupId}`;
      } else {
        // For direct messages, create conversation ID with user IDs in consistent order
        const otherUserId = contact.contactId || contact?.id?.toString();
        // Use the current user ID passed as prop
        const userIds = [currentUserId, otherUserId].sort();
        return `dm:${userIds.join('_')}`;
      }
    }
    return '';
  };

  const conversationId = useMemo(() => {
    return generateConversationId(selectedContact, selectedGroup);
  }, [selectedContact, selectedGroup, currentUserId]);
  let recipientUserIds: string[] = [];
  let recipientEmails: string[] = [];
  let groupIds: string[] = [];
  if (activeTab === 'individual' && selectedContact) {
    if (selectedContact.contactId)
      recipientUserIds = [selectedContact.contactId];
    if (selectedContact.email) recipientEmails = [selectedContact.email];
  } else if (activeTab === 'groups' && selectedGroup) {
    if (selectedGroup.id) {
      // Ensure groupId is a string
      const groupId =
        typeof selectedGroup.id === 'string'
          ? selectedGroup.id
          : selectedGroup.id.toString();
      groupIds = [groupId];
    }
  }

  const handleSend = () => {
    if (
      (!message || typeof message !== 'string' || !message.trim()) &&
      selectedFiles.length === 0
    )
      return;
    if (activeTab === 'groups' && groupIds.length > 0) {
      sendMessage(
        conversationId,
        recipientUserIds,
        recipientEmails,
        groupIds,
        selectedFiles,
      );
    } else {
      sendMessage(
        conversationId,
        recipientUserIds,
        recipientEmails,
        undefined,
        selectedFiles,
      );
    }
    setSelectedFiles([]);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t bg-white p-2 sm:p-4 flex flex-col gap-2 rounded-b-2xl rounded-br-2xl lg:rounded-l-none absolute bottom-0 left-0 w-full z-10">
      {/* File display area */}
      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-md">
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

      <div className="flex items-center gap-2 sm:gap-3">
        <img
          src={clip}
          alt="clip"
          className={`w-5 h-5 sm:w-6 sm:h-6 ${
            isUploading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
          }`}
          onClick={() => !isUploading && fileInputRef.current?.click()}
        />

        <button
          className="text-xl sm:text-2xl text-gray-500 hover:bg-gray-100 rounded-full p-1 sm:p-2 relative"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          ref={emojiBtnRef}
        >
          <img src={emoji} alt="emoji" className="w-5 h-5 sm:w-6 sm:h-6" />
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
                onEmojiClick={(emojiData) => {
                  handleEmojiClick(emojiData);
                }}
                height={300}
                width={280}
                theme={'light' as any}
                searchPlaceholder="Search emoji..."
                previewConfig={{
                  showPreview: false,
                }}
              />
            </div>
          )}
        </button>

        <input
          type="text"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
          }}
          onFocus={() =>
            console.log('ChatInput input focused, current message:', message)
          }
          onKeyDown={handleInputKeyDown}
          placeholder="Ask anything..."
          disabled={isUploading}
          className={`flex-1 px-2 py-1 sm:px-3 sm:py-2 border border-gray-300 rounded-md text-sm sm:text-base ${
            isUploading ? 'bg-gray-100 cursor-not-allowed' : ''
          }`}
        />

        <button className="text-gray-600">
          <img src={mic} alt="mic" className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        <button
          className={`px-2 py-1 sm:px-3 sm:py-2 rounded-md flex items-center ${
            isUploading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-[#17224B] hover:bg-[#0f1a3a]'
          } text-white`}
          title="Send"
          onClick={handleSend}
          disabled={isUploading}
        >
          {isUploading ? (
            <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
        </button>
      </div>
    </div>
  );
}
