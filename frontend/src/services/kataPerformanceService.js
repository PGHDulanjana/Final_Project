import api from '../config/api';

const kataPerformanceService = {
  // Get all Kata performances
  getPerformances: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`/kata-performances?${queryString}`);
    return response.data;
  },

  // Get single Kata performance
  getPerformance: async (id) => {
    const response = await api.get(`/kata-performances/${id}`);
    return response.data;
  },

  // Create round performances
  createRoundPerformances: async (data) => {
    const response = await api.post('/kata-performances/create-round', data);
    return response.data;
  },

  // Submit Kata score
  submitKataScore: async (performanceId, kataScore) => {
    const response = await api.post(`/kata-performances/${performanceId}/score`, {
      kata_score: kataScore
    });
    return response.data;
  },

  // Get Kata scoreboard
  getScoreboard: async (categoryId, round = null) => {
    const params = round ? { round } : {};
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`/kata-performances/scoreboard/${categoryId}?${queryString}`);
    return response.data;
  },

  // Calculate final score
  calculateFinalScore: async (performanceId) => {
    const response = await api.post(`/kata-performances/${performanceId}/calculate-final`);
    return response.data;
  },

  // Delete Kata performance
  deletePerformance: async (performanceId) => {
    const response = await api.delete(`/kata-performances/${performanceId}`);
    return response.data;
  },

  // Delete all performances for a round
  deleteRoundPerformances: async (categoryId, round) => {
    const response = await api.delete(`/kata-performances/round/${categoryId}?round=${encodeURIComponent(round)}`);
    return response.data;
  },

  // Assign rankings for Final 4 round
  assignRankings: async (categoryId, round) => {
    const response = await api.post('/kata-performances/assign-rankings', {
      category_id: categoryId,
      round
    });
    return response.data;
  }
};

export default kataPerformanceService;

