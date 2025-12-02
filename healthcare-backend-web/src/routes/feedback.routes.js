// src/routes/feedback.routes.js
const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedback.controller');
const { authenticate, requireRole } = require('../middlewares/auth.middleware');
const { validateBody } = require('../middlewares/validation.middleware');
const { feedbackSchema } = require('../validations/feedback.validation');

// Tạo feedback (bệnh nhân)
router.post('/', 
  authenticate,
  requireRole(['PATIENT']),
  validateBody(feedbackSchema.createSchema),
  feedbackController.createFeedback
);

// Lấy tất cả feedback (admin, superadmin)
router.get('/', 
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  feedbackController.getAllFeedback
);

// Lấy feedback của bác sĩ
router.get('/doctor/:doctorId',
  authenticate,
  feedbackController.getFeedbackByDoctor
);

// Lấy chi tiết feedback
router.get('/:feedbackId',
  authenticate,
  feedbackController.getFeedbackById
);

// Phê duyệt/từ chối feedback (admin, superadmin)
router.put('/:feedbackId',
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  validateBody(feedbackSchema.updateSchema),
  feedbackController.updateFeedback
);

// Xóa feedback
router.delete('/:feedbackId',
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  feedbackController.deleteFeedback
);

module.exports = router;
