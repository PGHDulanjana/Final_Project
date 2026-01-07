import api from '../config/api';

const chatService = {
  // Get all messages for the current user
  getMessages: async (receiverId = null) => {
    try {
      const params = receiverId ? { receiver_id: receiverId } : {};
      const response = await api.get('/chat', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get a single message by ID
  getMessage: async (messageId) => {
    try {
      const response = await api.get(`/chat/${messageId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Send a message to another user
  sendMessage: async (receiverId, message, messageType = 'Text') => {
    try {
      const response = await api.post('/chat', {
        receiver_id: receiverId,
        message,
        message_type: messageType
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Send a message to the bot and get AI response
  sendBotMessage: async (message) => {
    try {
      const response = await api.post('/chat/bot', {
        message
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update a message
  updateMessage: async (messageId, updateData) => {
    try {
      const response = await api.put(`/chat/${messageId}`, updateData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete a message
  deleteMessage: async (messageId) => {
    try {
      const response = await api.delete(`/chat/${messageId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default chatService;

