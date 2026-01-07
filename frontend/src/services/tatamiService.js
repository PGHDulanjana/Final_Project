import api from '../config/api';

export const tatamiService = {
  // Get all tatamis
  getTatamis: async (params = {}) => {
    const response = await api.get('/tatamis', { params });
    return response.data;
  },

  // Get single tatami
  getTatami: async (id) => {
    const response = await api.get(`/tatamis/${id}`);
    return response.data;
  },

  // Create tatami (assign event to tatami)
  createTatami: async (tatamiData) => {
    const response = await api.post('/tatamis', tatamiData);
    return response.data;
  },

  // Update tatami
  updateTatami: async (id, tatamiData) => {
    const response = await api.put(`/tatamis/${id}`, tatamiData);
    return response.data;
  },

  // Assign judges to tatami
  assignJudges: async (tatamiId, judges) => {
    const response = await api.post(`/tatamis/${tatamiId}/assign-judges`, { judges });
    return response.data;
  },

  // Confirm judge assignment
  confirmJudgeAssignment: async (tatamiId, judgeId) => {
    const response = await api.post(`/tatamis/${tatamiId}/confirm-judge/${judgeId}`);
    return response.data;
  },

  // Grant table worker access
  grantTableWorkerAccess: async (tatamiId, userId, accessType = 'Table Worker') => {
    const response = await api.post(`/tatamis/${tatamiId}/grant-table-worker-access`, {
      user_id: userId,
      access_type: accessType
    });
    return response.data;
  },

  // Submit results
  submitResults: async (tatamiId) => {
    const response = await api.post(`/tatamis/${tatamiId}/submit-results`);
    return response.data;
  },

  // Approve results
  approveResults: async (tatamiId) => {
    const response = await api.post(`/tatamis/${tatamiId}/approve-results`);
    return response.data;
  },

  // Get events assigned to judge
  getAssignedEventsForJudge: async () => {
    const response = await api.get('/tatamis/judge/assigned-events');
    return response.data;
  }
};

