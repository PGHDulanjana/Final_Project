import api from '../config/api';

export const teamService = {
  // Get all teams
  getTeams: async () => {
    const response = await api.get('/teams');
    return response.data;
  },

  // Get single team
  getTeam: async (id) => {
    const response = await api.get(`/teams/${id}`);
    return response.data;
  },

  // Create team
  createTeam: async (teamData) => {
    const response = await api.post('/teams', teamData);
    return response.data;
  },

  // Update team
  updateTeam: async (id, teamData) => {
    const response = await api.put(`/teams/${id}`, teamData);
    return response.data;
  },

  // Delete team
  deleteTeam: async (id) => {
    const response = await api.delete(`/teams/${id}`);
    return response.data;
  },
};

