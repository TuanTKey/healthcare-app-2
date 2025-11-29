import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { prescriptionAPI } from '../../services/api';

// Async thunks
export const createPrescription = createAsyncThunk(
  'prescriptions/create',
  async ({ patientId, prescriptionData }, { rejectWithValue }) => {
    try {
      const response = await prescriptionAPI.create(patientId, prescriptionData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const getPatientPrescriptions = createAsyncThunk(
  'prescriptions/getPatientPrescriptions',
  async ({ patientId, filters }, { rejectWithValue }) => {
    try {
      const response = await prescriptionAPI.getPatientPrescriptions(patientId, filters);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const dispenseMedication = createAsyncThunk(
  'prescriptions/dispense',
  async ({ prescriptionId, dispenseData }, { rejectWithValue }) => {
    try {
      const response = await prescriptionAPI.dispense(prescriptionId, dispenseData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const prescriptionSlice = createSlice({
  name: 'prescriptions',
  initialState: {
    prescriptions: [],
    patientPrescriptions: [],
    currentPrescription: null,
    isLoading: false,
    isCreating: false,
    error: null,
  },
  reducers: {
    clearPrescriptions: (state) => {
      state.prescriptions = [];
      state.patientPrescriptions = [];
    },
    clearError: (state) => {
      state.error = null;
    },
    setCurrentPrescription: (state, action) => {
      state.currentPrescription = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create Prescription
      .addCase(createPrescription.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(createPrescription.fulfilled, (state, action) => {
        state.isCreating = false;
        state.prescriptions.push(action.payload.data);
        state.error = null;
      })
      .addCase(createPrescription.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.payload;
      })
      // Get Patient Prescriptions
      .addCase(getPatientPrescriptions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getPatientPrescriptions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.patientPrescriptions = action.payload.data;
        state.error = null;
      })
      .addCase(getPatientPrescriptions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Dispense Medication
      .addCase(dispenseMedication.fulfilled, (state, action) => {
        const updatedPrescription = action.payload.data;
        const index = state.patientPrescriptions.findIndex(
          pres => pres._id === updatedPrescription._id
        );
        if (index !== -1) {
          state.patientPrescriptions[index] = updatedPrescription;
        }
        state.error = null;
      })
      .addCase(dispenseMedication.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { clearPrescriptions, clearError, setCurrentPrescription } = prescriptionSlice.actions;
export default prescriptionSlice.reducer;