import api from '../config/api';

export const matchService = {
  // Get all matches
  getMatches: async (params = {}) => {
    const response = await api.get('/matches', { params });
    return response.data;
  },

  // Get single match
  getMatch: async (id) => {
    const response = await api.get(`/matches/${id}`);
    return response.data;
  },

  // Create match
  createMatch: async (matchData) => {
    const response = await api.post('/matches', matchData);
    return response.data;
  },

  // Update match
  updateMatch: async (id, matchData) => {
    const response = await api.put(`/matches/${id}`, matchData);
    return response.data;
  },

  // Delete match
  deleteMatch: async (id) => {
    const response = await api.delete(`/matches/${id}`);
    return response.data;
  },

  // Generate match draws using Gemini AI
  generateDraws: async (tournamentId, categoryId, useGemini = true) => {
    const response = await api.post('/matches/generate-draws', {
      tournament_id: tournamentId,
      category_id: categoryId,
      useGemini
    });
    return response.data;
  },

  // Calculate Kumite match winner
  calculateKumiteMatchWinner: async (matchId) => {
    const response = await api.post(`/matches/${matchId}/calculate-winner`);
    return response.data;
  },

  // Generate next round matches
  generateNextRound: async (categoryId, currentRoundLevel) => {
    const response = await api.post('/matches/generate-next-round', {
      category_id: categoryId,
      current_round_level: currentRoundLevel
    });
    return response.data;
  },
};

