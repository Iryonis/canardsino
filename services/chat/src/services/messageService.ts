import { Message } from '../models/Message.js';

export class MessageService {
  /**
   * Save a system message to database
   */
  static async saveSystemMessage(message: string): Promise<void> {
    try {
      await Message.create({
        type: 'system',
        message,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error saving system message:', error);
      throw error;
    }
  }

  /**
   * Save a chat message to database
   */
  static async saveChatMessage(username: string, message: string): Promise<void> {
    try {
      await Message.create({
        type: 'chat',
        username,
        message,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error saving chat message:', error);
      throw error;
    }
  }

  /**
   * Get the last N messages from database
   */
  static async getRecentMessages(limit: number = 20) {
    try {
      const messages = await Message.find()
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();
      
      // Return in chronological order
      return messages.reverse();
    } catch (error) {
      console.error('Error fetching recent messages:', error);
      return [];
    }
  }
}