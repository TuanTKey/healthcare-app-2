// src/validations/clinic.validation.js
const Joi = require('joi');

const clinicSchema = {
  createSchema: Joi.object({
    name: Joi.string()
      .min(3)
      .max(100)
      .required()
      .messages({
        'string.min': 'Tên phòng khám phải có ít nhất 3 ký tự',
        'string.max': 'Tên phòng khám không được vượt quá 100 ký tự',
        'any.required': 'Tên phòng khám là bắt buộc'
      }),
    description: Joi.string()
      .max(500)
      .optional(),
    location: Joi.string()
      .max(500)
      .optional(),
    capacity: Joi.number()
      .min(1)
      .optional()
      .messages({
        'number.min': 'Sức chứa phải ít nhất 1'
      })
  }),

  updateSchema: Joi.object({
    name: Joi.string()
      .min(3)
      .max(100)
      .optional(),
    description: Joi.string()
      .max(500)
      .optional(),
    location: Joi.string()
      .max(500)
      .optional(),
    capacity: Joi.number()
      .min(1)
      .optional(),
    status: Joi.string()
      .valid('AVAILABLE', 'OCCUPIED', 'MAINTENANCE')
      .optional()
  }).min(1)
};

module.exports = { clinicSchema };
