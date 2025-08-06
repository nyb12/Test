import dotenv from 'dotenv';
dotenv.config();

import express, { type Request, Response, NextFunction } from 'express';
import session from 'express-session';
import { registerRoutes } from './routes';
import { setupVite, serveStatic, log } from './vite';
import { heartbeatService } from './services/heartbeatService';
import OpenAI from 'openai';

const app = express();

// Configure session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-for-development',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }),
);

// Add compression for faster responses
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-cache');
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// PRIORITY: API endpoints - register before all other routes
// Conversation summarization endpoint
app.post('/api/summarize-conversation', async (req: Request, res: Response) => {
  try {
    const { summarizeConversation } = await import('./services/openaiService');
    const { storage } = await import('./storage');
    const {
      messages,
      userId,
      toolContext,
      conversationThreadId,
      selectedAircraft,
    } = req.body;

    console.log('Summarization endpoint hit with:', {
      userId,
      toolContext,
      conversationThreadId,
    });

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const summary = await summarizeConversation(messages);
    console.log('Generated summary:', summary);

    // Save summary to database if userId is provided
    if (userId) {
      console.log('Attempting to save summary for userId:', userId);
      try {
        console.log('About to call storage.saveSummary with data:', {
          userId,
          summary,
          conversationThreadId: conversationThreadId || null,
          messageCount: messages.length,
          toolContext: toolContext || null,
          selectedAircraft: selectedAircraft || null,
        });

        const savedSummary = await storage.saveSummary({
          userId,
          summary,
          conversationThreadId: conversationThreadId || null,
          messageCount: messages.length,
          toolContext: toolContext || null,
          selectedAircraft: selectedAircraft || null,
        });

        console.log('Successfully saved summary with ID:', savedSummary.id);
        res.json({
          summary,
          summaryId: savedSummary.id,
          saved: true,
        });
      } catch (dbError: any) {
        console.error('Error saving summary to database:', dbError);
        // Still return the summary even if database save fails
        res.json({ summary, saved: false, error: dbError.message });
      }
    } else {
      console.log('No userId provided, cannot save summary');
      res.json({ summary, saved: false, reason: 'No user ID provided' });
    }
  } catch (error: any) {
    console.error('Error summarizing conversation:', error);
    res.status(500).json({
      error: 'Failed to summarize conversation',
      details: error.message,
    });
  }
});

// Get conversation summaries for a user
app.get('/api/summaries', async (req: Request, res: Response) => {
  try {
    const { storage } = await import('./storage');
    const userId = req.query.userId as string;
    const searchQuery = req.query.search as string;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const summaries = await storage.getSummaries(userId, searchQuery);
    res.json({ summaries });
  } catch (error: any) {
    console.error('Error retrieving summaries:', error);
    res.status(500).json({
      error: 'Failed to retrieve summaries',
      details: error.message,
    });
  }
});

// Get conversation history by thread ID
app.get(
  '/api/conversation-history/:threadId',
  async (req: Request, res: Response) => {
    try {
      console.log('API endpoint hit with threadId:', req.params.threadId);
      const { storage } = await import('./storage');
      const threadId = req.params.threadId;

      if (!threadId) {
        console.log('threadId is missing');
        return res.status(400).json({ error: 'threadId is required' });
      }

      console.log('Calling storage.getConversationHistory with:', threadId);
      const history = await storage.getConversationHistory(threadId);
      console.log('Storage returned:', history);
      res.json({ history });
    } catch (error: any) {
      console.error('Error retrieving conversation history:', error);
      res.status(500).json({
        error: 'Failed to retrieve conversation history',
        details: error.message,
      });
    }
  },
);

// Save conversation message
app.post(
  '/api/conversation-history/save',
  async (req: Request, res: Response) => {
    try {
      const { storage } = await import('./storage');
      const { threadId, messageText, messageType } = req.body;

      if (!threadId || !messageText || !messageType) {
        return res.status(400).json({
          error: 'threadId, messageText, and messageType are required',
        });
      }

      const savedMessage = await storage.saveConversationMessage(
        threadId,
        messageText,
        messageType,
      );
      console.log('Saved conversation message:', savedMessage);
      res.json({ success: true, message: savedMessage });
    } catch (error: any) {
      console.error('Error saving conversation message:', error);
      res.status(500).json({
        error: 'Failed to save conversation message',
        details: error.message,
      });
    }
  },
);

// Audio transcription endpoint using OpenAI Whisper
app.post('/api/transcribe-audio', async (req: Request, res: Response) => {
  console.log('=== AUDIO TRANSCRIPTION ENDPOINT HIT ===');

  try {
    const { audio, fileName } = req.body;

    if (!audio) {
      return res.status(400).json({ error: 'Audio data is required' });
    }

    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audio, 'base64');
    console.log('Audio buffer size:', audioBuffer.length);

    // Create a temporary file for OpenAI Whisper API
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    const { promisify } = await import('util');
    const writeFile = promisify(fs.writeFile);
    const unlink = promisify(fs.unlink);

    // Use system temp directory and ensure proper extension
    const tempDir = os.tmpdir();
    const tempFileName = `audio_${Date.now()}.webm`;
    const tempFilePath = path.join(tempDir, tempFileName);

    console.log('Writing audio to temp file:', tempFilePath);

    try {
      // Write audio buffer to temporary file
      await writeFile(tempFilePath, audioBuffer);

      // Verify file was written
      const stats = await fs.promises.stat(tempFilePath);
      console.log('Temp file size:', stats.size);

      // Initialize OpenAI client
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Create a Blob-like object for the OpenAI SDK
      const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });
      const audioFile = new File([audioBlob], tempFileName, {
        type: 'audio/webm',
      });

      // Transcribe audio using Whisper
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        response_format: 'text',
      });

      console.log('Transcription successful:', transcription);

      // Clean up temporary file
      await unlink(tempFilePath);

      console.log('Audio transcription successful:', transcription);
      res.json({ text: transcription });
    } catch (fileError) {
      // Clean up temporary file if it exists
      try {
        await unlink(tempFilePath);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      throw fileError;
    }
  } catch (error: any) {
    console.error('Audio transcription error:', error);
    res.status(500).json({
      error: 'Failed to transcribe audio',
      details: error.message,
    });
  }
});

// External API chat endpoint
app.post('/chat-api', async (req: Request, res: Response) => {
  console.log('=== EXTERNAL API CHAT ENDPOINT HIT ===');
  console.log('Request body keys:', Object.keys(req.body));

  try {
    const { message, conversationId, image, userId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Store user message in conversation history
    const threadId =
      conversationId ||
      `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const { storage } = await import('./storage');
      await storage.saveConversationMessage(threadId, message, 'user');
      console.log('Saved user message to database');
    } catch (dbError) {
      console.error('Error saving user message to database:', dbError);
    }

    // Handle image analysis with OpenAI if image is provided
    if (image) {
      console.log('Processing image with OpenAI Vision API');
      console.log('OpenAI API Key present:', !!process.env.OPENAI_API_KEY);

      try {
        // Initialize OpenAI client
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });

        console.log('OpenAI client initialized successfully');

        const response = await openai.chat.completions.create({
          model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text:
                    message ||
                    'Analyze this image and provide a detailed description of what you see. Focus on any maintenance issues, aircraft components, or operational observations that might be relevant.',
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${image}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 500,
        });

        console.log('OpenAI API call completed successfully');
        const aiResponse =
          response.choices[0]?.message?.content ||
          "I was able to process the image but couldn't generate a description.";
        console.log('OpenAI Vision response:', aiResponse);

        // Save AI response to conversation history
        try {
          const storageModule = await import('./storage');
          await storageModule.storage.saveConversationMessage(
            threadId,
            aiResponse,
            'system',
          );
          console.log('Saved AI response to conversation history');
        } catch (dbError) {
          console.error('Error saving AI response to database:', dbError);
        }

        return res.json({
          response: aiResponse,
          conversationId: threadId,
          id: `msg_${Date.now()}`,
          isHtml: false,
        });
      } catch (error: any) {
        console.error('OpenAI Vision API error details:', {
          message: error.message,
          status: error.status,
          type: error.type,
          stack: error.stack,
        });

        let errorMessage = 'I encountered an error processing the image. ';

        if (error.status === 401) {
          errorMessage +=
            'API authentication failed. Please check the API key configuration.';
        } else if (error.status === 429) {
          errorMessage +=
            'API rate limit exceeded. Please try again in a moment.';
        } else if (error.message?.includes('model')) {
          errorMessage +=
            'The vision model is not available. Please try again later.';
        } else {
          errorMessage += 'Please try again or describe what you observed.';
        }

        return res.status(500).json({
          error: 'Failed to process image',
          response: errorMessage,
        });
      }
    }

    // Regular text message handling with external API
    const payload = {
      message: message,
      userId: userId,
      conversationId: conversationId || '',
    };

    console.log('Making request to external API with payload:', payload);

    const externalResponse = await fetch(
      `${process.env.EXTERNAL_API_BASE_URL}/Chat/message`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.EXTERNAL_API_KEY || '',
        },
        body: JSON.stringify(payload),
      },
    );

    if (!externalResponse.ok) {
      console.error(
        'External API error:',
        externalResponse.status,
        externalResponse.statusText,
      );
      return res.status(500).json({
        error: 'External API error',
        response:
          "I'm having trouble connecting to the aircraft systems right now. Please try again.",
      });
    }

    const apiData = await externalResponse.json();
    console.log('External API response:', apiData);

    const botResponse =
      apiData.response ||
      apiData.message ||
      'Response received from aircraft systems.';

    // Store bot response in conversation history
    try {
      const { storage } = await import('./storage');
      await storage.saveConversationMessage(threadId, botResponse, 'system');
      console.log('Saved bot response to conversation history');
    } catch (dbError) {
      console.error('Error saving bot response to database:', dbError);
    }

    return res.json({
      response: botResponse,
      conversationId: apiData.conversationId || threadId,
      timestamp: new Date().toISOString(),
      isHtml: apiData.isHtml || false,
      id: apiData.id,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      response: "I'm experiencing technical difficulties. Please try again.",
    });
  }
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on('finish', () => {
    const duration = Date.now() - start;
    if (path.startsWith('/api')) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + '…';
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get('env') === 'development') {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5001
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5001;
  server.listen(port, '127.0.0.1', () => {
    log(`serving on port ${port}`);
    heartbeatService.start();
  });
})();
