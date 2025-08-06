// components/Dashboard/useDashboardState.ts
import { useRef, useState, useEffect } from 'react';

export const useDashboardState = () => {
  const [selectedCard, setSelectedCard] = useState('recentchat');
  const [selectedChatIndex, setSelectedChatIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [openMenu, setOpenMenu] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [message, setMessage] = useState('');
  const [isActivityDrawerOpen, setIsActivityDrawerOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);

  const handleEmojiClick = (emojiData: any) => {
    console.log('Emoji clicked in Dashboard:', emojiData);
    try {
      let emojiChar = '';

      if (emojiData && emojiData.emoji) {
        emojiChar = emojiData.emoji;
      } else if (emojiData && emojiData.character) {
        emojiChar = emojiData.character;
      } else if (typeof emojiData === 'string') {
        emojiChar = emojiData;
      } else if (emojiData && emojiData.unified) {
        emojiChar = String.fromCodePoint(
          ...emojiData.unified
            .split('-')
            .map((hex: string) => parseInt(hex, 16)),
        );
      }

      if (emojiChar) {
        setMessage((prev) => {
          const newMessage = prev + emojiChar;
          return newMessage;
        });
        setShowEmojiPicker(false);
      } else {
        console.warn('Invalid emoji data:', emojiData);
      }
    } catch (error) {
      console.error('Error handling emoji click:', error);
    }
  };

  const handleMenuOpen = () => {
    setOpenMenu((prev) => !prev);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      console.log('Files selected:', files);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return {
    selectedCard,
    setSelectedCard,
    selectedChatIndex,
    setSelectedChatIndex,
    searchTerm,
    setSearchTerm,
    openMenu,
    setOpenMenu,
    showEmojiPicker,
    setShowEmojiPicker,
    message,
    setMessage,
    isActivityDrawerOpen,
    setIsActivityDrawerOpen,
    fileInputRef,
    pickerRef,
    emojiBtnRef,
    handleEmojiClick,
    handleMenuOpen,
    handleUploadClick,
    handleFileChange,
    currentUserId,
    setCurrentUserId,
  };
};
