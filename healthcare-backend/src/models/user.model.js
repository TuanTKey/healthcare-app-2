// src/models/user.model.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../constants/roles');

const userSchema = new mongoose.Schema({
  // Thông tin đăng nhập
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  password: {
    type: String,
    required: false, // Cho phép null vì Web backend dùng passwordHash
    minlength: 8
  },
  // 🆕 Hỗ trợ passwordHash từ Web backend
  passwordHash: {
    type: String,
    required: false
  },
  // 🆕 Hỗ trợ name từ Web backend  
  name: {
    type: String,
    required: false
  },
  role: {
    type: String,
    enum: Object.values(ROLES),
    required: true,
    default: ROLES.PATIENT
  },
  
  // Trạng thái tài khoản (hỗ trợ cả Web và App backend)
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_APPROVAL', 'LOCKED', 'DELETED', 'PENDING_VERIFICATION', 'DEACTIVATED'],
    default: 'ACTIVE'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  
  // Bảo mật
  lastLogin: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  
  // Thông tin cá nhân (không required để hỗ trợ user từ Web backend)
  personalInfo: {
    firstName: {
      type: String,
      required: false,
      trim: true
    },
    lastName: {
      type: String,
      required: false,
      trim: true
    },
    dateOfBirth: {
      type: Date,
      required: false
    },
    gender: {
      type: String,
      enum: ['MALE', 'FEMALE', 'OTHER'],
      required: false
    },
    phone: {
      type: String,
      trim: true
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String
    },
    profilePicture: String
  },

  // Thông tin chuyên môn (cho nhân viên y tế)
  professionalInfo: {
    licenseNumber: String,
    specialization: String,
    department: String,
    qualifications: [String],
    yearsOfExperience: Number,
    hireDate: Date,
    position: String
  },

  // Documents
  documents: [{
    name: String,
    fileUrl: String,
    fileType: String,
    uploadDate: {
      type: Date,
      default: Date.now
    },
    description: String
  }],

  // Settings và preferences
  settings: {
    language: {
      type: String,
      default: 'vi'
    },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true }
    },
    theme: {
      type: String,
      default: 'light'
    },
    timezone: {
      type: String,
      default: 'Asia/Ho_Chi_Minh'
    }
  },

  // Audit fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deletedAt: Date,
  deletionReason: String,
  restoredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  restoredAt: Date

}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.emailVerificationToken;
      delete ret.resetPasswordToken;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ isDeleted: 1 });
userSchema.index({ 'personalInfo.phone': 1 });
userSchema.index({ createdAt: 1 });
userSchema.index({ 'professionalInfo.department': 1 });
userSchema.index({ 'professionalInfo.specialization': 1 });

// Virtuals
userSchema.virtual('fullName').get(function() {
  // Hỗ trợ cả name từ Web backend và personalInfo từ App backend
  if (this.name) return this.name;
  if (this.personalInfo?.firstName || this.personalInfo?.lastName) {
    return `${this.personalInfo.firstName || ''} ${this.personalInfo.lastName || ''}`.trim();
  }
  return '';
});

userSchema.virtual('age').get(function() {
  if (!this.personalInfo.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.personalInfo.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

// ĐỔI TÊN virtual property để tránh trùng lặp
userSchema.virtual('isAccountLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.virtual('profilePictureUrl').get(function() {
  if (!this.personalInfo.profilePicture) return null;
  return `${process.env.APP_URL}/uploads/profiles/${this.personalInfo.profilePicture}`;
});

// Methods - GIỮ NGUYÊN method
userSchema.methods.comparePassword = async function(candidatePassword) {
  // Hỗ trợ cả password và passwordHash (từ Web backend)
  const storedPassword = this.password || this.passwordHash;
  if (!storedPassword) return false;
  return bcrypt.compare(candidatePassword, storedPassword);
};

userSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

userSchema.methods.incrementLoginAttempts = async function() {
  // Nếu lock đã hết hạn, reset
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  // Tăng số lần thử
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Khóa tài khoản sau 5 lần thất bại trong 2 giờ
  if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
    updates.$set = { 
      lockUntil: Date.now() + 2 * 60 * 60 * 1000,
      status: 'LOCKED'
    };
  }
  
  return this.updateOne(updates);
};

userSchema.methods.generateEmailVerificationToken = function() {
  const crypto = require('crypto');
  this.emailVerificationToken = crypto.randomBytes(32).toString('hex');
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return this.emailVerificationToken;
};

userSchema.methods.generatePasswordResetToken = function() {
  const crypto = require('crypto');
  this.resetPasswordToken = crypto.randomBytes(32).toString('hex');
  this.resetPasswordExpires = Date.now() + 1 * 60 * 60 * 1000; // 1 hour
  return this.resetPasswordToken;
};

userSchema.methods.verifyEmail = function() {
  this.isEmailVerified = true;
  this.emailVerificationToken = undefined;
  this.emailVerificationExpires = undefined;
};

userSchema.methods.softDelete = function(deletedBy, reason = '') {
  this.isDeleted = true;
  this.status = 'DELETED';
  this.isActive = false;
  this.deletedBy = deletedBy;
  this.deletedAt = new Date();
  this.deletionReason = reason;
  // Ẩn email để có thể tái sử dụng
  this.email = `deleted_${Date.now()}_${this.email}`;
};

userSchema.methods.restore = function(restoredBy) {
  const originalEmail = this.email.replace(/^deleted_\d+_/, '');
  this.email = originalEmail;
  this.isDeleted = false;
  this.status = 'ACTIVE';
  this.isActive = true;
  this.deletedAt = undefined;
  this.deletedBy = undefined;
  this.deletionReason = undefined;
  this.restoredBy = restoredBy;
  this.restoredAt = new Date();
};

userSchema.methods.updateProfilePicture = function(filename) {
  this.personalInfo.profilePicture = filename;
};

// Statics
userSchema.statics.getRoles = function() {
  return ROLES;
};

userSchema.statics.findByRole = function(role) {
  return this.find({ role, status: 'ACTIVE', isDeleted: false });
};

userSchema.statics.findActiveUsers = function() {
  return this.find({ status: 'ACTIVE', isDeleted: false });
};

userSchema.statics.findByEmail = function(email) {
  return this.findOne({ 
    email: email.toLowerCase(), 
    isDeleted: false 
  });
};

userSchema.statics.findDeletedUsers = function() {
  return this.find({ isDeleted: true });
};

userSchema.statics.findByVerificationToken = function(token) {
  return this.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: Date.now() },
    isDeleted: false
  });
};

userSchema.statics.findByResetToken = function(token) {
  return this.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() },
    isDeleted: false
  });
};

userSchema.statics.getUserStats = async function() {
  // Thống kê theo role (chỉ users chưa xóa - dùng $ne: true để bao gồm cả documents thiếu field)
  const stats = await this.aggregate([
    {
      $match: { isDeleted: { $ne: true } }
    },
    {
      $group: {
        _id: '$role',
        total: { $sum: 1 },
        active: {
          $sum: { $cond: [{ $eq: ['$status', 'ACTIVE'] }, 1, 0] }
        },
        verified: {
          $sum: { $cond: ['$isEmailVerified', 1, 0] }
        }
      }
    },
    {
      $sort: { total: -1 }
    }
  ]);

  // Thống kê theo role (TẤT CẢ users, kể cả đã xóa)
  const allStats = await this.aggregate([
    {
      $group: {
        _id: '$role',
        total: { $sum: 1 },
        active: {
          $sum: { $cond: [{ $eq: ['$status', 'ACTIVE'] }, 1, 0] }
        },
        deleted: {
          $sum: { $cond: ['$isDeleted', 1, 0] }
        }
      }
    },
    {
      $sort: { total: -1 }
    }
  ]);

  // Đếm tổng số users (dùng $ne: true để bao gồm documents thiếu field isDeleted)
  const totalAllUsers = await this.countDocuments(); // Tất cả users
  const totalUsers = await this.countDocuments({ isDeleted: { $ne: true } }); // Users chưa xóa
  const deletedUsers = await this.countDocuments({ isDeleted: true }); // Users đã xóa
  const activeUsers = await this.countDocuments({ 
    status: 'ACTIVE', 
    isDeleted: { $ne: true }
  });
  const verifiedUsers = await this.countDocuments({ 
    isEmailVerified: true, 
    isDeleted: { $ne: true }
  });

  return {
    byRole: stats,
    byRoleAll: allStats, // Thêm thống kê tất cả users
    summary: {
      totalAllUsers,    // Tổng tất cả users (kể cả đã xóa)
      totalUsers,       // Users chưa xóa
      deletedUsers,     // Users đã xóa
      activeUsers,
      verifiedUsers,
      verificationRate: totalUsers > 0 ? (verifiedUsers / totalUsers * 100).toFixed(2) : 0
    }
  };
};

// Pre-save middleware
userSchema.pre('save', async function(next) {
  // Chỉ hash password nếu nó được modified
  if (!this.isModified('password')) return next();
  
  try {
    // Kiểm tra xem password đã được hash chưa
    if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$')) {
      return next();
    }
    
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.pre('save', function(next) {
  // Đồng bộ status và isActive
  if (this.isModified('status')) {
    this.isActive = this.status === 'ACTIVE';
  }
  
  // Đảm bảo email luôn lowercase
  if (this.isModified('email')) {
    this.email = this.email.toLowerCase();
  }
  
  next();
});

// Post-save middleware để log
userSchema.post('save', function(doc) {
  console.log(`✅ User saved: ${doc.email} (${doc.role})`);
});

userSchema.post('findOneAndUpdate', function(doc) {
  if (doc) {
    console.log(`✅ User updated: ${doc.email}`);
  }
});

module.exports = mongoose.model('User', userSchema);