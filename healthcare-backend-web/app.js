// src/app.js
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const { appConfig } = require('./src/config');
const authRoutes = require('./src/routes/auth.routes');
const userRoutes = require('./src/routes/user.routes');
const patientRoutes = require('./src/routes/patient.routes');
const appointmentRoutes = require('./src/routes/appointment.routes');
const medicalRoutes = require('./src/routes/medical.routes');
const prescriptionRoutes = require('./src/routes/prescription.routes');
const labRoutes = require('./src/routes/lab.routes');
const billingRoutes = require('./src/routes/billing.routes');
const consultationRoutes = require('./src/routes/consultation.routes');
const superAdminRoutes = require('./src/routes/superAdmin.routes');
const webhookRoutes = require('./src/routes/webhook.routes');
const doctorScheduleRoutes = require('./src/routes/doctorSchedule.routes');
const clinicRoutes = require('./src/routes/clinic.routes');
const feedbackRoutes = require('./src/routes/feedback.routes');

/**
 * ỨNG DỤNG EXPRESS CHÍNH
 * - Cấu hình middleware bảo mật và hiệu năng
 * - Định tuyến API endpoints
 */

// 🚀 KHỞI TẠO ỨNG DỤNG EXPRESS
const app = express();

// 🔒 MIDDLEWARE BẢO MẬT
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// 🌐 CORS CONFIGURATION
const corsOrigin = appConfig.cors.origin;
app.use(cors({
  origin: function(origin, callback) {
    // Cho phép requests không có origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Nếu là '*' cho phép tất cả
    if (corsOrigin === '*') return callback(null, true);
    
    // Kiểm tra trong danh sách allowed origins
    const allowedOrigins = Array.isArray(corsOrigin) ? corsOrigin : [corsOrigin];
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Log và reject
    console.log(`🚫 CORS blocked: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// ⚡ MIDDLEWARE HIỆU NĂNG
app.use(compression()); // Nén response
app.use(express.json({ limit: '10mb' })); // Giới hạn kích thước request
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 📊 LOGGING MIDDLEWARE
app.use(morgan(appConfig.isDev ? 'dev' : 'combined', {
  skip: (req) => req.path === '/health' // Bỏ log health check
}));

// 🛡️ RATE LIMITING CHO API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: appConfig.isDev ? 1000 : 100, // Giới hạn request
  message: {
    error: 'Quá nhiều request từ IP này, vui lòng thử lại sau 15 phút.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);

// 🏥 HEALTH CHECK ENDPOINT
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: appConfig.env,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// 🎯 API ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/medical', medicalRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/lab', labRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/consultation', consultationRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/webhook', webhookRoutes); // 🔔 Webhook cho thanh toán tự động
app.use('/api/doctor-schedule', doctorScheduleRoutes); // 📅 Lịch làm việc bác sĩ
app.use('/api/clinic', clinicRoutes); // 🏥 Quản lý phòng khám
app.use('/api/feedback', feedbackRoutes); // ⭐ Đánh giá dịch vụ

// 🔍 DEBUG ENDPOINT (chỉ trong development)
if (appConfig.isDev) {
  app.get('/api/debug/config', (req, res) => {
    res.json({
      environment: appConfig.env,
      port: appConfig.port,
      db: { /* ẩn thông tin nhạy cảm */ },
      jwt: { /* ẩn thông tin nhạy cảm */ },
      features: {
        audit: appConfig.logging.enableAudit,
        cors: appConfig.cors.origin
      }
    });
  });
}

// ❌ HANDLE 404 - KHÔNG TÌM THẤY ROUTE
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Không tìm thấy endpoint',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// 🚨 ERROR HANDLING MIDDLEWARE
app.use((error, req, res, next) => {
  console.error('🚨 Lỗi hệ thống:', error);

  // 🎯 PHÂN LOẠI LỖI
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Dữ liệu không hợp lệ',
      details: error.details?.map(detail => detail.message) || [error.message]
    });
  }

  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Token không hợp lệ'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token đã hết hạn'
    });
  }

  // 🎯 LỖI MẶC ĐỊNH
  const statusCode = error.statusCode || 500;
  const message = appConfig.isDev ? error.message : 'Đã xảy ra lỗi hệ thống';

  res.status(statusCode).json({
    error: message,
    ...(appConfig.isDev && { stack: error.stack })
  });
});

module.exports = app;