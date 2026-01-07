import api from '../config/api';

const kataReportService = {
  // Generate Kata report for a category
  generateReport: async (categoryId) => {
    const response = await api.post('/kata-reports/generate', {
      category_id: categoryId
    });
    return response.data;
  },

  // Get Kata report for a category
  getReport: async (categoryId) => {
    const response = await api.get(`/kata-reports/category/${categoryId}`);
    return response.data;
  },

  // Get all Kata reports for a tournament
  getTournamentReports: async (tournamentId) => {
    const response = await api.get(`/kata-reports/tournament/${tournamentId}`);
    return response.data;
  },

  // Get Kata reports for a player
  getPlayerReports: async (playerId) => {
    const response = await api.get(`/kata-reports/player/${playerId}`);
    return response.data;
  }
};

export default kataReportService;

