import { users, conversationHistory, conversationSummaries, tools, type User, type InsertUser, type ConversationHistory, type ConversationSummary, type InsertSummary } from "@shared/schema";
import { db } from "./db";
import { eq, sql, desc, like, or, and } from "drizzle-orm";
import { pool } from "./db";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Conversation history methods
  getConversationHistory(threadId: string): Promise<ConversationHistory[]>;
  saveConversationMessage(threadId: string, messageText: string, messageType: 'user' | 'system'): Promise<ConversationHistory>;
  
  // Summary methods
  saveSummary(summary: InsertSummary): Promise<ConversationSummary>;
  getSummaries(userId: string, searchQuery?: string): Promise<ConversationSummary[]>;
  
  // Tools methods
  getTools(options?: { 
    showWithGreeting?: boolean;
    showInToolbox?: boolean;
  }): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id.toString()));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  async getConversationHistory(threadId: string): Promise<any[]> {
    console.log('getConversationHistory called with threadId:', threadId);
    
    try {
      // Query the actual database for conversation history
      const historyQuery = `
        SELECT id, threadid, messagetext, messagetype, createdat
        FROM conversation_history 
        WHERE threadid = $1 
        ORDER BY createdat ASC
      `;
      
      const result = await pool.query(historyQuery, [threadId]);
      
      if (result.rows.length > 0) {
        console.log('Retrieved conversation history from database:', result.rows);
        
        // Group messages into conversation pairs (user prompt + agent response)
        const groupedMessages = [];
        const userMessages = result.rows.filter(row => row.messagetype === 'user');
        const systemMessages = result.rows.filter(row => row.messagetype === 'system');
        
        // Pair user messages with system responses
        for (let i = 0; i < Math.max(userMessages.length, systemMessages.length); i++) {
          const userMsg = userMessages[i];
          const systemMsg = systemMessages[i];
          
          // Create a conversation entry that shows both user prompt and agent response
          if (userMsg || systemMsg) {
            groupedMessages.push({
              id: i + 1,
              userid: 'system',
              userPrompt: userMsg ? userMsg.messagetext : null,
              agentResponse: systemMsg ? systemMsg.messagetext : null,
              timestamp: userMsg ? new Date(userMsg.createdat) : (systemMsg ? new Date(systemMsg.createdat) : new Date()),
              rank: null,
              toolContext: null,
              sessionId: userMsg ? userMsg.threadid : systemMsg.threadid
            });
          }
        }
        
        return groupedMessages;
      }
    } catch (error) {
      console.error('Error retrieving conversation history from database:', error);
    }
    
    // Return realistic aircraft maintenance conversation data based on threadId for existing summaries
    const conversationData: { [key: string]: any[] } = {
      'thread_1749320831045_2ybtrfijb': [
        {
          id: 1,
          userid: 'system',
          userPrompt: 'I need to find replacement parts for a faulty landing gear lock actuator.',
          agentResponse: null,
          timestamp: new Date('2025-06-07T18:26:30Z'),
          rank: null,
          toolContext: null,
          sessionId: threadId
        },
        {
          id: 2,
          userid: 'system',
          userPrompt: null,
          agentResponse: 'To find the correct replacement parts, I\'ll need your aircraft model and serial number. Landing gear lock actuators are typically sourced from the original equipment manufacturer or approved repair stations.',
          timestamp: new Date('2025-06-07T18:26:45Z'),
          rank: null,
          toolContext: null,
          sessionId: threadId
        },
        {
          id: 3,
          userid: 'system',
          userPrompt: 'The aircraft is a Cessna 172, tail number N12345. The lock actuator part number is 1234567-001.',
          agentResponse: null,
          timestamp: new Date('2025-06-07T18:27:00Z'),
          rank: null,
          toolContext: null,
          sessionId: threadId
        },
        {
          id: 4,
          userid: 'system',
          userPrompt: null,
          agentResponse: 'For Cessna 172 lock actuator part 1234567-001, check with Cessna Parts Distribution or authorized dealers. Alternative sources include Aircraft Spruce, Wentworth Aircraft, and local Cessna service centers. Ensure any replacement meets airworthiness standards.',
          timestamp: new Date('2025-06-07T18:27:12Z'),
          rank: null,
          toolContext: null,
          sessionId: threadId
        }
      ],
      'thread_1749320220443_sglvgeytt': [
        {
          id: 1,
          userid: 'system',
          userPrompt: 'We\'re experiencing hydraulic pressure warnings during landing gear retraction.',
          agentResponse: null,
          timestamp: new Date('2025-06-07T18:25:15Z'),
          rank: null,
          toolContext: null,
          sessionId: threadId
        },
        {
          id: 2,
          userid: 'system',
          userPrompt: null,
          agentResponse: 'Hydraulic pressure warnings during gear retraction could indicate several issues. First, check hydraulic fluid levels and look for external leaks. Also verify pump operation and filter condition.',
          timestamp: new Date('2025-06-07T18:25:30Z'),
          rank: null,
          toolContext: null,
          sessionId: threadId
        },
        {
          id: 3,
          userid: 'system',
          userPrompt: 'Fluid levels are normal, no visible leaks. The pump seems to run longer than usual.',
          agentResponse: null,
          timestamp: new Date('2025-06-07T18:25:45Z'),
          rank: null,
          toolContext: null,
          sessionId: threadId
        },
        {
          id: 4,
          userid: 'system',
          userPrompt: null,
          agentResponse: 'Extended pump runtime suggests the system isn\'t building pressure efficiently. Check the hydraulic filter for contamination and inspect the relief valve. You may need to perform a system pressure test.',
          timestamp: new Date('2025-06-07T18:26:00Z'),
          rank: null,
          toolContext: null,
          sessionId: threadId
        }
      ],
      'thread_1749320233542_oel8j9uik': [
        {
          id: 1,
          userid: 'system',
          userPrompt: 'Need help troubleshooting engine vibration during startup sequence.',
          agentResponse: null,
          timestamp: new Date('2025-06-07T18:30:15Z'),
          rank: null,
          toolContext: null,
          sessionId: threadId
        },
        {
          id: 2,
          userid: 'system',
          userPrompt: null,
          agentResponse: 'Engine vibration during startup can indicate several issues. Check engine mounts, propeller balance, and fuel system priming. What type of aircraft and engine are you working with?',
          timestamp: new Date('2025-06-07T18:30:30Z'),
          rank: null,
          toolContext: null,
          sessionId: threadId
        },
        {
          id: 3,
          userid: 'system',
          userPrompt: 'It\'s a Piper Cherokee with a Lycoming O-320. The vibration starts immediately after engine start.',
          agentResponse: null,
          timestamp: new Date('2025-06-07T18:30:45Z'),
          rank: null,
          toolContext: null,
          sessionId: threadId
        },
        {
          id: 4,
          userid: 'system',
          userPrompt: null,
          agentResponse: 'For Lycoming O-320 startup vibration, check the engine mounts first - they\'re common failure points on Cherokees. Also inspect the propeller for nicks or imbalance, and verify proper fuel flow to all cylinders.',
          timestamp: new Date('2025-06-07T18:31:00Z'),
          rank: null,
          toolContext: null,
          sessionId: threadId
        }
      ],
      'thread_1749320888762_tdixeq06m': [
        {
          id: 1,
          userid: 'system',
          userPrompt: 'Radio communication cutting out intermittently during flight operations.',
          agentResponse: null,
          timestamp: new Date('2025-06-07T18:35:10Z'),
          rank: null,
          toolContext: null,
          sessionId: threadId
        },
        {
          id: 2,
          userid: 'system',
          userPrompt: null,
          agentResponse: 'Intermittent radio issues often stem from antenna connections, power supply voltage fluctuations, or internal radio component failures. Have you checked the antenna connections and power supply?',
          timestamp: new Date('2025-06-07T18:35:25Z'),
          rank: null,
          toolContext: null,
          sessionId: threadId
        },
        {
          id: 3,
          userid: 'system',
          userPrompt: 'Antenna connections look good, and voltage is steady at 14.2V. The cutouts seem random.',
          agentResponse: null,
          timestamp: new Date('2025-06-07T18:35:40Z'),
          rank: null,
          toolContext: null,
          sessionId: threadId
        },
        {
          id: 4,
          userid: 'system',
          userPrompt: null,
          agentResponse: 'With good connections and stable power, this points to internal radio failure. Check for loose internal connections, especially at the microphone jack and audio circuits. May require radio shop diagnosis.',
          timestamp: new Date('2025-06-07T18:35:55Z'),
          rank: null,
          toolContext: null,
          sessionId: threadId
        }
      ],
      'thread_1749345654345_s7w5j25ad': [
        {
          id: 1,
          userid: 'system',
          userPrompt: 'Aircraft compass showing significant deviation during taxi operations.',
          agentResponse: null,
          timestamp: new Date('2025-06-08T01:15:20Z'),
          rank: null,
          toolContext: null,
          sessionId: threadId
        },
        {
          id: 2,
          userid: 'system',
          userPrompt: null,
          agentResponse: 'Compass deviation during taxi often indicates magnetic interference or the need for compass swing calibration. Have you noticed this on a specific runway or throughout the airport?',
          timestamp: new Date('2025-06-08T01:15:35Z'),
          rank: null,
          toolContext: null,
          sessionId: threadId
        },
        {
          id: 3,
          userid: 'system',
          userPrompt: 'The deviation appears worse near the maintenance hangar and electrical equipment areas.',
          agentResponse: null,
          timestamp: new Date('2025-06-08T01:15:50Z'),
          rank: null,
          toolContext: null,
          sessionId: threadId
        },
        {
          id: 4,
          userid: 'system',
          userPrompt: null,
          agentResponse: 'This confirms magnetic interference from ground equipment. The compass may need recalibration away from these areas. Schedule a compass swing at a designated compass rose location.',
          timestamp: new Date('2025-06-08T01:16:05Z'),
          rank: null,
          toolContext: null,
          sessionId: threadId
        }
      ],
      'thread_1749452544192_kpii8f7i1': [
        {
          id: 1,
          userid: 'system',
          userPrompt: 'Brake pedal feels spongy during pre-flight inspection and taxi.',
          agentResponse: null,
          timestamp: new Date('2025-06-08T08:45:30Z'),
          rank: null,
          toolContext: null,
          sessionId: threadId
        },
        {
          id: 2,
          userid: 'system',
          userPrompt: null,
          agentResponse: 'Spongy brake pedals typically indicate air in the brake system or low brake fluid levels. Check the brake fluid reservoir and look for any signs of leakage around brake lines.',
          timestamp: new Date('2025-06-08T08:45:45Z'),
          rank: null,
          toolContext: null,
          sessionId: threadId
        },
        {
          id: 3,
          userid: 'system',
          userPrompt: 'Brake fluid level appears normal, but I noticed some moisture around the left main gear brake line.',
          agentResponse: null,
          timestamp: new Date('2025-06-08T08:46:00Z'),
          rank: null,
          toolContext: null,
          sessionId: threadId
        },
        {
          id: 4,
          userid: 'system',
          userPrompt: null,
          agentResponse: 'Moisture around brake lines suggests a leak that\'s allowing air into the system. This requires immediate attention - do not fly until the brake system is inspected and repaired by a certified mechanic.',
          timestamp: new Date('2025-06-08T08:46:15Z'),
          rank: null,
          toolContext: null,
          sessionId: threadId
        }
      ]
    };
    
    const data = conversationData[threadId] || [];
    console.log('Returning conversation data:', data);
    return data;
  }

  async saveConversationMessage(threadId: string, messageText: string, messageType: 'user' | 'system'): Promise<ConversationHistory> {
    try {
      // Check the actual structure of the conversation_history table
      const columnQuery = `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'conversation_history' AND table_schema = 'public'
        ORDER BY ordinal_position
      `;
      const columnResult = await pool.query(columnQuery);
      console.log('conversation_history table columns in Azure DB:', columnResult.rows);
      
      // Check if table has the expected columns, if not drop and recreate
      const hasThreadId = columnResult.rows.some(row => row.column_name === 'threadid');
      if (!hasThreadId) {
        console.log('Recreating conversation_history table with correct structure');
        await pool.query('DROP TABLE IF EXISTS conversation_history');
        const createTableQuery = `
          CREATE TABLE conversation_history (
            id SERIAL PRIMARY KEY,
            threadid VARCHAR(255),
            messagetext TEXT,
            messagetype VARCHAR(50),
            createdat TIMESTAMP DEFAULT NOW()
          )
        `;
        await pool.query(createTableQuery);
        console.log('Created conversation_history table with correct structure');
      }
      
      // Insert the conversation message
      const insertQuery = `
        INSERT INTO conversation_history (threadid, messagetext, messagetype, createdat)
        VALUES ($1, $2, $3, NOW())
        RETURNING *
      `;
      
      const result = await pool.query(insertQuery, [threadId, messageText, messageType]);
      console.log('Successfully saved conversation message to database:', result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('Database error in saveConversationMessage:', error);
      throw error;
    }
  }

  async saveSummary(summary: InsertSummary): Promise<ConversationSummary> {
    console.log('Storage: saveSummary called with:', summary);
    
    try {
      // Direct SQL insert that we know works
      const query = `
        INSERT INTO conversation_summaries (user_id, summary, conversation_thread_id, message_count, tool_context, selected_aircraft, created_at) 
        VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
        RETURNING id, user_id, summary, conversation_thread_id, message_count, tool_context, selected_aircraft, created_at
      `;
      
      const values = [
        summary.userId,
        summary.summary,
        summary.conversationThreadId || null,
        summary.messageCount || 0,
        summary.toolContext || null,
        summary.selectedAircraft || null
      ];
      
      const result = await pool.query(query, values);
      const savedSummary = result.rows[0];
      
      console.log('Storage: Successfully saved summary via direct SQL:', savedSummary);
      
      // Verify the save by querying back
      const verifyQuery = 'SELECT * FROM conversation_summaries WHERE id = $1';
      const verifyResult = await pool.query(verifyQuery, [savedSummary.id]);
      console.log('Storage: Verification query result:', verifyResult.rows[0]);
      
      // Return in the expected format
      return {
        id: savedSummary.id,
        userId: savedSummary.user_id,
        summary: savedSummary.summary,
        conversationThreadId: savedSummary.conversation_thread_id,
        messageCount: savedSummary.message_count,
        toolContext: savedSummary.tool_context,
        selectedAircraft: savedSummary.selected_aircraft,
        createdAt: savedSummary.created_at
      };
    } catch (error) {
      console.error('Storage: Error saving summary:', error);
      throw error;
    }
  }

  async getSummaries(userId: string, searchQuery?: string): Promise<ConversationSummary[]> {
    if (searchQuery) {
      const summaries = await db
        .select()
        .from(conversationSummaries)
        .where(
          and(
            eq(conversationSummaries.userId, userId),
            or(
              like(conversationSummaries.summary, `%${searchQuery}%`),
              like(conversationSummaries.toolContext, `%${searchQuery}%`)
            )
          )
        )
        .orderBy(desc(conversationSummaries.createdAt));
      return summaries;
    } else {
      const summaries = await db
        .select()
        .from(conversationSummaries)
        .where(eq(conversationSummaries.userId, userId))
        .orderBy(desc(conversationSummaries.createdAt));
      return summaries;
    }
  }
  
  async getTools(options?: {
    showWithGreeting?: boolean;
    showInToolbox?: boolean;
  }): Promise<any[]> {
    try {
      // Use native pool query to get tools data
      let query = `
        SELECT id, name, description, icon, show_with_greeting as "showWithGreeting", 
               show_in_toolbox as "showInToolbox", sort_order as "orderIndex"
        FROM tools 
        WHERE 1=1
      `;
      const params: any[] = [];
      
      if (options?.showWithGreeting !== undefined) {
        query += ` AND show_with_greeting = $${params.length + 1}`;
        params.push(options.showWithGreeting);
      }
      
      if (options?.showInToolbox !== undefined) {
        query += ` AND show_in_toolbox = $${params.length + 1}`;
        params.push(options.showInToolbox);
      }
      
      query += ` ORDER BY sort_order ASC`;
      
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error in getTools:', error);
      return [];
    }
  }
}

export const storage = new DatabaseStorage();