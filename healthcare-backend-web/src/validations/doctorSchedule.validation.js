// src/validations/doctorSchedule.validation.js
const Joi = require('joi');

const doctorScheduleSchema = {
  createSchema: Joi.object({
    doctorId: Joi.string()
      .hex()
      .length(24)
      .required()
      .messages({
        'string.length': 'Doctor ID không hợp lệ',
        'any.required': 'Doctor ID là bắt buộc'
      }),
    date: Joi.date()
      .iso()
      .required()
      .messages({
        'date.base': 'Ngày không hợp lệ',
        'any.required': 'Ngày là bắt buộc'
      }),
    shift: Joi.string()
      .valid('MORNING', 'AFTERNOON', 'EVENING')
      .required()
      .messages({
        'any.only': 'Ca trực phải là MORNING, AFTERNOON hoặc EVENING',
        'any.required': 'Ca trực là bắt buộc'
      }),
    status: Joi.string()
      .valid('AVAILABLE', 'BUSY', 'OFF')
      .optional(),
    note: Joi.string()
      .max(500)
      .optional()
  }),

  updateSchema: Joi.object({
    status: Joi.string()
      .valid('AVAILABLE', 'BUSY', 'OFF')
      .optional(),
    note: Joi.string()
      .max(500)
      .optional()
  }).min(1)
};

module.exports = { doctorScheduleSchema };
