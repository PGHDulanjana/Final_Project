import api from '../config/api';

export const judgeService = {
  // Get all judges
  getJudges: async () => {
    const response = await api.get('/judges');
    return response.data;
  },

  // Get single judge
  getJudge: async (id) => {
    const response = await api.get(`/judges/${id}`);
    return response.data;
  },
};

