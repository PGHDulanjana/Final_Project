import api from '../config/api';

const kumiteReportService = {
  // Generate Kumite report for a category
  generateReport: async (categoryId) => {
    const response = await api.post('/kumite-reports/generate', {
      category_id: categoryId
    });
    return response.data;
  },

  // Get Kumite report for a category
  getReport: async (categoryId) => {
    const response = await api.get(`/kumite-reports/category/${categoryId}`);
    return response.data;
  },

  // Get all Kumite reports for a tournament
  getTournamentReports: async (tournamentId) => {
    const response = await api.get(`/kumite-reports/tournament/${tournamentId}`);
    return response.data;
  },

  // Get Kumite reports for a player
  getPlayerReports: async (playerId) => {
    const response = await api.get(`/kumite-reports/player/${playerId}`);
    return response.data;
  }
};

export default kumiteReportService;

