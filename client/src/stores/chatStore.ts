import { create } from 'zustand';

interface ChatMessage {
  text: string;
  isUser: boolean;
  timestamp: number;
  sender?: string;
  isSuccess?: boolean;
  attachment?: any;
  isHtml?: boolean;
}

interface ChatStore {
  messages: ChatMessage[];
  pendingMessage: string | null;
  shouldNavigateToTroubleshoot: boolean;
  setPendingMessage: (message: string) => void;
  clearPendingMessage: () => void;
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  setShouldNavigateToTroubleshoot: (should: boolean) => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  pendingMessage: null,
  shouldNavigateToTroubleshoot: false,

  setPendingMessage: (message: string) => {
    set({ pendingMessage: message, shouldNavigateToTroubleshoot: true });
  },

  clearPendingMessage: () => {
    set({ pendingMessage: null, shouldNavigateToTroubleshoot: false });
  },

  addMessage: (message: ChatMessage) => {
    set((state) => ({ messages: [...state.messages, message] }));
  },

  setMessages: (messages: ChatMessage[]) => {
    set({ messages });
  },

  setShouldNavigateToTroubleshoot: (should: boolean) => {
    set({ shouldNavigateToTroubleshoot: should });
  },

  clearChat: () => {
    set({
      messages: [],
      pendingMessage: null,
      shouldNavigateToTroubleshoot: false,
    });
  },
}));
