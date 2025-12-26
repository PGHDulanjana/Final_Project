import api from '../config/api';

export const dojoService = {
  // Get all dojos
  getDojos: async (params = {}) => {
    const response = await api.get('/dojos', { params });
    return response.data;
  },

  // Get single dojo
  getDojo: async (id) => {
    const response = await api.get(`/dojos/${id}`);
    return response.data;
  },

  // Create dojo
  createDojo: async (dojoData) => {
    const response = await api.post('/dojos', dojoData);
    return response.data;
  },

  // Update dojo
  updateDojo: async (id, dojoData) => {
    const response = await api.put(`/dojos/${id}`, dojoData);
    return response.data;
  },

  // Delete dojo
  deleteDojo: async (id) => {
    const response = await api.delete(`/dojos/${id}`);
    return response.data;
  },
};

