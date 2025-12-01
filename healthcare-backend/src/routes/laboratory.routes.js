const express = require('express');
const router = express.Router();
const laboratoryController = require('../controllers/laboratory.controller');
// 🔧 FIX: Import requirePermission từ rbac.middleware thay vì auth.middleware
const { 
  authenticate
} = require('../middlewares/auth.middleware');
const { 
  requirePermission,
  requireRole 
} = require('../middlewares/rbac.middleware');
const { 
  validate
} = require('../middlewares/validation.middleware');
const {
  orderLabTestValidation,
  recordLabResultValidation,
  updateLabResultValidation,
  updateLabOrderValidation
} = require('../validations/laboratory.validation');
const { PERMISSIONS, ROLES } = require('../constants/roles');

// Áp dụng xác thực cho tất cả routes
router.use(authenticate);

// Routes cho bác sĩ
router.post(
  '/patients/:patientId/lab-orders',
  requirePermission(PERMISSIONS['LAB.CREATE_ORDERS']),
  validate(orderLabTestValidation),
  laboratoryController.orderLabTest
);

router.get(
  '/lab-orders/:orderId',
  requirePermission(PERMISSIONS['LAB.VIEW_ORDERS']),
  laboratoryController.getLabOrder
);

router.put(
  '/lab-orders/:orderId',
  requirePermission(PERMISSIONS['LAB.UPDATE_ORDERS']),
  validate(updateLabOrderValidation),
  laboratoryController.updateLabOrder
);

router.delete(
  '/lab-orders/:orderId/cancel',
  requirePermission(PERMISSIONS['LAB.UPDATE_ORDERS']),
  laboratoryController.cancelLabOrder
);

// Routes cho kỹ thuật viên
router.post(
  '/lab-orders/:orderId/results',
  requirePermission(PERMISSIONS['LAB.CREATE_RESULTS']),
  validate(recordLabResultValidation),
  laboratoryController.recordLabResult
);

router.patch(
  '/lab-orders/:orderId/results/:testId',
  requirePermission(PERMISSIONS['LAB.UPDATE_RESULTS']),
  validate(updateLabResultValidation),
  laboratoryController.updateLabResult
);

router.post(
  '/lab-orders/:orderId/tests/:testId/approve',
  requirePermission(PERMISSIONS['LAB.APPROVE_RESULTS']),
  laboratoryController.approveLabResult
);

router.post(
  '/lab-orders/:orderId/tests/:testId/start',
  requirePermission(PERMISSIONS['LAB.CREATE_RESULTS']),
  laboratoryController.markTestInProgress
);

router.post(
  '/lab-orders/:orderId/tests/:testId/collect',
  requirePermission(PERMISSIONS['LAB.CREATE_RESULTS']),
  laboratoryController.markSampleCollected
);

// Routes chung
router.get(
  '/lab-results/:resultId',
  requirePermission(PERMISSIONS['LAB.VIEW_RESULTS']),
  laboratoryController.getLabResult
);

router.get(
  '/patients/:patientId/lab-results',
  requirePermission(PERMISSIONS['LAB.VIEW_RESULTS']),
  laboratoryController.getPatientLabResults
);

router.get(
  '/lab-orders',
  requirePermission(PERMISSIONS['LAB.VIEW_ORDERS']),
  laboratoryController.getPendingTests
);

router.get(
  '/lab-results',
  requirePermission(PERMISSIONS['LAB.VIEW_RESULTS']),
  laboratoryController.getCompletedTests
);

module.exports = router;