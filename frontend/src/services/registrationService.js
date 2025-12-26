import api from '../config/api';

export const registrationService = {
  // Get all registrations
  getRegistrations: async (params = {}) => {
    const response = await api.get('/registrations', { params });
    return response.data;
  },

  // Get single registration
  getRegistration: async (id) => {
    const response = await api.get(`/registrations/${id}`);
    return response.data;
  },

  // Register for tournament
  registerForTournament: async (registrationData) => {
    const response = await api.post('/registrations', registrationData);
    return response.data;
  },

  // Update registration
  updateRegistration: async (id, registrationData) => {
    const response = await api.put(`/registrations/${id}`, registrationData);
    return response.data;
  },

  // Delete registration (cancel)
  deleteRegistration: async (id) => {
    const response = await api.delete(`/registrations/${id}`);
    return response.data;
  },
};

