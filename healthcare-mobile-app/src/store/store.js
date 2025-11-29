import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import patientSlice from './slices/patientSlice';
import appointmentSlice from './slices/appointmentSlice';
import prescriptionSlice from './slices/prescriptionSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    patients: patientSlice,
    appointments: appointmentSlice,
    prescriptions: prescriptionSlice,
  },
});

export default store;