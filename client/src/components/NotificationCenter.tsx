import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MessageCircle,
  AlertTriangle,
  Info,
  X,
  Bell,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationMessage {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  sentAt: string;
  isRead: boolean;
  messageType: 'DirectUser' | 'User' | 'Group' | 'System' | 'Alert';
  groupId?: string;
  groupName?: string;
  metadata?: any;
}

interface NotificationCenterProps {
  onChatMessage?: (message: NotificationMessage) => void;
  onChatOpen?: (contact: any) => void;
  showInMainWindow?: boolean;
}

export default function NotificationCenter({
  onChatMessage,
  onChatOpen,
  showInMainWindow = false,
}: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
  const [groupNameCache, setGroupNameCache] = useState<Map<string, string>>(
    new Map(),
  );

  // Poll for notifications every 10 seconds
  const { data: messageData } = useQuery({
    queryKey: ['/api/messaging/pull'],
    queryFn: async () => {
      const response = await fetch('/api/messaging/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 50 }),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch notifications');
      return response.json();
    },
    refetchInterval: 30000, // Poll every 30 seconds
    enabled: true,
  });

  // Update notifications when new data arrives and enhance with group names
  useEffect(() => {
    if (messageData?.data?.messages) {
      const enhanceWithGroupNames = async () => {
        const uniqueGroupIds = new Set<string>();
        const groupIdsToFetch: string[] = [];

        // Collect unique group IDs that need names
        messageData.data.messages.forEach((message: NotificationMessage) => {
          if (
            message.messageType === 'Group' &&
            message.groupId &&
            !uniqueGroupIds.has(message.groupId)
          ) {
            uniqueGroupIds.add(message.groupId);
            if (!groupNameCache.has(message.groupId)) {
              groupIdsToFetch.push(message.groupId);
            }
          }
        });

        // Fetch group names only for uncached groups
        const newGroupNames = new Map(groupNameCache);
        if (groupIdsToFetch.length > 0) {
          await Promise.all(
            groupIdsToFetch.map(async (groupId) => {
              try {
                const response = await fetch(
                  `/api/UserGroups/${groupId}?userId=b587dc6e-66b1-479e-8014-d69e56ac0173`,
                );
                if (response.ok) {
                  const groupData = await response.json();
                  if (groupData.success && groupData.data?.data?.name) {
                    newGroupNames.set(groupId, groupData.data.data.name);
                  }
                }
              } catch (error) {
                console.error('Error fetching group name:', error);
              }
            }),
          );
          setGroupNameCache(newGroupNames);
        }

        // Apply cached group names to messages
        const enhancedMessages = messageData.data.messages.map(
          (message: NotificationMessage) => {
            if (
              message.messageType === 'Group' &&
              message.groupId &&
              newGroupNames.has(message.groupId)
            ) {
              return {
                ...message,
                groupName: newGroupNames.get(message.groupId),
              };
            }
            return message;
          },
        );

        setNotifications(enhancedMessages);
      };

      enhanceWithGroupNames();
    }
  }, [messageData, groupNameCache]);

  // Count unread notifications
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Group notifications by type and sort by most recent first
  const groupedNotifications = {
    chat: notifications
      .filter(
        (n) =>
          n.messageType === 'DirectUser' ||
          n.messageType === 'User' ||
          n.messageType === 'Group',
      )
      .sort(
        (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
      ),
    system: notifications
      .filter((n) => n.messageType === 'System')
      .sort(
        (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
      ),
    alerts: notifications
      .filter((n) => n.messageType === 'Alert')
      .sort(
        (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
      ),
  };

  const handleChatNotificationClick = (message: NotificationMessage) => {
    // Create a contact object from the message for opening chat
    const contact = {
      id: message.messageType === 'Group' ? message.groupId : message.senderId,
      name:
        message.messageType === 'Group'
          ? message.groupName || 'Group Chat'
          : message.senderName,
      email: `${message.senderId}@temp.com`, // Temporary email for API compatibility
      messageType: message.messageType,
      groupId: message.groupId,
      groupName: message.groupName,
      contactId: message.senderId, // Add contactId for proper message routing
    };

    onChatOpen?.(contact);
    onChatMessage?.(message);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'Group':
        return <Users className="h-4 w-4 text-blue-600" />;
      case 'DirectUser':
      case 'User':
        return <MessageCircle className="h-4 w-4 text-green-600" />;
      case 'Alert':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // If not showing in main window, return null for now
  if (!showInMainWindow) {
    return null;
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-white dark:bg-gray-900 border rounded-lg shadow-sm">
      <div className="flex items-center justify-between  p-4 border-b">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Badge className="bg-red-500 text-white">{unreadCount}</Badge>
          )}
        </div>
      </div>

      <div className="max-h-72 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No notifications</p>
            <p className="text-sm mt-1">
              New messages and alerts will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Chat Messages */}
            {groupedNotifications.chat.length > 0 && (
              <div>
                <div className="px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/50">
                  Messages ({groupedNotifications.chat.length})
                </div>
                {groupedNotifications.chat.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex items-start gap-3 p-4 hover:bg-muted/50 cursor-pointer border-b border-border/50',
                      !message.isRead && 'bg-blue-50 dark:bg-blue-950/20',
                    )}
                    onClick={() => handleChatNotificationClick(message)}
                  >
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(message.messageType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {message.messageType === 'Group'
                            ? message.groupName || 'Group Chat'
                            : message.senderName}
                        </p>
                        {message.messageType === 'Group' &&
                          message.groupName && (
                            <Badge variant="secondary" className="text-xs">
                              {message.senderName}
                            </Badge>
                          )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {message.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTime(message.sentAt)}
                      </p>
                    </div>
                    {!message.isRead && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2" />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* System Notifications */}
            {groupedNotifications.system.length > 0 && (
              <div>
                <div className="px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/50">
                  System ({groupedNotifications.system.length})
                </div>
                {groupedNotifications.system.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex items-start gap-3 p-4 hover:bg-muted/50 border-b border-border/50',
                      !message.isRead && 'bg-blue-50 dark:bg-blue-950/20',
                    )}
                  >
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(message.messageType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground">
                        {message.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTime(message.sentAt)}
                      </p>
                    </div>
                    {!message.isRead && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2" />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Alert Notifications */}
            {groupedNotifications.alerts.length > 0 && (
              <div>
                <div className="px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/50">
                  Alerts ({groupedNotifications.alerts.length})
                </div>
                {groupedNotifications.alerts.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex items-start gap-3 p-4 hover:bg-muted/50 border-b border-border/50',
                      !message.isRead && 'bg-red-50 dark:bg-red-950/20',
                    )}
                  >
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(message.messageType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-red-700 dark:text-red-400">
                        {message.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTime(message.sentAt)}
                      </p>
                    </div>
                    {!message.isRead && (
                      <div className="w-2 h-2 bg-red-600 rounded-full flex-shrink-0 mt-2" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
