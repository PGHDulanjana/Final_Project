import api from "../config/api";

export const paymentService = {
  // Get all payments
  getPayments: async (params = {}) => {
    const response = await api.get("/payments", { params });
    return response.data;
  },

  // Get single payment
  getPayment: async (id) => {
    const response = await api.get(`/payments/${id}`);
    return response.data;
  },

  // Check payment status
  checkPaymentStatus: async (id) => {
    const response = await api.get(`/payments/${id}/status`);
    return response.data;
  },

  // Create payment (initiate payment)
  createPayment: async (paymentData) => {
    const response = await api.post("/payments", paymentData);
    return response.data;
  },

  // Update payment (Admin only)
  updatePayment: async (id, paymentData) => {
    const response = await api.put(`/payments/${id}`, paymentData);
    return response.data;
  },

  // Delete payment (Admin only)
  deletePayment: async (id) => {
    const response = await api.delete(`/payments/${id}`);
    return response.data;
  },

  // TEMPORARY: Complete fake payment (for testing)
  completeFakePayment: async (paymentId) => {
    const response = await api.post(`/payments/${paymentId}/complete-fake`);
    return response.data;
  },
};
