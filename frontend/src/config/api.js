import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
// Calculate BASE_URL safely to avoid const reassignment errors
const envApiUrl = import.meta.env.VITE_API_URL;
const calculatedBaseUrl = envApiUrl && envApiUrl.includes('/api') 
  ? envApiUrl.replace('/api', '') 
  : (envApiUrl || 'http://localhost:5000');
export const BASE_URL = calculatedBaseUrl;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Don't set Content-Type for FormData, let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    // Return response directly - services will handle response.data
    return response;
  },
  async (error) => {
    // Handle network errors (including connection refused)
    if (!error.response) {
      console.error('Network Error:', error.message);
      console.error('Error code:', error.code);
      console.error('Full error:', error);
      
      // Check for connection refused error (various formats)
      const isConnectionRefused = 
        error.code === 'ECONNREFUSED' || 
        error.code === 'ERR_CONNECTION_REFUSED' ||
        error.message?.includes('ERR_CONNECTION_REFUSED') ||
        error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('Network Error') ||
        error.message === 'Network Error';
      
      if (isConnectionRefused) {
        return Promise.reject({
          message: 'Backend server is not running. Please start the backend server on port 5000.',
          networkError: true,
          connectionRefused: true,
          code: error.code
        });
      }
      
      // Retry logic for other network errors
      const config = error.config;
      if (config && !config._retry) {
        config._retry = true;
        const retryDelay = config.retryDelay || 1000;
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        
        // Retry the request
        try {
          return await api(config);
        } catch (retryError) {
          return Promise.reject({
            message: 'Network error. Please check your connection and try again.',
            networkError: true
          });
        }
      }
      
      return Promise.reject({
        message: 'Network error. Please check your connection.',
        networkError: true
      });
    }

    // Handle HTTP errors
    const status = error.response?.status;
    const errorData = error.response?.data;

    console.error('API Error:', {
      status,
      message: errorData?.message || error.message,
      data: errorData
    });
    
    // Handle 401 Unauthorized - clear session and redirect
    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Don't redirect if already on login page
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    
    // Handle 500/503 - Server errors that might be temporary
    if (status === 500 || status === 503) {
      const config = error.config;
      if (config && !config._retry && config.method === 'get') {
        config._retry = true;
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          return await api(config);
        } catch (retryError) {
          // If retry also fails, return original error
        }
      }
    }
    
    // Return error with consistent format
    return Promise.reject({
      message: errorData?.message || error.message || 'An error occurred',
      status,
      data: errorData,
      response: error.response
    });
  }
);

export default api;

