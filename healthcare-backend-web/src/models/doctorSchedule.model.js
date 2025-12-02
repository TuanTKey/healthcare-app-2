// src/models/doctorSchedule.model.js
const mongoose = require('mongoose');

const DoctorScheduleSchema = new mongoose.Schema({
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  shift: {
    type: String,
    enum: ['MORNING', 'AFTERNOON', 'EVENING'],
    required: true
  },
  status: {
    type: String,
    enum: ['AVAILABLE', 'BUSY', 'OFF'],
    default: 'AVAILABLE'
  },
  note: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('DoctorSchedule', DoctorScheduleSchema);
