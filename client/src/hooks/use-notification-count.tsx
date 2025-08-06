import { createContext, ReactNode, useContext } from "react";
import { useQuery } from "@tanstack/react-query";

interface NotificationCountContextType {
  unreadCount: number;
  isLoading: boolean;
}

const NotificationCountContext = createContext<NotificationCountContextType | null>(null);

export function NotificationCountProvider({ children }: { children: ReactNode }) {
  // Poll for notifications every 5 seconds for better responsiveness
  const { data: messageData, isLoading } = useQuery({
    queryKey: ['/api/messaging/pull'],
    queryFn: async () => {
      const response = await fetch('/api/messaging/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ limit: 50 })
      });
      if (!response.ok) throw new Error('Failed to fetch notifications');
      return response.json();
    },
    refetchInterval: 5000, // Poll every 5 seconds for better responsiveness
    staleTime: 2000, // Consider data stale after 2 seconds
    enabled: true
  });

  const unreadCount = messageData?.data?.messages?.filter((n: any) => !n.isRead).length || 0;

  return (
    <NotificationCountContext.Provider value={{ unreadCount, isLoading }}>
      {children}
    </NotificationCountContext.Provider>
  );
}

export function useNotificationCount() {
  const context = useContext(NotificationCountContext);
  if (!context) {
    throw new Error("useNotificationCount must be used within a NotificationCountProvider");
  }
  return context;
}