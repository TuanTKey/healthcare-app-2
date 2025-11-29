// src/routes/billing.routes.js
const express = require('express');
const router = express.Router();
const {
  createBill,
  getAllBills,
  getBill,
  updateBill,
  getPatientBills,
  processPayment,
  getPaymentHistory,
  voidBill,
  getRevenueStats
} = require('../controllers/billing.controller');
const {
  authenticate,
  requirePermission
} = require('../middlewares/auth.middleware');
const {
  validateQuery
} = require('../middlewares/validation.middleware');
const { billingSchemas } = require('../validations/billing.validation');

// 🎯 ALL ROUTES REQUIRE AUTHENTICATION
router.use(authenticate);

// 🎯 LẤY TẤT CẢ HÓA ĐƠN (CHO ADMIN)
router.get('/',
  getAllBills
);

// 🎯 GET REVENUE STATS (must be before /:billId to avoid route conflict)
router.get('/revenue/stats',
  requirePermission('BILL.VIEW_REPORTS'),
  validateQuery(billingSchemas.billQuery),
  getRevenueStats
);

// 🎯 GET BILL DETAIL
router.get('/:billId',
  requirePermission('BILL.VIEW'),
  getBill
);

// 🎯 UPDATE BILL
router.put('/:billId',
  requirePermission('BILL.UPDATE'),
  updateBill
);

// 🎯 PROCESS PAYMENT FOR BILL
router.post('/:billId/payments',
  requirePermission('BILL.PROCESS_PAYMENTS'),
  processPayment
);

// 🎯 VOID BILL
router.patch('/:billId/void',
  requirePermission('BILL.UPDATE'),
  voidBill
);

// 🎯 CREATE BILL FOR PATIENT
router.post('/patients/:patientId/bills', 
  requirePermission('BILL.CREATE'),
  createBill
);

// 🎯 GET PATIENT'S BILLS
router.get('/patients/:patientId/bills',
  requirePermission('BILL.VIEW'),
  validateQuery(billingSchemas.billQuery),
  getPatientBills
);

// 🎯 GET PAYMENT HISTORY
router.get('/patients/:patientId/payments',
  requirePermission('BILL.VIEW'),
  validateQuery(billingSchemas.paymentQuery),
  getPaymentHistory
);

module.exports = router;