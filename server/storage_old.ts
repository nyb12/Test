import { users, conversationHistory, conversationSummaries, type User, type InsertUser, type ConversationHistory, type ConversationSummary, type InsertSummary } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Conversation history methods
  getConversationHistory(threadId: string): Promise<ConversationHistory[]>;
  saveConversationMessage(threadId: string, messageText: string, messageType: 'user' | 'system'): Promise<ConversationHistory>;
  
  // Summary methods
  saveSummary(summary: InsertSummary): Promise<ConversationSummary>;
  getSummaries(userId: string): Promise<ConversationSummary[]>;
  
  // Tools methods
  getTools(options?: { 
    showWithGreeting?: boolean;
    showInToolbox?: boolean;
  }): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  // Conversation history methods
  async saveConversation(conversation: InsertConversation): Promise<ConversationHistory> {
    // Generate session ID if not provided
    const sessionId = conversation.sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Execute raw SQL with all new fields
    const result = await db.execute(
      `INSERT INTO conversation_history (session_id, user_prompt, agent_response, rank, tool_context, userid)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        sessionId,
        conversation.userPrompt,
        conversation.agentResponse,
        conversation.rank || null,
        conversation.toolContext || null,
        conversation.userId || null
      ]
    );
    
    return result.rows[0];
  }
  
  async updateConversationRating(id: number, rating: number): Promise<ConversationHistory | undefined> {
    // Use raw SQL to update the rating
    const result = await db.execute(
      `UPDATE conversation_history 
       SET rank = $1 
       WHERE id = $2 
       RETURNING *`,
      [rating, id]
    );
    
    return result.rows[0] || undefined;
  }
  
  async getConversationHistory(threadId: string): Promise<ConversationHistory[]> {
    const history = await db
      .select()
      .from(conversationHistory)
      .where(eq(conversationHistory.threadId, threadId))
      .orderBy(conversationHistory.createdAt);
    return history;
  }

  async saveConversationMessage(threadId: string, messageText: string, messageType: 'user' | 'system'): Promise<ConversationHistory> {
    const [message] = await db
      .insert(conversationHistory)
      .values({
        threadId,
        messageText,
        messageType
      })
      .returning();
    return message;
  }

  async saveSummary(summary: InsertSummary): Promise<ConversationSummary> {
    const [savedSummary] = await db
      .insert(conversationSummaries)
      .values(summary)
      .returning();
    return savedSummary;
  }

  async getSummaries(userId: string): Promise<ConversationSummary[]> {
    const summaries = await db
      .select()
      .from(conversationSummaries)
      .where(eq(conversationSummaries.userId, userId))
      .orderBy(conversationSummaries.createdAt);
    return summaries;
  }
  
  async getTools(options?: {
    showWithGreeting?: boolean;
    showInToolbox?: boolean;
  }): Promise<any[]> {
    try {
      console.log(`Getting tools with options:`, options);
      
      const { tools } = await import("@shared/schema");
      const { eq, and, asc } = await import("drizzle-orm");
      
      let query = 'SELECT * FROM tools';
      
      if (options?.showWithGreeting || options?.showInToolbox) {
        const whereParts = [];
        if (options?.showWithGreeting) {
          whereParts.push('show_with_greeting = true');
        }
        if (options?.showInToolbox) {
          whereParts.push('show_in_toolbox = true');
        }
        query += ' WHERE ' + whereParts.join(' AND ');
      }
      
      query += ' ORDER BY sort_order ASC, name ASC';
      
      const result = await db.execute(query);
      
      // Ensure boolean fields are properly converted
      const processedRows = result.rows.map((row: any) => ({
        ...row,
        bypassselectiveactionwhenaircraftiselected: row.bypassselectiveactionwhenaircraftiselected === 't' || row.bypassselectiveactionwhenaircraftiselected === true
      }));
      
      console.log(`Found ${processedRows.length} tools`);
      console.log('Sample tool with bypass field:', processedRows.find((t: any) => t.name === 'FleetSpan')); // Debug FleetSpan specifically
      return processedRows;
    } catch (error) {
      console.error('Error fetching tools:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
