// src/validations/feedback.validation.js
const Joi = require('joi');

const feedbackSchema = {
  createSchema: Joi.object({
    appointmentId: Joi.string()
      .hex()
      .length(24)
      .required()
      .messages({
        'string.length': 'Appointment ID không hợp lệ',
        'any.required': 'Appointment ID là bắt buộc'
      }),
    patientId: Joi.string()
      .hex()
      .length(24)
      .required()
      .messages({
        'any.required': 'Patient ID là bắt buộc'
      }),
    doctorId: Joi.string()
      .hex()
      .length(24)
      .required()
      .messages({
        'any.required': 'Doctor ID là bắt buộc'
      }),
    rating: Joi.number()
      .min(1)
      .max(5)
      .required()
      .messages({
        'number.min': 'Đánh giá phải từ 1 đến 5',
        'number.max': 'Đánh giá phải từ 1 đến 5',
        'any.required': 'Đánh giá là bắt buộc'
      }),
    comment: Joi.string()
      .max(1000)
      .optional(),
    categories: Joi.object({
      serviceQuality: Joi.number().min(1).max(5).optional(),
      doctorAttitude: Joi.number().min(1).max(5).optional(),
      clinicCleanliness: Joi.number().min(1).max(5).optional(),
      valueForMoney: Joi.number().min(1).max(5).optional()
    }).optional()
  }),

  updateSchema: Joi.object({
    status: Joi.string()
      .valid('PENDING', 'APPROVED', 'REJECTED')
      .required()
      .messages({
        'any.only': 'Status phải là PENDING, APPROVED hoặc REJECTED',
        'any.required': 'Status là bắt buộc'
      })
  })
};

module.exports = { feedbackSchema };
