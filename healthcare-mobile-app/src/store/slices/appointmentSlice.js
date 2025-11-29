import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { appointmentAPI } from '../../services/api';

// Async thunks
export const createAppointment = createAsyncThunk(
  'appointments/create',
  async (appointmentData, { rejectWithValue }) => {
    try {
      const response = await appointmentAPI.create(appointmentData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const getPatientAppointments = createAsyncThunk(
  'appointments/getPatientAppointments',
  async ({ patientId, filters }, { rejectWithValue }) => {
    try {
      const response = await appointmentAPI.getPatientAppointments(patientId, filters);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const cancelAppointment = createAsyncThunk(
  'appointments/cancel',
  async ({ appointmentId, reason }, { rejectWithValue }) => {
    try {
      const response = await appointmentAPI.cancel(appointmentId, reason);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const appointmentSlice = createSlice({
  name: 'appointments',
  initialState: {
    appointments: [],
    patientAppointments: [],
    currentAppointment: null,
    isLoading: false,
    isCreating: false,
    error: null,
  },
  reducers: {
    clearAppointments: (state) => {
      state.appointments = [];
      state.patientAppointments = [];
    },
    clearError: (state) => {
      state.error = null;
    },
    setCurrentAppointment: (state, action) => {
      state.currentAppointment = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create Appointment
      .addCase(createAppointment.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(createAppointment.fulfilled, (state, action) => {
        state.isCreating = false;
        state.appointments.push(action.payload.data);
        state.error = null;
      })
      .addCase(createAppointment.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.payload;
      })
      // Get Patient Appointments
      .addCase(getPatientAppointments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getPatientAppointments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.patientAppointments = action.payload.data;
        state.error = null;
      })
      .addCase(getPatientAppointments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Cancel Appointment
      .addCase(cancelAppointment.fulfilled, (state, action) => {
        const updatedAppointment = action.payload.data;
        const index = state.patientAppointments.findIndex(
          apt => apt._id === updatedAppointment._id
        );
        if (index !== -1) {
          state.patientAppointments[index] = updatedAppointment;
        }
        state.error = null;
      })
      .addCase(cancelAppointment.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { clearAppointments, clearError, setCurrentAppointment } = appointmentSlice.actions;
export default appointmentSlice.reducer;