import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authAPI } from '../../services/api';
import * as SecureStore from 'expo-secure-store';

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      console.log('🔐 Login attempt:', credentials.email);
      const response = await authAPI.login(credentials);
      console.log('✅ Login API response:', response.data);
      
      // Lưu token vào SecureStore
      if (response.data.data.tokens?.accessToken) {
        await SecureStore.setItemAsync('authToken', response.data.data.tokens.accessToken);
        console.log('💾 Token saved to SecureStore');
      }
      
      // Trả về dữ liệu user đã được chuẩn hóa
      return {
        user: normalizeUserData(response.data.data.user),
        token: response.data.data.tokens.accessToken,
        sessionId: response.data.data.sessionId
      };
    } catch (error) {
      console.log('❌ Login failed:', error);
      return rejectWithValue(error.response?.data || { 
        message: error.message || 'Đăng nhập thất bại' 
      });
    }
  }
);

// Hàm chuẩn hóa dữ liệu user từ backend
const normalizeUserData = (userData) => {
  console.log('🔄 Normalizing user data:', userData);
  
  // Nếu user data nằm trong _doc (Mongoose)
  const user = userData._doc || userData;
  
  return {
    _id: user._id,
    email: user.email,
    role: user.role,
    personalInfo: user.personalInfo || {
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender
    },
    medicalInfo: user.medicalInfo || {},
    professionalInfo: user.professionalInfo,
    patientId: user.patientId,
    settings: user.settings || {
      theme: 'light',
      language: 'vi',
      notifications: {},
      timezone: 'Asia/Ho_Chi_Minh'
    },
    // Thêm các trường khác nếu cần
  };
};

export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authAPI.getCurrentUser();
      return {
        user: normalizeUserData(response.data.data.user),
        token: await SecureStore.getItemAsync('authToken')
      };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      console.log('📝 Register attempt:', userData.email);
      const response = await authAPI.register(userData);
      console.log('✅ Register API response:', response.data);
      
      // API trả về accessToken và refreshToken trực tiếp, không trong tokens object
      const accessToken = response.data.data?.accessToken || response.data.data?.tokens?.accessToken;
      
      if (accessToken) {
        await SecureStore.setItemAsync('authToken', accessToken);
        console.log('💾 Token saved after registration');
      }
      
      return {
        user: response.data.data?.user ? normalizeUserData(response.data.data.user) : null,
        token: accessToken,
        message: response.data.message
      };
    } catch (error) {
      console.log('❌ Register failed:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data || { 
        message: error.message || 'Đăng ký thất bại' 
      });
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: null,
    sessionId: null,
    isAuthenticated: false,
    isLoading: false,
    isRegistering: false,
    error: null,
  },
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.sessionId = null;
      state.isAuthenticated = false;
      SecureStore.deleteItemAsync('authToken');
      console.log('🚪 User logged out');
    },
    clearError: (state) => {
      state.error = null;
    },
    setCredentials: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        console.log('🔄 Login pending...');
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.sessionId = action.payload.sessionId;
        state.error = null;
        console.log('🎉 Login fulfilled - User authenticated:', {
          id: action.payload.user._id,
          email: action.payload.user.email,
          role: action.payload.user.role
        });
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.error = action.payload;
        console.log('❌ Login rejected:', action.payload);
      })
      // Get Current User
      .addCase(getCurrentUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
        console.log('🔄 Current user loaded:', action.payload.user.email);
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.isLoading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = action.payload;
        console.log('❌ Failed to load current user:', action.payload);
      })
      // Register
      .addCase(register.pending, (state) => {
        state.isRegistering = true;
        state.error = null;
        console.log('📝 Register pending...');
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isRegistering = false;
        state.error = null;
        // Chỉ set authenticated nếu có user và token
        if (action.payload.user && action.payload.token) {
          state.isAuthenticated = true;
          state.user = action.payload.user;
          state.token = action.payload.token;
        }
        console.log('✅ Register fulfilled:', action.payload.message);
      })
      .addCase(register.rejected, (state, action) => {
        state.isRegistering = false;
        state.error = action.payload;
        console.log('❌ Register rejected:', action.payload);
      });
  },
});

export const { logout, clearError, setCredentials } = authSlice.actions;
export default authSlice.reducer;