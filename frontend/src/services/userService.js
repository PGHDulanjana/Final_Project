import api from '../config/api';

export const userService = {
  // Get all users (Admin only)
  getUsers: async () => {
    const response = await api.get('/users');
    return response.data;
  },

  // Get single user
  getUser: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  // Update user
  updateUser: async (id, userData, hasFile = false) => {
    if (hasFile) {
      // If updating with file (profile picture)
      const formData = new FormData();
      Object.keys(userData).forEach(key => {
        if (userData[key] !== null && userData[key] !== undefined) {
          formData.append(key, userData[key]);
        }
      });
      const response = await api.put(`/users/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } else {
      // Regular JSON update
      const response = await api.put(`/users/${id}`, userData);
      return response.data;
    }
  },

  // Delete user (Admin only)
  deleteUser: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },
};

