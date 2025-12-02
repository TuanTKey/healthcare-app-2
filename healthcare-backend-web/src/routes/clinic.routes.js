// src/routes/clinic.routes.js
const express = require('express');
const router = express.Router();
const clinicController = require('../controllers/clinic.controller');
const { authenticate, requireRole } = require('../middlewares/auth.middleware');
const { validateBody } = require('../middlewares/validation.middleware');
const { clinicSchema } = require('../validations/clinic.validation');

// Tạo phòng khám (admin, superadmin)
router.post('/', 
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  validateBody(clinicSchema.createSchema),
  clinicController.createClinic
);

// Lấy tất cả phòng khám
router.get('/', 
  authenticate,
  clinicController.getAllClinics
);

// Lấy phòng khám khả dụng (public)
router.get('/available', 
  clinicController.getAvailableClinics
);

// Lấy chi tiết phòng khám
router.get('/:clinicId',
  authenticate,
  clinicController.getClinicById
);

// Cập nhật phòng khám (admin, superadmin)
router.put('/:clinicId',
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  validateBody(clinicSchema.updateSchema),
  clinicController.updateClinic
);

// Xóa phòng khám (admin, superadmin)
router.delete('/:clinicId',
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  clinicController.deleteClinic
);

module.exports = router;
