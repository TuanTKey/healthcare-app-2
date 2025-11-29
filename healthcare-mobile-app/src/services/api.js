import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Backend API configuration
// Your PC IP on WiFi network: 192.168.1.3
const BASE_URL = 'http://192.168.1.3:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
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