const mongoose = require('mongoose');

/**
 * 🏥 MEDICAL RECORD MODEL
 * Mỗi bệnh nhân có 1 hồ sơ bệnh án duy nhất
 * Mỗi lần khám sẽ thêm 1 lượt khám (visit) vào hồ sơ
 */

// Schema cho mỗi lượt khám
const visitSchema = new mongoose.Schema({
  visitId: {
    type: String,
    required: true
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  department: String,
  visitType: {
    type: String,
    enum: ['OUTPATIENT', 'INPATIENT', 'EMERGENCY', 'FOLLOW_UP'],
    default: 'OUTPATIENT'
  },
  visitDate: {
    type: Date,
    default: Date.now
  },
  chiefComplaint: String,
  historyOfPresentIllness: String,
  
  // Triệu chứng
  symptoms: [{
    symptom: String,
    duration: String,
    severity: {
      type: String,
      enum: ['MILD', 'MODERATE', 'SEVERE']
    },
    notes: String
  }],
  
  // Sinh hiệu
  vitalSigns: {
    bloodPressure: {
      systolic: Number,
      diastolic: Number
    },
    heartRate: Number,
    respiratoryRate: Number,
    temperature: Number,
    oxygenSaturation: Number,
    height: Number,
    weight: Number,
    recordedAt: Date,
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // Khám thực thể
  physicalExamination: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // Chẩn đoán
  diagnoses: [{
    diagnosis: String,
    code: String,
    type: {
      type: String,
      enum: ['PRIMARY', 'SECONDARY', 'DIFFERENTIAL']
    },
    certainty: {
      type: String,
      enum: ['CONFIRMED', 'PROBABLE', 'POSSIBLE']
    },
    notes: String
  }],
  
  // Kế hoạch điều trị
  treatmentPlan: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // Đơn thuốc liên quan
  prescriptions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription'
  }],
  
  // Xét nghiệm liên quan
  labOrders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LabOrder'
  }],
  
  // Ghi chú
  notes: String,
  
  // Trạng thái
  status: {
    type: String,
    enum: ['DRAFT', 'COMPLETED', 'CANCELLED'],
    default: 'COMPLETED'
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Schema chính cho hồ sơ bệnh án
const medicalRecordSchema = new mongoose.Schema({
  recordId: {
    type: String,
    unique: true,
    required: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true // MỖI BỆNH NHÂN CHỈ CÓ 1 HỒ SƠ
  },
  
  // Thông tin cơ bản bệnh nhân (snapshot)
  patientInfo: {
    fullName: String,
    dateOfBirth: Date,
    gender: String,
    bloodType: String,
    phone: String,
    address: String
  },
  
  // Tiền sử bệnh
  medicalHistory: {
    allergies: [{
      allergen: String,
      reaction: String,
      severity: String
    }],
    chronicConditions: [{
      condition: String,
      diagnosedDate: Date,
      status: String,
      notes: String
    }],
    familyHistory: [{
      condition: String,
      relationship: String,
      notes: String
    }],
    surgicalHistory: [{
      procedure: String,
      date: Date,
      hospital: String,
      notes: String
    }],
    immunizations: [{
      vaccine: String,
      date: Date,
      notes: String
    }]
  },
  
  // DANH SÁCH CÁC LƯỢT KHÁM
  visits: [visitSchema],
  
  // Trạng thái hồ sơ
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'ARCHIVED'],
    default: 'ACTIVE'
  },
  
  // Bảo mật
  privacyLevel: {
    type: String,
    enum: ['STANDARD', 'SENSITIVE', 'RESTRICTED'],
    default: 'STANDARD'
  },
  
  // Audit
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
medicalRecordSchema.index({ patientId: 1 });
medicalRecordSchema.index({ recordId: 1 });
medicalRecordSchema.index({ 'visits.visitDate': -1 });
medicalRecordSchema.index({ 'visits.doctorId': 1 });
medicalRecordSchema.index({ status: 1 });

// Virtuals
medicalRecordSchema.virtual('totalVisits').get(function() {
  return this.visits ? this.visits.length : 0;
});

medicalRecordSchema.virtual('lastVisit').get(function() {
  if (!this.visits || this.visits.length === 0) return null;
  return this.visits.sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate))[0];
});

// Methods
medicalRecordSchema.methods.addVisit = function(visitData) {
  this.visits.push(visitData);
  return this.save();
};

medicalRecordSchema.methods.getVisitById = function(visitId) {
  return this.visits.find(v => v.visitId === visitId || v._id.toString() === visitId);
};

medicalRecordSchema.methods.calculateBMI = function() {
  const lastVisit = this.lastVisit;
  if (!lastVisit?.vitalSigns?.height || !lastVisit?.vitalSigns?.weight) return null;
  const heightInMeters = lastVisit.vitalSigns.height / 100;
  return (lastVisit.vitalSigns.weight / (heightInMeters * heightInMeters)).toFixed(1);
};

// Statics
medicalRecordSchema.statics.findByPatient = function(patientId) {
  return this.findOne({ patientId });
};

medicalRecordSchema.statics.findOrCreateForPatient = async function(patientId, createdBy) {
  let record = await this.findOne({ patientId });
  
  if (!record) {
    const { generateMedicalCode } = require('../utils/healthcare.utils');
    const recordId = `MR${generateMedicalCode(8)}`;
    
    record = new this({
      recordId,
      patientId,
      visits: [],
      createdBy
    });
    await record.save();
  }
  
  return record;
};

medicalRecordSchema.statics.getPatientMedicalHistory = async function(patientId) {
  const record = await this.findOne({ patientId })
    .populate('visits.doctorId', 'personalInfo email specialization')
    .populate('visits.prescriptions')
    .populate('visits.labOrders');
  
  return record;
};

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
