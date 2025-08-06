import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';

export function useChatbot(
  externalConversationId?: string,
  onNewConversationCreated?: (conversationId: string) => void,
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [internalConversationId, setInternalConversationId] = useState<
    string | null
  >(null);

  const conversationId = externalConversationId || internalConversationId;

  useEffect(() => {
    if (
      externalConversationId &&
      externalConversationId !== internalConversationId
    ) {
      setInternalConversationId(externalConversationId);
      setMessages([]);
    } else if (!externalConversationId && internalConversationId) {
      setInternalConversationId(null);
      setMessages([]);
    }
  }, [externalConversationId, internalConversationId, setMessages]);

  const { data: tools = [] } = useQuery<any[]>({
    queryKey: ['/api/tools'],
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: true,
  });

  const { data: conversationHistory } = useQuery({
    queryKey: ['conversationHistory', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      const response = await fetch(`/api/Chat/history/${conversationId}`, {
        headers: {
          'X-API-Key': 'test-api-key-67890',
        },
      });
      const data = await response.json();
      return data;
    },
    enabled: !!conversationId && !!externalConversationId, // Only run for existing conversations
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (
      conversationHistory?.data &&
      conversationId &&
      conversationHistory.data.length > 0 &&
      externalConversationId &&
      messages.length === 0 // Only load history if there are no current messages
    ) {
      const transformedMessages = conversationHistory.data.map((msg: any) => {
        // Handle files from metadata for user messages
        let files = null;
        let responseFiles = null;

        if (
          msg.role === 0 &&
          msg.metadata?.files &&
          Array.isArray(msg.metadata.files)
        ) {
          // Convert API file format to FileInfo format
          files = msg.metadata.files.map((file: any) => ({
            FileUrl: file.fileUrl,
            FileName: file.fileName,
            FileType: file.fileType,
          }));
        }

        // Handle response files for AI messages
        if (
          msg.role === 1 &&
          msg.metadata?.Files &&
          Array.isArray(msg.metadata.Files)
        ) {
          responseFiles = msg.metadata.Files;
        }

        return {
          text: msg.content,
          isUser: msg.role === 0,
          timestamp: new Date(msg.timestamp).getTime(),
          sender: msg.role === 0 ? 'User' : 'AI Assistant',
          isSuccess: false,
          attachment: null,
          isHtml: msg.role === 1,
          files,
          responseFiles,
        };
      });

      setMessages(transformedMessages);
    }
  }, [
    conversationHistory,
    conversationId,
    externalConversationId,
    setMessages,
    messages.length,
  ]);

  const sendMessage = useCallback(
    async (userMessage?: string, files?: File[]) => {
      const message = typeof userMessage === 'string' ? userMessage : input;
      if (!message.trim() && (!files || files.length === 0)) return;
      const now = Date.now();

      if (message.startsWith('/')) {
        const commandName = message.slice(1).split(' ')[0].toLowerCase();
        const matchingTool = (tools as any[]).find((tool: any) =>
          tool.name.toLowerCase().includes(commandName),
        );
        if (matchingTool) {
          setMessages((prev) => [
            ...prev,
            {
              text: `Activated tool: ${matchingTool.name}`,
              isUser: false,
              timestamp: now,
              // sender: 'N109MN',
            },
          ]);
          setInput('');
          return;
        }
      }

      // Add user message to chat
      setMessages((prev) => {
        const newMessages = [
          ...prev,
          {
            text: message,
            isUser: true,
            timestamp: now,
            sender: 'You',
            files: files || [],
          },
        ];
        return newMessages;
      });
      setInput('');
      setIsLoading(true);
      setTimeout(() => setIsTyping(true), 500);

      try {
        const formData = new FormData();

        // Generate a new conversation ID if none exists
        const currentConversationId =
          conversationId ||
          `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        console.log('Chat request conversation ID:', currentConversationId);

        const chatRequest = {
          userId: user?.id || 'anonymous',
          message: message,
          conversationId: currentConversationId,
          context: messages.length > 0 ? 'existing_chat' : 'new_chat',
        };

        formData.append('chatRequest', JSON.stringify(chatRequest));

        // Add files if provided
        if (files && files.length > 0) {
          files.forEach((file) => {
            formData.append('files', file);
          });
        }

        const response = await fetch('/api/Chat/v1/message', {
          method: 'POST',
          headers: {
            'X-API-Key': 'test-api-key-67890',
          },
          body: formData,
        });

        const data = await response.json();

        if (data.conversationId) {
          if (!conversationId || data.conversationId !== conversationId) {
            setInternalConversationId(data.conversationId);

            if (!conversationId && onNewConversationCreated) {
              onNewConversationCreated(data.conversationId);
            }
          }

          if (user?.id) {
            queryClient.invalidateQueries({
              queryKey: ['chatHistory', user.id],
            });

            if (externalConversationId) {
              queryClient.invalidateQueries({
                queryKey: ['conversationHistory', data.conversationId],
              });
            }
          }
        }

        const botResponse =
          data.response || "I received your message and I'm processing it.";
        const isSuccess =
          /generated|success|completed|done|created|has been/i.test(
            botResponse,
          ) && !data.attachment;

        let attachment = null;
        let responseFiles = null;

        if (data.attachment) {
          attachment = {
            name: data.attachment.name,
            size: data.attachment.size,
            url: data.attachment.url,
            type: data.attachment.type || 'application/octet-stream',
          };
        } else if (data.file) {
          attachment = {
            name: data.file.name,
            size: data.file.size,
            url: data.file.url,
            type: data.file.type || 'application/octet-stream',
          };
        }

        if (data.metadata?.Files && Array.isArray(data.metadata.Files)) {
          responseFiles = data.metadata.Files;
        }

        try {
          const finalConversationId =
            data.conversationId || currentConversationId;

          if (finalConversationId && finalConversationId !== '') {
            await fetch('/api/conversation-history/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                threadId: finalConversationId,
                messageText: message,
                messageType: 'user',
              }),
            });

            await fetch('/api/conversation-history/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                threadId: finalConversationId,
                messageText: botResponse,
                messageType: 'system',
              }),
            });
          }

          if (user?.id) {
            queryClient.invalidateQueries({
              queryKey: ['chatHistory', user.id],
            });

            if (externalConversationId) {
              queryClient.invalidateQueries({
                queryKey: ['conversationHistory', finalConversationId],
              });
            }
          }
        } catch {}

        setTimeout(() => {
          setMessages((prev) => {
            const newMessages = [
              ...prev,
              {
                text: botResponse,
                isUser: false,
                isHtml: data.isHtml || false,
                timestamp: Date.now(),
                // sender: 'N109MN',
                isSuccess,
                attachment,
                filesProcessed: data.filesProcessed || 0,
                responseFiles,
              },
            ];
            return newMessages;
          });
          setIsLoading(false);
          setIsTyping(false);
        }, 1000);
      } catch (error) {
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              text: "I'm having trouble processing your message right now. Please try again.",
              isUser: false,
              timestamp: Date.now(),
              // sender: 'N109MN',
            },
          ]);
          setIsLoading(false);
          setIsTyping(false);
        }, 1000);
      }
    },
    [input, conversationId, tools, messages.length, user?.id],
  );

  const clearConversationId = useCallback(() => {
    setInternalConversationId(null);
    setMessages([]);
  }, [setMessages]);

  return {
    input,
    setInput,
    isLoading,
    isTyping,
    messages,
    sendMessage,
    setMessages,
    clearConversationId,
  };
}
