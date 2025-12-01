import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Backend API configuration
// Render deployment URL
const BASE_URL = 'https://healthcare-app-2-apt4.onrender.com/api';

// Create axios instance with increased timeout for Render.com cold starts
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // Increased to 60 seconds for cold starts
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('🔑 Token added to request:', token.substring(0, 20) + '...');
      }
    } catch (error) {
      console.log('Error getting token from SecureStore:', error);
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
    console.log('✅ API Success:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  },
  async (error) => {
    console.log('❌ API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });
    
    // Only retry GET requests on network error (POST/PUT/DELETE should not be retried)
    const isIdempotent = error.config?.method?.toLowerCase() === 'get';
    if (error.message === 'Network Error' && error.config && !error.config._retry && isIdempotent) {
      error.config._retry = true;
      console.log(`🔄 Retrying GET request... (1 attempt left)`);
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return await api.request(error.config);
      } catch (retryError) {
        // If retry also fails, continue with normal error handling
      }
    }
    
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('authToken');
      console.log('🔒 Token expired, removed from storage');
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => {
    console.log('📤 Login request:', { email: credentials.email });
    return api.post('/auth/login', credentials);
  },
  register: (userData) => api.post('/auth/register', userData),
  getCurrentUser: () => {
    console.log('📤 Getting current user...');
    return api.get('/auth/me');
  },
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  changePassword: (data) => api.post('/auth/change-password', data),
  logout: () => api.post('/auth/logout'),
};

export default api;