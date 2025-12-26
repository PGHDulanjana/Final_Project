import api from '../config/api';

export const paymentService = {
  // Get all payments
  getPayments: async (params = {}) => {
    const response = await api.get('/payments', { params });
    return response.data;
  },

  // Get single payment
  getPayment: async (id) => {
    const response = await api.get(`/payments/${id}`);
    return response.data;
  },

  // Create payment (initiate payment)
  createPayment: async (paymentData) => {
    const response = await api.post('/payments', paymentData);
    return response.data;
  },

  // Update payment (Admin only)
  updatePayment: async (id, paymentData) => {
    const response = await api.put(`/payments/${id}`, paymentData);
    return response.data;
  },
};

