import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { insertConversationSchema } from '@shared/schema';
import { z } from 'zod';

const router = Router();

// Save a new conversation
router.post('/', async (req: Request, res: Response) => {
  try {
    const validatedData = insertConversationSchema.parse(req.body);
    const conversation = await storage.saveConversationMessage(
      validatedData.threadId || 'default-thread',
      validatedData.messageText || '',
      'user',
    );
    res.status(201).json(conversation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      console.error('Error saving conversation:', error);
      res.status(500).json({ error: 'Failed to save conversation' });
    }
  }
});

// Update conversation rating
router.patch('/:id/rate', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { rating } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ error: 'Rating must be a number between 1 and 5' });
    }

    // Note: updateConversationRating method doesn't exist in storage
    // You'll need to implement this method or handle rating updates differently
    res.status(501).json({ error: 'Rating update not implemented' });
  } catch (error) {
    console.error('Error updating conversation rating:', error);
    res.status(500).json({ error: 'Failed to update conversation rating' });
  }
});

// Get conversation history
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const conversations = await storage.getConversationHistory(userId);
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    res.status(500).json({ error: 'Failed to fetch conversation history' });
  }
});

export default router;
