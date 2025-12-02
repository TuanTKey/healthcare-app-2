const express = require('express');
const router = express.Router();
const prescriptionController = require('../controllers/prescription.controller');
const { 
  authenticate, 
  requirePermission,
  requireRole 
} = require('../middlewares/auth.middleware');
const { 
  validate,
  validateParams 
} = require('../middlewares/validation.middleware');
const {
  createPrescriptionValidation,
  updatePrescriptionValidation,
  dispenseMedicationValidation,
  checkDrugInteractionValidation,
  medicationAdministrationValidation
} = require('../validations/prescription.validation');
const { PERMISSIONS, ROLES } = require('../constants/roles');

// Áp dụng xác thực cho tất cả routes
router.use(authenticate);

// 🎯 LẤY TẤT CẢ ĐƠN THUỐC (CHO ADMIN VÀ NHÂN VIÊN Y TẾ)
router.get(
  '/',
  requireRole([ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN, ROLES.DEPARTMENT_HEAD, ROLES.DOCTOR, ROLES.PHARMACIST, ROLES.NURSE]),
  prescriptionController.getAllPrescriptions
);

// 🎯 LẤY CHI TIẾT ĐƠN THUỐC
router.get(
  '/:prescriptionId',
  requirePermission(PERMISSIONS['PRESCRIPTION.VIEW']),
  prescriptionController.getPrescription
);

// Routes cho bác sĩ
router.post(
  '/patients/:patientId/prescriptions',
  requirePermission(PERMISSIONS['PRESCRIPTION.CREATE']),
  validate(createPrescriptionValidation),
  prescriptionController.createPrescription
);

// Route kê đơn đơn giản (không cần validation phức tạp)
router.post(
  '/patients/:patientId/simple',
  requirePermission(PERMISSIONS['PRESCRIPTION.CREATE']),
  prescriptionController.createSimplePrescription
);

router.put(
  '/:prescriptionId',
  requirePermission(PERMISSIONS['PRESCRIPTION.UPDATE']),
  validate(updatePrescriptionValidation),
  prescriptionController.updatePrescription
);

router.delete(
  '/:prescriptionId/cancel',
  requirePermission(PERMISSIONS['PRESCRIPTION.UPDATE']),
  prescriptionController.cancelPrescription
);

// Routes cho dược sĩ
router.post(
  '/:prescriptionId/dispense',
  requirePermission(PERMISSIONS['PRESCRIPTION.DISPENSE']),
  validate(dispenseMedicationValidation),
  prescriptionController.dispenseMedication
);

router.get(
  '/pharmacy/orders',
  requirePermission(PERMISSIONS['PRESCRIPTION.DISPENSE']),
  prescriptionController.getPharmacyOrders
);

router.patch(
  '/:prescriptionId/dispense-status',
  requirePermission(PERMISSIONS['PRESCRIPTION.DISPENSE']),
  prescriptionController.updateDispenseStatus
);

// Routes cho y tá
router.post(
  '/patients/:patientId/medication-administration',
  requireRole([ROLES.NURSE, ROLES.DOCTOR]),
  validate(medicationAdministrationValidation),
  prescriptionController.recordMedicationAdministration
);

// Routes chung
router.get(
  '/patients/:patientId/prescriptions',
  requirePermission(PERMISSIONS['PRESCRIPTION.VIEW']),
  prescriptionController.getPatientPrescriptions
);

router.get(
  '/patients/:patientId/medication-history',
  requirePermission(PERMISSIONS['PRESCRIPTION.VIEW']),
  prescriptionController.getMedicationHistory
);

router.post(
  '/drug-interactions/check',
  requirePermission(PERMISSIONS['PRESCRIPTION.CREATE']),
  validate(checkDrugInteractionValidation),
  prescriptionController.checkDrugInteraction
);

router.get(
  '/patients/:patientId/medication-coverage/:medicationId',
  requirePermission(PERMISSIONS['PRESCRIPTION.VIEW']),
  prescriptionController.checkMedicationCoverage
);

// Routes quản lý thuốc
router.post(
  '/medications',
  requireRole([ROLES.PHARMACIST, ROLES.HOSPITAL_ADMIN]),
  prescriptionController.addMedication
);

router.get(
  '/medications/:medicationId/stock',
  requirePermission(PERMISSIONS['INVENTORY.VIEW']),
  prescriptionController.getMedicationStock
);

router.put(
  '/medications/:medicationId',
  requireRole([ROLES.PHARMACIST, ROLES.HOSPITAL_ADMIN]),
  prescriptionController.updateMedication
);

module.exports = router;