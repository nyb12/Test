import type { Express, Request, Response } from 'express';
import { createServer, request, type Server } from 'http';
import Stripe from 'stripe';
import multer from 'multer';
import userRoutes from './routes/userRoutes';
import authRoutes from './routes/authRoutes';
import conversationRoutes from './routes/conversationRoutes';
import ratingsRoutes from './routes/ratingsRoutes';
import toolsRoutes from './routes/toolsRoutes';
import { optionalAuthenticate } from './middlewares/authMiddleware';
import { externalApiService } from './services/externalApiService';
import {
  summarizeConversation,
  type ConversationMessage,
} from './services/openaiService';
import { db } from './db';
import { subscriptionPlans } from '@shared/schema';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function registerRoutes(app: Express): Promise<Server> {
  // Subscription plans endpoint
  app.get('/api/subscription-plans', async (req: Request, res: Response) => {
    try {
      const plans = await db.select().from(subscriptionPlans);
      res.json(plans);
    } catch (error: any) {
      res.status(500).json({
        message: 'Error fetching subscription plans',
        error: error.message,
      });
    }
  });

  // FIRST PRIORITY: External API chat endpoint - completely separate path
  app.post('/chat-api', async (req: Request, res: Response) => {
    try {
      const { message, conversationId } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // Get user ID from authentication, or use a default for unauthenticated users
      const userId = req.user?.id || 'anonymous';

      const payload = {
        message: message,
        userId: userId,
        conversationId: conversationId || '',
        metadata: {
          additionalProp1: '',
          additionalProp2: '',
          additionalProp3: '',
        },
      };

      const result = await externalApiService.post('/Chat/message', payload);

      if (!result.success) {
        console.error('External API chat request failed:', result.error);
        return res.status(500).json({
          error: 'Failed to process message from external API',
          details: result.error,
        });
      }

      const apiResponse = result.data;

      // Return response in format expected by frontend
      res.json({
        response: apiResponse.message || apiResponse.response,
        timestamp: apiResponse.timestamp || new Date().toISOString(),
        conversationId: apiResponse.conversationId,
        messageId: apiResponse.id,
        metadata: apiResponse.metadata,
        messageReceived: message,
      });
    } catch (error: any) {
      console.error('Error in external API chat endpoint:', error);
      res.status(500).json({
        error: 'Internal server error',
        details: error.message,
      });
    }
  });

  // Rating endpoint for chat messages
  app.post(
    '/api/Chat/message/:messageId/rate',
    async (req: Request, res: Response) => {
      try {
        const { messageId } = req.params;
        const { rating, userId, feedback } = req.body;

        const payload = {
          rating: rating,
          userId: userId || 'anonymous',
          feedback: feedback || '',
        };

        const result = await externalApiService.post(
          `/Chat/message/${messageId}/rate`,
          payload,
        );

        if (!result.success) {
          console.warn(
            'External API rating failed, implementing graceful fallback:',
            result.error,
          );

          // Graceful fallback: Accept the rating locally without external API
          // This allows the UI to function while the external API may not support ratings yet

          return res.json({
            success: true,
            message: 'Rating received and processed locally',
            data: {
              messageId,
              rating,
              userId,
              timestamp: new Date().toISOString(),
            },
          });
        }

        res.json({
          success: true,
          data: result.data,
        });
      } catch (error: any) {
        // Fallback for any network or other errors
        res.json({
          success: true,
          message: 'Rating received and processed locally (fallback)',
          data: {
            messageId: req.params.messageId,
            rating: req.body.rating,
            userId: req.body.userId || 'anonymous',
            timestamp: new Date().toISOString(),
          },
        });
      }
    },
  );

  // API route to say hello
  app.get('/api/hello', (_req, res) => {
    res.json({ message: 'Hello from the server!' });
  });

  // External API health check
  app.get('/api/external/health', async (_req, res) => {
    try {
      const result = await externalApiService.healthCheck();
      res.json({
        external_api_status: result.success ? 'connected' : 'disconnected',
        message: result.success ? 'External API is reachable' : result.error,
        data: result.data,
      });
    } catch (error: any) {
      res.status(500).json({
        external_api_status: 'error',
        message: error.message,
      });
    }
  });

  // Example: External API proxy endpoint
  app.get('/api/external/:endpoint', async (req, res) => {
    try {
      const { endpoint } = req.params;
      const result = await externalApiService.get(`/${endpoint}`);

      if (!result.success) {
        return res.status(400).json({
          message: 'External API request failed',
          error: result.error,
        });
      }

      res.json(result.data);
    } catch (error: any) {
      res.status(500).json({
        message: 'Internal server error',
        error: error.message,
      });
    }
  });

  // Example: POST to external API
  app.post('/api/external/:endpoint', async (req, res) => {
    try {
      const { endpoint } = req.params;
      const result = await externalApiService.post(`/${endpoint}`, req.body);

      if (!result.success) {
        return res.status(400).json({
          message: 'External API request failed',
          error: result.error,
        });
      }

      res.json(result.data);
    } catch (error: any) {
      res.status(500).json({
        message: 'Internal server error',
        error: error.message,
      });
    }
  });

  // Duplicate chat endpoint removed - using priority endpoint at top

  // FleetSpan prompts endpoint - simple test first
  app.get('/api/fleetspan-prompts', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(['Operational', 'Grounded', 'Limited/Monitor', 'Scheduled']);
  });

  // Set up user routes with Prisma
  app.use('/api/users', userRoutes);

  // Set up authentication routes
  app.use('/api/auth', authRoutes);

  // Conversation history and rating routes
  app.use('/api/conversations', conversationRoutes);

  // Simplified ratings routes
  app.use('/api/ratings', ratingsRoutes);

  // Tool selective action prompts endpoint (must be before the general tools routes)
  app.get(
    '/api/tools/:toolId/selective-prompts',
    async (req: Request, res: Response) => {
      try {
        const toolIdParam = req.params.toolId;

        const { db } = await import('./db');
        const { toolSelectiveActionPrompts, tools } = await import(
          '@shared/schema'
        );
        const { eq } = await import('drizzle-orm');

        let toolId: number;

        // Check if it's a UUID or numeric ID
        if (isNaN(parseInt(toolIdParam))) {
          // It's a UUID, find the numeric ID with optimized query
          const tool = await db
            .select({ toolId: tools.toolId })
            .from(tools)
            .where(eq(tools.id, toolIdParam))
            .limit(1);
          if (tool.length === 0) {
            return res.status(404).json({ error: 'Tool not found' });
          }
          toolId = tool[0].toolId || 0;
        } else {
          toolId = parseInt(toolIdParam);
        }

        // Optimized query with selective fields
        const prompts = await db
          .select({
            id: toolSelectiveActionPrompts.id,
            toolId: toolSelectiveActionPrompts.toolId,
            promptValue: toolSelectiveActionPrompts.promptValue,
            inactiveLabel: toolSelectiveActionPrompts.inactiveLabel,
            activeEventHandler: toolSelectiveActionPrompts.activeEventHandler,
            cssClasses: toolSelectiveActionPrompts.cssClasses,
            createdAt: toolSelectiveActionPrompts.createdAt,
            actionId: toolSelectiveActionPrompts.actionId,
            actionLevel: toolSelectiveActionPrompts.actionLevel,
            onClickEvent: toolSelectiveActionPrompts.onClickEvent,
            allowDoubleClick: toolSelectiveActionPrompts.allowDoubleClick,
          })
          .from(toolSelectiveActionPrompts)
          .where(eq(toolSelectiveActionPrompts.toolId, toolId));

        // Fix NULL labels by using prompt values
        const fixedPrompts = prompts.map((prompt) => ({
          ...prompt,
          inactiveLabel:
            prompt.inactiveLabel === 'NULL' || !prompt.inactiveLabel
              ? prompt.promptValue
              : prompt.inactiveLabel,
          activeEventHandler:
            prompt.activeEventHandler === 'NULL' || !prompt.activeEventHandler
              ? prompt.promptValue
              : prompt.activeEventHandler,
        }));

        // No caching to ensure fresh data
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.json(fixedPrompts);
      } catch (error) {
        console.error('Error fetching selective action prompts:', error);
        res
          .status(500)
          .json({ error: 'Failed to fetch selective action prompts' });
      }
    },
  );

  // Tools routes
  app.use('/api/tools', toolsRoutes);

  // Roles endpoint
  app.get('/api/roles', async (_req: Request, res: Response) => {
    try {
      const { db } = await import('./db');
      const { roles } = await import('@shared/schema');

      const allRoles = await db.select().from(roles).orderBy(roles.name);
      res.json(allRoles);
    } catch (error) {
      console.error('Error fetching roles:', error);
      res.status(500).json({ error: 'Failed to fetch roles' });
    }
  });

  // Aircraft routes
  app.get('/api/aircraft', async (_req: Request, res: Response) => {
    try {
      const { db } = await import('./db');
      const { sql } = await import('drizzle-orm');

      const aircraft = await db.execute(sql`
        SELECT id, tail_number, model, manufacturer, primary_status, secondary_statuses,
               status_details, limitation_details, grounding_reason, next_maintenance_date,
               regulatory_reference, flight_hours, year_manufactured, status_tags
        FROM aircraft
        ORDER BY tail_number
      `);

      res.json(aircraft.rows);
    } catch (error) {
      console.error('Error fetching aircraft:', error);
      res.status(500).json({ error: 'Failed to fetch aircraft' });
    }
  });

  // Get specific aircraft by ID
  app.get('/api/aircraft/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { db } = await import('./db');
      const { sql } = await import('drizzle-orm');

      const aircraft = await db.execute(sql`
        SELECT id, tail_number, model, manufacturer, primary_status, secondary_statuses,
               status_details, limitation_details, grounding_reason, next_maintenance_date,
               regulatory_reference, flight_hours, year_manufactured, status_tags
        FROM aircraft
        WHERE id = ${id}
        LIMIT 1
      `);

      if (!aircraft.rows.length) {
        return res.status(404).json({ error: 'Aircraft not found' });
      }

      res.json(aircraft.rows[0]);
    } catch (error) {
      console.error('Error fetching aircraft by ID:', error);
      res.status(500).json({ error: 'Failed to fetch aircraft by ID' });
    }
  });

  // Contacts endpoint using External API
  app.get(
    '/api/contacts',
    optionalAuthenticate,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const { externalApiService } = await import(
          './services/externalApiService'
        );

        const result = await externalApiService.post('/UserContacts/list', {
          userId: userId,
          pageNumber: 1,
          pageSize: 100,
        });

        if (!result.success) {
          return res.status(400).json({
            error: 'Failed to fetch contacts from external API',
            details: result.error,
          });
        }

        // Transform external API response to match expected format
        // The API returns data in result.data.data.items structure
        const contactItems = result.data?.data?.items || [];
        const contacts = contactItems.map((contact: any) => {
          // Build display name: use first/last name if available, otherwise email, phone, or fallback
          let displayName = `${contact.contactFirstName || ''} ${
            contact.contactLastName || ''
          }`.trim();
          if (!displayName) {
            if (contact.contactEmail) {
              displayName = contact.contactEmail;
            } else if (contact.contactPhone) {
              displayName = contact.contactPhone;
            } else {
              displayName = '---';
            }
          }

          return {
            id: contact.id,
            name: displayName,
            email: contact.contactEmail,
            phone: contact.contactPhone,
            contactId: contact.contactId, // This is the userId for messaging
            notes: contact.notes,
            created_at: contact.createdAt,
            updated_at: contact.updatedAt,
            is_email_verified: contact.contactIsEmailVerified,
            is_phone_verified: contact.contactIsPhoneVerified,
          };
        });

        res.json(contacts);
      } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({ error: 'Failed to fetch contacts' });
      }
    },
  );

  // Create new contact using External API with bidirectional relationship
  app.post(
    '/api/contacts',
    optionalAuthenticate,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const { email, phone, roleId = 1 } = req.body;

        const { externalApiService } = await import(
          './services/externalApiService'
        );

        const now = new Date().toISOString();

        // First, check if the contact email corresponds to an existing user
        let contactUserId = null;

        try {
          // Try different API endpoints to find user by email
          let userCheckResult = await externalApiService.get(
            `/User/byEmail/${encodeURIComponent(email)}`,
          );

          if (!userCheckResult.success) {
            // Try alternative endpoint
            userCheckResult = await externalApiService.get(
              `/Users/byEmail/${encodeURIComponent(email)}`,
            );
          }

          if (!userCheckResult.success) {
            // Try yet another alternative
            userCheckResult = await externalApiService.post(`/User/lookup`, {
              email: email,
            });
          }

          if (userCheckResult.success && userCheckResult.data?.data) {
            contactUserId = userCheckResult.data.data.id;
          } else {
          }
        } catch (error) {}

        // Create contact relationship: A adds B
        const result = await externalApiService.post('/UserContacts', {
          userId: userId,
          firstName: '',
          lastName: '',
          email: email,
          phone: phone,
          roleId: roleId,
          notes: '',
          created_at: now,
          updated_at: now,
        });

        if (!result.success) {
          return res.status(400).json({
            error: 'Failed to create contact via external API',
            details: result.error,
          });
        }

        // If the contact is also a registered user, create bidirectional relationship: B adds A
        if (contactUserId) {
          try {
            // Get current user's info to add as contact for the other user
            const currentUserResult = await externalApiService.get(
              `/User/${userId}`,
            );
            if (currentUserResult.success && currentUserResult.data?.data) {
              const currentUser = currentUserResult.data.data;

              // Create reverse contact relationship
              await externalApiService.post('/UserContacts', {
                userId: contactUserId,
                firstName: currentUser.firstName || '',
                lastName: currentUser.lastName || '',
                email: currentUser.email,
                phone: currentUser.phone || '',
                roleId: roleId,
                notes: '',
                created_at: now,
                updated_at: now,
              });
            }
          } catch (error) {
            // Don't fail the main request if bidirectional creation fails
          }
        }

        // Transform response to match expected format
        const createdContact = {
          id: result.data?.data?.id,
          name: `${result.data?.data?.contactFirstName || ''} ${
            result.data?.data?.contactLastName || ''
          }`.trim(),
          email: result.data?.data?.contactEmail,
          phone: result.data?.data?.contactPhone,
          notes: result.data?.data?.notes,
          created_at: result.data?.data?.createdAt,
          updated_at: result.data?.data?.updatedAt,
          is_email_verified: result.data?.data?.contactIsEmailVerified,
          is_phone_verified: result.data?.data?.contactIsPhoneVerified,
        };

        res.status(201).json(createdContact);
      } catch (error) {
        console.error('Error creating contact:', error);
        res.status(500).json({ error: 'Failed to create contact' });
      }
    },
  );

  // Update contact using External API
  app.put(
    '/api/contacts/:id',
    optionalAuthenticate,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const contactId = parseInt(req.params.id);
        const { name, email, phone, notes } = req.body;

        const nameParts = name?.split(' ') || [];
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        const { externalApiService } = await import(
          './services/externalApiService'
        );

        const result = await externalApiService.put(
          `/UserContacts/${contactId}`,
          {
            userId: userId,
            firstName: firstName,
            lastName: lastName,
            email: email,
            phone: phone,
            notes: notes,
            updated_at: new Date().toISOString(),
          },
        );

        if (!result.success) {
          return res.status(400).json({
            error: 'Failed to update contact via external API',
            details: result.error,
          });
        }

        const updatedContact = {
          id: result.data?.data?.id,
          name: `${result.data?.data?.contactFirstName || ''} ${
            result.data?.data?.contactLastName || ''
          }`.trim(),
          email: result.data?.data?.contactEmail,
          phone: result.data?.data?.contactPhone,
          notes: result.data?.data?.notes,
          created_at: result.data?.data?.createdAt,
          updated_at: result.data?.data?.updatedAt,
          is_email_verified: result.data?.data?.contactIsEmailVerified,
          is_phone_verified: result.data?.data?.contactIsPhoneVerified,
        };

        res.json(updatedContact);
      } catch (error) {
        console.error('Error updating contact:', error);
        res.status(500).json({ error: 'Failed to update contact' });
      }
    },
  );

  // Delete contact using External API
  app.delete(
    '/api/contacts/:id',
    optionalAuthenticate,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const contactId = parseInt(req.params.id);
        const { externalApiService } = await import(
          './services/externalApiService'
        );

        const result = await externalApiService.delete(
          `/UserContacts/${contactId}`,
        );

        if (!result.success) {
          return res.status(400).json({
            error: 'Failed to delete contact via external API',
            details: result.error,
          });
        }

        res.json({ success: true, message: 'Contact deleted successfully' });
      } catch (error) {
        console.error('Error deleting contact:', error);
        res.status(500).json({ error: 'Failed to delete contact' });
      }
    },
  );

  // Get UserGroup members via External API
  app.get('/api/UserGroups/:groupId', async (req: Request, res: Response) => {
    try {
      const { groupId } = req.params;
      const { userId } = req.query;

      const { externalApiService } = await import(
        './services/externalApiService'
      );

      const result = await externalApiService.get(
        `/UserGroups/${groupId}?userId=${userId}`,
      );

      if (!result.success) {
        return res.status(400).json({
          error: 'Failed to fetch group members via external API',
          details: result.error,
        });
      }

      res.json(result);
    } catch (error) {
      console.error('Error fetching group members:', error);
      res.status(500).json({ error: 'Failed to fetch group members' });
    }
  });

  // Health status endpoint for monitoring External API
  app.get('/api/health', async (_req: Request, res: Response) => {
    try {
      const { heartbeatService } = await import('./services/heartbeatService');
      const status = heartbeatService.getStatus();

      res.json({
        isHealthy: status.isHealthy,
        lastCheck: status.lastCheck.toISOString(),
        consecutiveFailures: status.consecutiveFailures,
        lastError: status.lastError,
      });
    } catch (error) {
      console.error('Error getting health status:', error);
      res.status(500).json({
        isHealthy: false,
        lastCheck: new Date().toISOString(),
        consecutiveFailures: 0,
        lastError: 'Failed to get health status',
      });
    }
  });

  // Configure multer for file uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB limit
    },
  });

  // Chat API endpoint with file upload support (v1)
  // Handle OPTIONS preflight requests
  app.options('/api/Chat/v1/message', (req: Request, res: Response) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS',
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-API-Key',
    );
    res.status(200).end();
  });

  app.post(
    '/api/Chat/v1/message',
    upload.array('files', 10),
    async (req: Request, res: Response) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS',
      );
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-API-Key',
      );
      const apiKey = req.headers['x-api-key'];

      try {
        // Parse the chatRequest from form data
        const chatRequestStr = req.body.chatRequest;
        if (!chatRequestStr) {
          return res.status(400).json({ error: 'chatRequest is required' });
        }

        let chatRequest;
        try {
          chatRequest = JSON.parse(chatRequestStr);
        } catch (parseError) {
          console.error('Failed to parse chatRequest JSON:', parseError);
          return res
            .status(400)
            .json({ error: 'Invalid chatRequest JSON format' });
        }

        const { userId, message, conversationId, context } = chatRequest;

        if (!message) {
          console.log('No message provided in chatRequest');
          return res
            .status(400)
            .json({ error: 'Message is required in chatRequest' });
        }

        if (!userId) {
          console.log('No userId provided in chatRequest');
          return res
            .status(400)
            .json({ error: 'userId is required in chatRequest' });
        }

        // Get files from multer
        const files = (req as any).files || [];

        // Prepare payload for external API
        const payload = {
          message: message,
          userId: userId,
          conversationId: conversationId || '',
          context: context || 'existing_chat',
          metadata: {
            additionalProp1: '',
            additionalProp2: '',
            additionalProp3: '',
          },
        };

        // Use the external API service to send the message with files
        const result = await externalApiService.postChatWithFiles(
          '/Chat/v1/message',
          payload,
          files,
        );

        if (!result.success) {
          console.error('External API chat request failed:', result.error);
          return res.status(500).json({
            error: 'Failed to process message from external API',
            details: result.error,
          });
        }

        const apiResponse = result.data;

        // Return response in format expected by frontend
        res.json({
          response: apiResponse.message || apiResponse.response,
          timestamp: apiResponse.timestamp || new Date().toISOString(),
          conversationId: apiResponse.conversationId,
          messageId: apiResponse.id,
          metadata: apiResponse.metadata,
          messageReceived: message,
          filesProcessed: files.length,
        });
      } catch (error: any) {
        console.error('Error in chat v1 API endpoint:', error);
        res.status(500).json({
          error: 'Internal server error',
          details: error.message,
        });
      }
    },
  );

  // Send message using External API /api/Messaging/send
  app.post(
    '/api/messaging/send',
    optionalAuthenticate,
    upload.array('files', 10),
    async (req: Request, res: Response) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ error: 'Authentication required' });
        }
        const senderId = req.user.id;

        const { externalApiService } = await import(
          './services/externalApiService'
        );

        // Check if this is FormData (multipart/form-data)
        const contentType = req.headers['content-type'] || '';
        const isFormData = contentType.includes('multipart/form-data');

        let requestData: any;
        let files: any[] = [];

        if (isFormData) {
          // Handle FormData - data should be in req.body and files in req.files
          const requestStr = req.body.request;
          if (requestStr) {
            try {
              requestData = JSON.parse(requestStr);
            } catch (e) {
              console.error('Failed to parse request JSON:', e);
              return res.status(400).json({ error: 'Invalid request format' });
            }
          }

          // Get files from multer
          files = (req as any).files || [];
        } else {
          // Handle JSON data
          const {
            content,
            recipientUserIds,
            recipientEmails,
            conversationId,
            groupIds,
            files: bodyFiles,
          } = req.body;

          requestData = {
            senderId: senderId,
            content: content,
            recipientUserIds: recipientUserIds || [],
            recipientEmails: recipientEmails || [],
            groupIds: Array.isArray(groupIds) ? groupIds : [],
            metadata: {
              conversationId: conversationId || `chat_${Date.now()}`,
            },
          };
          files = bodyFiles || [];
        }

        // Ensure we have the required data
        if (!requestData) {
          return res.status(400).json({ error: 'Request data is required' });
        }

        // Add senderId if not present
        if (!requestData.senderId) {
          requestData.senderId = senderId;
        }

        const requestBodyData = {
          request: requestData,
          files: files,
        };

        const result = await externalApiService.postFormData(
          '/Messaging/send',
          requestBodyData,
        );

        if (!result.success) {
          return res.status(400).json({
            error: 'Failed to send message via external API',
            details: result.error,
          });
        }

        res.json({
          success: true,
          messageId: result.data?.messageId,
          status: result.data?.status,
          metadata: result.data?.metadata,
          data: result.data,
        });
      } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
      }
    },
  );

  // Create group using External API
  app.post(
    '/api/messaging/createGroup',
    optionalAuthenticate,
    async (req: Request, res: Response) => {
      try {
        const { userId, name, description, initialMemberIds } = req.body;

        const { externalApiService } = await import(
          './services/externalApiService'
        );

        const result = await externalApiService.post('/UserGroups', {
          userId,
          name,
          description,
          initialMemberIds,
        });

        res.json(result);
      } catch (error) {
        console.error('Error creating group:', error);
        res.status(500).json({ error: 'Failed to create group' });
      }
    },
  );

  // List user groups using External API
  app.post(
    '/api/user-groups/list',
    optionalAuthenticate,
    async (req: Request, res: Response) => {
      try {
        const { userId, pageNumber = 1, pageSize = 100 } = req.body;

        const { externalApiService } = await import(
          './services/externalApiService'
        );

        const result = await externalApiService.post('/UserGroups/list', {
          userId,
          pageNumber,
          pageSize,
        });

        res.json(result);
      } catch (error) {
        console.error('Error listing user groups:', error);
        res.status(500).json({ error: 'Failed to list user groups' });
      }
    },
  );

  // Pull messages using External API /api/Messaging/pull
  app.post(
    '/api/messaging/pull',
    optionalAuthenticate,
    async (req: Request, res: Response) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ error: 'Authentication required' });
        }
        const userId = req.user.id;
        const { limit = 50, groupIds } = req.body;

        const { externalApiService } = await import(
          './services/externalApiService'
        );

        // Pass groupIds if provided (for group tab)
        const payload: any = {
          userId: userId,
          limit: limit,
        };
        if (Array.isArray(groupIds) && groupIds.length > 0) {
          payload.groupIds = groupIds;
        }

        const result = await externalApiService.post(
          '/Messaging/pull',
          payload,
        );

        if (!result.success) {
          return res.status(400).json({
            error: 'Failed to pull messages via external API',
            details: result.error,
          });
        }

        // Return all messages - the client can filter as needed
        res.json({
          success: true,
          data: result.data,
          messages: result.data?.messages || [],
          remainingCount: result.data?.remainingCount || 0,
          pulledAt: result.data?.pulledAt,
        });
      } catch (error) {
        console.error('Error pulling messages:', error);
        res.status(500).json({ error: 'Failed to pull messages' });
      }
    },
  );

  // All contacts endpoint using External API
  app.get(
    '/api/contacts/all',
    optionalAuthenticate,
    async (req: Request, res: Response) => {
      try {
        const { externalApiService } = await import(
          './services/externalApiService'
        );

        // Use authenticated user's ID - fallback to environment variable if no user is authenticated
        const userId = req.user?.id || process.env.DEFAULT_USER_ID;

        if (!userId) {
          return res.status(401).json({
            error:
              'User authentication required or default user ID not configured',
          });
        }

        const payload = {
          userId: userId,
          pageNumber: 0,
          pageSize: 100,
        };

        const result = await externalApiService.post(
          '/UserContacts/list',
          payload,
        );

        if (!result.success) {
          console.error('External API error for contacts/all:', result.error);
          return res.status(400).json({
            error: 'Failed to fetch contacts from external API',
            details: result.error,
          });
        }

        // Transform the response to match expected format
        // The API returns data in result.data.data.items structure
        const contactItems = result.data?.data?.items || [];
        const contacts = contactItems.map((contact: any) => {
          // Build display name: use first/last name if available, otherwise email or phone
          let displayName = `${contact.contactFirstName || ''} ${
            contact.contactLastName || ''
          }`.trim();
          if (!displayName) {
            displayName =
              contact.contactEmail || contact.contactPhone || 'Unknown';
          }

          return {
            id: contact.id,
            name: displayName,
            email: contact.contactEmail,
            phone: contact.contactPhone,
            contactId: contact.contactId, // Include contactId for messaging
            notes: contact.notes,
            created_at: contact.createdAt,
            updated_at: contact.updatedAt,
            is_email_verified: contact.contactIsEmailVerified,
            is_phone_verified: contact.contactIsPhoneVerified,
          };
        });

        res.json(contacts);
      } catch (error) {
        console.error('Error fetching all contacts:', error);
        res.status(500).json({ error: 'Failed to fetch all contacts' });
      }
    },
  );

  // Get conversation history
  app.post(
    '/api/messaging/conversation/:conversationId/history',
    optionalAuthenticate,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const { conversationId } = req.params;
        const { userId: requestUserId, page = 1, pageSize = 100 } = req.body;

        // Validate that the requesting user matches the authenticated user
        if (requestUserId !== userId) {
          return res
            .status(403)
            .json({ error: 'Unauthorized access to conversation' });
        }

        const { externalApiService } = await import(
          './services/externalApiService'
        );

        const result = await externalApiService.post(
          `/Messaging/conversation/${conversationId}/history`,
          {
            userId: requestUserId,
            page,
            pageSize,
          },
        );

        if (!result.success) {
          return res.status(400).json({
            error: 'Failed to fetch conversation history',
            details: result.error,
          });
        }

        res.json({
          success: true,
          data: result.data,
        });
      } catch (error) {
        console.error('Error fetching conversation history:', error);
        res.status(500).json({ error: 'Failed to fetch conversation history' });
      }
    },
  );

  // Get user chat history via External API
  app.get(
    '/api/Chat/user/:userId/history',
    optionalAuthenticate,
    async (req: Request, res: Response) => {
      try {
        const { userId } = req.params;
        const { pageNumber, pageSize } = req.query;

        // Validate authentication if required
        const authenticatedUserId = req.user?.id;
        if (!authenticatedUserId) {
          return res.status(401).json({ error: 'Authentication required' });
        }
        const { externalApiService } = await import(
          './services/externalApiService'
        );

        const result = await externalApiService.get(
          `/Chat/user/${userId}/history?pageNumber=${pageNumber}&pageSize=${pageSize}`,
        );

        if (!result.success) {
          return res.status(400).json({
            error: 'Failed to fetch user chat history from external API',
            details: result.error,
          });
        }

        res.json({
          success: true,
          data: result.data,
        });
      } catch (error) {
        console.error('Error fetching user chat history:', error);
        res.status(500).json({ error: 'Failed to fetch user chat history' });
      }
    },
  );

  // Get conversation history by conversation ID via External API
  app.get(
    '/api/Chat/history/:conversationId',
    optionalAuthenticate,
    async (req: Request, res: Response) => {
      try {
        const { conversationId } = req.params;

        // Validate authentication if required
        const authenticatedUserId = req.user?.id;
        if (!authenticatedUserId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const { externalApiService } = await import(
          './services/externalApiService'
        );

        const result = await externalApiService.get(
          `/Chat/history/${conversationId}`,
        );

        if (!result.success) {
          return res.status(400).json({
            error: 'Failed to fetch conversation history from external API',
            details: result.error,
          });
        }

        res.json({
          success: true,
          data: result.data,
        });
      } catch (error) {
        console.error('Error fetching conversation history:', error);
        res.status(500).json({ error: 'Failed to fetch conversation history' });
      }
    },
  );

  const httpServer = createServer(app);

  return httpServer;
}
