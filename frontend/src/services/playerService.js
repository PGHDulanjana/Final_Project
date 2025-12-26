import api from '../config/api';

export const playerService = {
  // Get all players
  getPlayers: async () => {
    const response = await api.get('/players');
    return response.data;
  },

  // Get single player
  getPlayer: async (id) => {
    const response = await api.get(`/players/${id}`);
    return response.data;
  },

  // Create player profile
  createPlayer: async (playerData) => {
    const response = await api.post('/players', playerData);
    return response.data;
  },

  // Update player
  updatePlayer: async (id, playerData) => {
    const response = await api.put(`/players/${id}`, playerData);
    return response.data;
  },
};

