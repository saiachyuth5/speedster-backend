const openaiService = require('../services/openai.service');
const databaseService = require('../services/database.service');

class ChatController {
  /**
   * Chat with AI about a run
   * POST /api/chat
   */
  async chat(req, res, next) {
    try {
      const { question, runData } = req.body;
      const userId = req.user.id;
      
      console.log('💬 Processing chat for run:', runData.id);
      
      // Get AI response
      const answer = await openaiService.chat(question, runData);
      
      // Prepare messages
      const newMessages = [
        { role: 'user', content: question, timestamp: new Date().toISOString() },
        { role: 'assistant', content: answer, timestamp: new Date().toISOString() }
      ];
      
      // Save or update conversation
      const existingConversation = await databaseService.getConversation(userId, runData.id);
      
      if (existingConversation) {
        await databaseService.updateConversation(
          existingConversation.id,
          [...existingConversation.messages, ...newMessages]
        );
        console.log('✅ Updated conversation for run:', runData.id);
      } else {
        await databaseService.createConversation(userId, runData.id, newMessages);
        console.log('✅ Created conversation for run:', runData.id);
      }
      
      res.json({ answer });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ChatController();
