import api from '../config/api';

export const coachService = {
  // Get all coaches with dojo information
  getCoaches: async () => {
    const response = await api.get('/coaches');
    return response.data;
  },

  // Get single coach
  getCoach: async (id) => {
    const response = await api.get(`/coaches/${id}`);
    return response.data;
  },
};

