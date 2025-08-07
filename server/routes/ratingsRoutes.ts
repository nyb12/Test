import { Router, Request, Response } from 'express';
import pkg from 'pg';
import { summarizeConversation } from '../services/openaiService';
const { Pool } = pkg;

const router = Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Save a chat message and get an ID back
router.post('/save-conversation', async (req: Request, res: Response) => {
  const { userPrompt, agentResponse } = req.body;

  try {
    console.log('Saving conversation:', { userPrompt, agentResponse });

    const result = await pool.query(
      `INSERT INTO conversation_history (user_prompt, agent_response)
       VALUES ($1, $2)
       RETURNING id, user_prompt, agent_response, timestamp`,
      [userPrompt, agentResponse],
    );

    console.log('Conversation saved successfully:', result.rows[0]);
    res.status(201).json({
      id: result.rows[0].id,
      userPrompt: result.rows[0].user_prompt,
      agentResponse: result.rows[0].agent_response,
      timestamp: result.rows[0].timestamp,
    });
  } catch (error) {
    console.error('Error saving conversation:', error);
    res.status(500).json({ error: 'Failed to save conversation' });
  }
});

// Update rating for a conversation
router.post('/save-rating', async (req: Request, res: Response) => {
  const { id, rating } = req.body;

  try {
    console.log('Saving rating:', { id, rating });

    const result = await pool.query(
      `UPDATE conversation_history
       SET rank = $1
       WHERE id = $2
       RETURNING id, rank`,
      [rating, id],
    );

    if (result.rowCount === 0) {
      console.error('No conversation found with ID:', id);
      return res.status(404).json({ error: 'Conversation not found' });
    }

    console.log('Rating saved successfully:', result.rows[0]);
    res.status(200).json({ success: true, updated: result.rows[0] });
  } catch (error) {
    console.error('Error saving rating:', error);
    res.status(500).json({ error: 'Failed to save rating' });
  }
});

// Get recent conversation history for summarization
router.get('/history', async (req: Request, res: Response) => {
  try {
    // Get the 10 most recent conversations to summarize
    const result = await pool.query(
      `SELECT id, user_prompt, agent_response, timestamp, rank
       FROM conversation_history
       ORDER BY timestamp DESC
       LIMIT 10`,
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error retrieving conversation history:', error);
    res.status(500).json({ error: 'Failed to retrieve conversation history' });
  }
});

// Generate a conversation summary using OpenAI
router.get('/summary', async (req: Request, res: Response) => {
  try {
    // Get recent conversations to summarize
    const result = await pool.query(
      `SELECT user_prompt, agent_response, timestamp, rank
       FROM conversation_history
       ORDER BY timestamp DESC
       LIMIT 10`,
    );

    if (result.rows.length === 0) {
      return res.status(200).json({
        summary: 'No conversation history available to summarize.',
      });
    }

    // Generate the summary using OpenAI
    const summary = await summarizeConversation(result.rows);

    res.status(200).json({ summary });
  } catch (error) {
    console.error('Error generating conversation summary:', error);
    res.status(500).json({ error: 'Failed to generate conversation summary' });
  }
});

export default router;
