// src/routes/doctorSchedule.routes.js
const express = require('express');
const router = express.Router();
const doctorScheduleController = require('../controllers/doctorSchedule.controller');
const { authenticate, requireRole, requirePermission } = require('../middlewares/auth.middleware');
const { validateBody } = require('../middlewares/validation.middleware');
const { doctorScheduleSchema } = require('../validations/doctorSchedule.validation');

// Tạo lịch làm việc (admin, superadmin)
router.post('/', 
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  validateBody(doctorScheduleSchema.createSchema),
  doctorScheduleController.createSchedule
);

// Lấy lịch của bác sĩ
router.get('/:doctorId', 
  authenticate,
  doctorScheduleController.getSchedules
);

// Cập nhật lịch làm việc (admin, superadmin)
router.put('/:scheduleId',
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  validateBody(doctorScheduleSchema.updateSchema),
  doctorScheduleController.updateSchedule
);

// Xóa lịch làm việc (admin, superadmin)
router.delete('/:scheduleId',
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  doctorScheduleController.deleteSchedule
);

module.exports = router;
