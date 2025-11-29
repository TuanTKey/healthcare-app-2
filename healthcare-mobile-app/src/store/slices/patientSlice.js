import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { patientAPI } from '../../services/api';

// Async thunks
export const registerPatient = createAsyncThunk(
  'patients/register',
  async (patientData, { rejectWithValue }) => {
    try {
      const response = await patientAPI.register(patientData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const searchPatients = createAsyncThunk(
  'patients/search',
  async (filters, { rejectWithValue }) => {
    try {
      const response = await patientAPI.search(filters);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const getPatientDemographics = createAsyncThunk(
  'patients/getDemographics',
  async (patientId, { rejectWithValue }) => {
    try {
      const response = await patientAPI.getDemographics(patientId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const patientSlice = createSlice({
  name: 'patients',
  initialState: {
    patients: [],
    currentPatient: null,
    searchResults: [],
    isLoading: false,
    isRegistering: false,
    error: null,
  },
  reducers: {
    clearPatients: (state) => {
      state.patients = [];
      state.searchResults = [];
    },
    clearError: (state) => {
      state.error = null;
    },
    setCurrentPatient: (state, action) => {
      state.currentPatient = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Register Patient
      .addCase(registerPatient.pending, (state) => {
        state.isRegistering = true;
        state.error = null;
      })
      .addCase(registerPatient.fulfilled, (state, action) => {
        state.isRegistering = false;
        state.patients.push(action.payload.data);
        state.error = null;
      })
      .addCase(registerPatient.rejected, (state, action) => {
        state.isRegistering = false;
        state.error = action.payload;
      })
      // Search Patients
      .addCase(searchPatients.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchPatients.fulfilled, (state, action) => {
        state.isLoading = false;
        state.searchResults = action.payload.data;
        state.error = null;
      })
      .addCase(searchPatients.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Get Patient Demographics
      .addCase(getPatientDemographics.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getPatientDemographics.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentPatient = action.payload.data;
        state.error = null;
      })
      .addCase(getPatientDemographics.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearPatients, clearError, setCurrentPatient } = patientSlice.actions;
export default patientSlice.reducer;