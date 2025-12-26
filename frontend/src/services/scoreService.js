import api from '../config/api';

export const scoreService = {
  // Get all scores
  getScores: async (params = {}) => {
    const response = await api.get('/scores', { params });
    return response.data;
  },

  // Get single score
  getScore: async (id) => {
    const response = await api.get(`/scores/${id}`);
    return response.data;
  },

  // Submit score
  submitScore: async (scoreData) => {
    const response = await api.post('/scores', scoreData);
    return response.data;
  },

  // Create score (alias for submitScore)
  createScore: async (scoreData) => {
    const response = await api.post('/scores', scoreData);
    return response.data;
  },

  // Update score
  updateScore: async (id, scoreData) => {
    const response = await api.put(`/scores/${id}`, scoreData);
    return response.data;
  },

  // Delete score
  deleteScore: async (id) => {
    const response = await api.delete(`/scores/${id}`);
    return response.data;
  },
};

