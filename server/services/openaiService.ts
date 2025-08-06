import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ConversationMessage {
  sender: 'user' | 'bot';
  content: string;
}

export async function summarizeConversation(messages: ConversationMessage[]): Promise<string> {
  try {
    // Filter out empty messages and format for summarization
    const meaningfulMessages = messages.filter(msg => msg.content.trim().length > 0);
    
    if (meaningfulMessages.length === 0) {
      return "Empty conversation";
    }

    // Create conversation text for summarization
    const conversationText = meaningfulMessages
      .map(msg => `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a conversation summarizer for aviation professionals. Create a clear, human-readable subject line that captures the main topic or issue discussed. Focus on the key subject matter like aircraft problems, maintenance issues, or operational questions. Be concise and professional. Do not include timestamps or technical prefixes."
        },
        {
          role: "user", 
          content: `Create a clear subject line for this aviation conversation:\n\n${conversationText}`
        }
      ],
      max_tokens: 60,
      temperature: 0.3
    });

    const summary = response.choices[0].message.content?.trim() || "Aviation Discussion";
    
    // Clean up the summary - remove quotes if present and ensure it's concise
    const cleanSummary = summary.replace(/^["']|["']$/g, '').trim();
    
    // Ensure it's not too long (max 80 characters for readability)
    const finalSummary = cleanSummary.length > 80 ? cleanSummary.substring(0, 77) + '...' : cleanSummary;
    
    return finalSummary;
  } catch (error) {
    console.error('Error summarizing conversation:', error);
    return "Conversation summary unavailable";
  }
}