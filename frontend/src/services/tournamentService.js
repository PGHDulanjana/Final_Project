import api from '../config/api';

export const tournamentService = {
  // Get all tournaments
  getTournaments: async (params = {}) => {
    const response = await api.get('/tournaments', { params });
    return response.data;
  },

  // Get single tournament
  getTournament: async (id) => {
    const response = await api.get(`/tournaments/${id}`);
    return response.data;
  },

  // Create tournament
  createTournament: async (tournamentData) => {
    const response = await api.post('/tournaments', tournamentData);
    return response.data;
  },

  // Update tournament
  updateTournament: async (id, tournamentData) => {
    const response = await api.put(`/tournaments/${id}`, tournamentData);
    return response.data;
  },

  // Delete tournament
  deleteTournament: async (id) => {
    const response = await api.delete(`/tournaments/${id}`);
    return response.data;
  },
};

