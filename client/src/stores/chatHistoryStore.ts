import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Thread {
  id: string;
  title: string;
  aircraftId?: string;
  issue?: string;
  conversationId?: string;
  timestamp: Date;
  isActive?: boolean;
  messages?: ChatMessage[];
}

export interface Chat {
  id: string;
  title: string;
  conversationId?: string;
  timestamp: Date;
  isActive?: boolean;
  messages?: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  sender?: string;
  isSuccess?: boolean;
  attachment?: any;
  isHtml?: boolean;
}

interface ChatHistoryStore {
  threads: Thread[];
  chats: Chat[];
  selectedThreadId: string | null;
  selectedChatId: string | null;
  searchQuery: string;

  // Actions
  setThreads: (threads: Thread[]) => void;
  setChats: (chats: Chat[]) => void;
  addThread: (thread: Thread) => void;
  addChat: (chat: Chat) => void;
  updateThread: (id: string, updates: Partial<Thread>) => void;
  updateChat: (id: string, updates: Partial<Chat>) => void;
  deleteThread: (id: string) => void;
  deleteChat: (id: string) => void;
  setSelectedThreadId: (id: string | null) => void;
  setSelectedChatId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;

  // Computed
  getFilteredThreads: () => Thread[];
  getFilteredChats: () => Chat[];
  getSelectedThread: () => Thread | null;
  getSelectedChat: () => Chat | null;
}

export const useChatHistoryStore = create<ChatHistoryStore>()(
  persist(
    (set, get) => ({
      threads: [],
      chats: [],
      selectedThreadId: '1',
      selectedChatId: '1',
      searchQuery: '',

      setThreads: (threads) => set({ threads }),
      setChats: (chats) => set({ chats }),

      addThread: (thread) =>
        set((state) => ({
          threads: [thread, ...state.threads],
        })),

      addChat: (chat) =>
        set((state) => ({
          chats: [chat, ...state.chats],
        })),

      updateThread: (id, updates) =>
        set((state) => ({
          threads: state.threads.map((thread) =>
            thread.id === id ? { ...thread, ...updates } : thread,
          ),
        })),

      updateChat: (id, updates) =>
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === id ? { ...chat, ...updates } : chat,
          ),
        })),

      deleteThread: (id) =>
        set((state) => ({
          threads: state.threads.filter((thread) => thread.id !== id),
          selectedThreadId:
            state.selectedThreadId === id ? null : state.selectedThreadId,
        })),

      deleteChat: (id) =>
        set((state) => ({
          chats: state.chats.filter((chat) => chat.id !== id),
          selectedChatId:
            state.selectedChatId === id ? null : state.selectedChatId,
        })),

      setSelectedThreadId: (id) => set({ selectedThreadId: id }),
      setSelectedChatId: (id) => set({ selectedChatId: id }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      clearSearch: () => set({ searchQuery: '' }),

      getFilteredThreads: () => {
        const { threads, searchQuery } = get();
        if (!searchQuery) return threads;

        return threads.filter(
          (thread) =>
            thread.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            thread.aircraftId
              ?.toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            thread.issue?.toLowerCase().includes(searchQuery.toLowerCase()),
        );
      },

      getFilteredChats: () => {
        const { chats, searchQuery } = get();
        if (!searchQuery) return chats;

        return chats.filter((chat) =>
          chat.title.toLowerCase().includes(searchQuery.toLowerCase()),
        );
      },

      getSelectedThread: () => {
        const { threads, selectedThreadId } = get();
        return threads.find((thread) => thread.id === selectedThreadId) || null;
      },

      getSelectedChat: () => {
        const { chats, selectedChatId } = get();
        return chats.find((chat) => chat.id === selectedChatId) || null;
      },
    }),
    {
      name: 'chat-history-storage',
      partialize: (state) => ({
        threads: state.threads,
        chats: state.chats,
        selectedThreadId: state.selectedThreadId,
        selectedChatId: state.selectedChatId,
      }),
    },
  ),
);
