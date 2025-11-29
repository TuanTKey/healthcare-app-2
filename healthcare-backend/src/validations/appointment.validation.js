const Joi = require('joi');
const { commonSchemas } = require('../middlewares/validation.middleware');

/**
 * 🏥 APPOINTMENT VALIDATION SCHEMAS
 * Đảm bảo dữ liệu lịch hẹn hợp lệ
 */

const appointmentValidation = {
  // 🎯 TẠO LỊCH HẸN
  createAppointment: Joi.object({
    patientId: commonSchemas.objectId.required(),
    doctorId: commonSchemas.objectId.optional(), // Make optional to allow API to find doctor
    appointmentDate: Joi.date().required().messages({
      'date.base': 'appointmentDate phải là ngày hợp lệ',
      'any.required': 'Ngày hẹn là bắt buộc'
    }),
    duration: Joi.number().integer().min(15).max(480).default(30),
    type: Joi.string().valid('CONSULTATION', 'FOLLOW_UP', 'CHECKUP', 'SURGERY', 'TEST', 'OTHER').default('CONSULTATION'),
    location: Joi.string().max(200).default('Main Clinic'),
    room: Joi.string().max(50).optional(),
    reason: Joi.string().max(500).required(),
    description: Joi.string().max(1000).optional(),
    notes: Joi.string().max(1000).optional(),
    status: Joi.string().valid('SCHEDULED', 'CONFIRMED', 'CANCELLED').default('SCHEDULED')
  }),

  // 🎯 CẬP NHẬT LỊCH HẸN
  updateAppointment: Joi.object({
    appointmentDate: Joi.date().optional().messages({
      'date.base': 'appointmentDate phải là ngày hợp lệ'
    }),
    duration: Joi.number().integer().min(15).max(480).optional(),
    reason: Joi.string().max(500).optional(),
    notes: Joi.string().max(1000).optional(),
    status: Joi.string().valid('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW').optional()
  }).min(1),

  // 🎯 HỦY LỊCH HẸN
  cancelAppointment: Joi.object({
    reason: Joi.string().max(500).required()
  }),

  // 🎯 ĐẶT LẠI LỊCH HẸN
  rescheduleAppointment: Joi.object({
    newAppointmentDate: Joi.date().required().messages({
      'date.base': 'newAppointmentDate phải là ngày hợp lệ'
    }),
    reason: Joi.string().max(500).optional()
  }),

  // 🎯 GỬI NHẮC NHỞ
  sendReminder: Joi.object({
    method: Joi.string().valid('EMAIL', 'SMS', 'PUSH').default('EMAIL'),
    message: Joi.string().max(500).optional()
  }),

  // 🎯 TẠO LỊCH LÀM VIỆC
  createSchedule: Joi.object({
    doctorId: commonSchemas.objectId.required(),
    dayOfWeek: Joi.string().valid('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY').required(),
    startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    slotDuration: Joi.number().integer().min(15).max(240).default(30),
    maxAppointmentsPerDay: Joi.number().integer().min(1).optional(),
    isActive: Joi.boolean().default(true)
  }),

  // 🎯 CẬP NHẬT LỊCH LÀM VIỆC
  updateSchedule: Joi.object({
    startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    slotDuration: Joi.number().integer().min(15).max(240).optional(),
    maxAppointmentsPerDay: Joi.number().integer().min(1).optional(),
    isActive: Joi.boolean().optional()
  }).min(1),

  // 🎯 LẤY LỊCH HẸN CỦA BỆNH NHÂN
  getPatientAppointments: Joi.object({
    status: Joi.string().valid('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW').optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    sortBy: Joi.string().valid('appointmentDate', 'createdAt', 'status').default('appointmentDate'),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc')
  }),

  // 🎯 LẤY LỊCH HẸN CỦA BÁC SĨ
  getDoctorAppointments: Joi.object({
    status: Joi.string().valid('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW').optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    date: Joi.date().optional(),
    sortBy: Joi.string().valid('appointmentDate', 'createdAt').default('appointmentDate'),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc')
  }),

  // 🎯 LẤY LỊCH LÀM VIỆC
  getDoctorSchedule: Joi.object({
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    dayOfWeek: Joi.string().valid('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY').optional()
  }),

  // 🎯 TÌM KIẾM LỊCH HẸN
  searchAppointments: Joi.object({
    patientEmail: Joi.string().email().optional(),
    doctorEmail: Joi.string().email().optional(),
    status: Joi.string().optional(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  })
};

module.exports = appointmentValidation;
