const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointment.controller');
const appointmentValidation = require('../validations/appointment.validation');
const { validateBody, validateParams, validateQuery } = require('../middlewares/validation.middleware');
const { 
  requireRole, 
  requirePermission, 
  requirePatientDataAccess,
  requireModuleAccess 
} = require('../middlewares/rbac.middleware');
const { ROLES, PERMISSIONS } = require('../constants/roles');
const { authenticate } = require('../middlewares/auth.middleware');

// 🚨 IMPORT MỌI CONTROLLER CẦN THIẾT
const medicalRecordController = require('../controllers/medicalRecord.controller');
const medicalRecordValidation = require('../validations/medicalRecord.validation');

/**
 * APPOINTMENT ROUTES
 * Quản lý tất cả endpoints liên quan đến lịch hẹn
 */

// APPLY AUTH MIDDLEWARE CHO TẤT CẢ ROUTES
router.use(authenticate);

/**
 * ⚠️ ROUTE ORDER MATTERS IN EXPRESS!
 * SPECIFIC ROUTES PHẢI ĐẶT TRƯỚC GENERIC ROUTES
 */

// ========================
// 📍 SPECIFIC ROUTES (PHẢI ĐẶT TRƯỚC)
// ========================

// 🎯 TẠO LỊCH LÀM VIỆC
router.post(
  '/schedules',
  requireRole(ROLES.DOCTOR, ROLES.HOSPITAL_ADMIN, ROLES.DEPARTMENT_HEAD),
  requirePermission(PERMISSIONS['APPOINTMENT.CREATE']),
  validateBody(appointmentValidation.createSchedule),
  appointmentController.createSchedule
);

// 🎯 LẤY LỊCH LÀM VIỆC CỦA BÁC SĨ
router.get(
  '/schedules/doctor/:doctorId',
  requireRole(ROLES.DOCTOR, ROLES.NURSE, ROLES.RECEPTIONIST, ROLES.HOSPITAL_ADMIN),
  requirePermission(PERMISSIONS['APPOINTMENT.VIEW_SCHEDULE']),
  validateQuery(appointmentValidation.getDoctorSchedule),
  appointmentController.getDoctorSchedule
);

// 🎯 CẬP NHẬT LỊCH LÀM VIỆC
router.put(
  '/schedules/:scheduleId',
  requireRole(ROLES.DOCTOR, ROLES.HOSPITAL_ADMIN, ROLES.DEPARTMENT_HEAD),
  requirePermission(PERMISSIONS['APPOINTMENT.UPDATE']),
  validateBody(appointmentValidation.updateSchedule),
  appointmentController.updateSchedule
);

// 🎯 TÌM KIẾM LỊCH HẸN NÂNG CAO
router.get(
  '/search/advanced',
  requireRole(ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.HOSPITAL_ADMIN, ROLES.DEPARTMENT_HEAD),
  requirePermission(PERMISSIONS['APPOINTMENT.VIEW']),
  validateQuery(appointmentValidation.searchAppointments),
  appointmentController.searchAppointments
);

// 🎯 TÌM KIẾM HỒ SƠ THEO CHẨN ĐOÁN
router.get(
  '/search/diagnosis',
  requireRole(ROLES.DOCTOR, ROLES.HOSPITAL_ADMIN),
  requirePermission(PERMISSIONS['MEDICAL.VIEW_RECORDS']),
  validateQuery(medicalRecordValidation.searchByDiagnosis),
  medicalRecordController.searchMedicalRecordsByDiagnosis
);

// 🎯 THỐNG KÊ LỊCH HẸN
router.get(
  '/stats/overview',
  requireRole(ROLES.DOCTOR, ROLES.HOSPITAL_ADMIN, ROLES.DEPARTMENT_HEAD, ROLES.SUPER_ADMIN),
  requirePermission(PERMISSIONS['REPORT.VIEW']),
  appointmentController.getAppointmentsStats
);

// 🎯 LẤY LỊCH HẸN THEO DEPARTMENT
router.get(
  '/department/:departmentId',
  requireRole(ROLES.DEPARTMENT_HEAD, ROLES.HOSPITAL_ADMIN, ROLES.DOCTOR),
  requirePermission(PERMISSIONS['APPOINTMENT.VIEW']),
  validateQuery(appointmentValidation.getDoctorSchedule),
  appointmentController.getDepartmentAppointments
);

// 🎯 GỬI NHẮC NHỞ TỰ ĐỘNG (ADMIN ONLY)
router.post(
  '/reminders/send-scheduled',
  requireRole(ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN),
  requirePermission(PERMISSIONS['SYSTEM.CONFIG']),
  appointmentController.sendScheduledReminders
);

// ========================
// 📍 PATIENT-SPECIFIC ROUTES
// ========================

// 🎯 LẤY LỊCH SỬ PHẪU THUẬT
router.get(
  '/patient/:patientId/surgical-history',
  requireRole(ROLES.DOCTOR, ROLES.NURSE, ROLES.HOSPITAL_ADMIN),
  requirePermission(PERMISSIONS['MEDICAL.VIEW_RECORDS']),
  requirePatientDataAccess('patientId'),
  medicalRecordController.getSurgicalHistory
);

// 🎯 LẤY TIỀN SỬ SẢN KHOA
router.get(
  '/patient/:patientId/obstetric-history',
  requireRole(ROLES.DOCTOR, ROLES.NURSE, ROLES.HOSPITAL_ADMIN),
  requirePermission(PERMISSIONS['MEDICAL.VIEW_RECORDS']),
  requirePatientDataAccess('patientId'),
  medicalRecordController.getObstetricHistory
);

// 🎯 THÊM THÔNG TIN PHẪU THUẬT
router.post(
  '/patient/:patientId/surgical-history',
  requireRole(ROLES.DOCTOR),
  requirePermission(PERMISSIONS['MEDICAL.UPDATE_RECORDS']),
  requirePatientDataAccess('patientId'),
  validateBody(medicalRecordValidation.addSurgicalHistory),
  medicalRecordController.addSurgicalHistory
);

// 🎯 LẤY LỊCH HẸN CỦA BỆNH NHÂN
router.get(
  '/patient/:patientId',
  requireRole(ROLES.DOCTOR, ROLES.NURSE, ROLES.RECEPTIONIST, ROLES.HOSPITAL_ADMIN, ROLES.PATIENT),
  requirePermission(PERMISSIONS['APPOINTMENT.VIEW']),
  requirePatientDataAccess('patientId'),
  validateQuery(appointmentValidation.getPatientAppointments),
  appointmentController.getPatientAppointments
);

// ========================
// 📍 DOCTOR-SPECIFIC ROUTES
// ========================

// 🎯 LẤY LỊCH HẸN CỦA BÁC SĨ
router.get(
  '/doctor/:doctorId',
  requireRole(ROLES.DOCTOR, ROLES.NURSE, ROLES.RECEPTIONIST, ROLES.HOSPITAL_ADMIN, ROLES.DEPARTMENT_HEAD),
  requirePermission(PERMISSIONS['APPOINTMENT.VIEW']),
  validateQuery(appointmentValidation.getDoctorAppointments),
  appointmentController.getDoctorAppointments
);

// ========================
// 📍 APPOINTMENT ID ROUTES (PHẢI TRƯỚC GENERIC ROOT ROUTES)
// ========================

// 🎯 LẤY THÔNG TIN LỊCH HẸN CHI TIẾT
router.get(
  '/:appointmentId',
  requireRole(ROLES.DOCTOR, ROLES.NURSE, ROLES.RECEPTIONIST, ROLES.HOSPITAL_ADMIN, ROLES.PATIENT),
  requirePermission(PERMISSIONS['APPOINTMENT.VIEW']),
  appointmentController.getAppointment
);

// 🎯 CẬP NHẬT LỊCH HẸN
router.put(
  '/:appointmentId',
  requireRole(ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.HOSPITAL_ADMIN),
  requirePermission(PERMISSIONS['APPOINTMENT.UPDATE']),
  validateBody(appointmentValidation.updateAppointment),
  appointmentController.updateAppointment
);

// 🎯 HỦY LỊCH HẸN
router.post(
  '/:appointmentId/cancel',
  requireRole(ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.PATIENT, ROLES.HOSPITAL_ADMIN),
  requirePermission(PERMISSIONS['APPOINTMENT.CANCEL']),
  validateBody(appointmentValidation.cancelAppointment),
  appointmentController.cancelAppointment
);

// 🎯 ĐẶT LẠI LỊCH HẸN
router.post(
  '/:appointmentId/reschedule',
  requireRole(ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.PATIENT, ROLES.HOSPITAL_ADMIN),
  requirePermission(PERMISSIONS['APPOINTMENT.UPDATE']),
  validateBody(appointmentValidation.rescheduleAppointment),
  appointmentController.rescheduleAppointment
);

// 🎯 GỬI THÔNG BÁO NHẮC LỊCH HẸN
router.post(
  '/:appointmentId/remind',
  requireRole(ROLES.RECEPTIONIST, ROLES.HOSPITAL_ADMIN),
  requirePermission(PERMISSIONS['APPOINTMENT.UPDATE']),
  validateBody(appointmentValidation.sendReminder),
  appointmentController.sendAppointmentReminder
);

// ========================
// 📍 GENERIC ROUTES (PHẢI ĐẶT CUỐI CÙNG!)
// ========================

// 🎯 LẤY DANH SÁCH TẤT CẢ LỊCH HẸN (ADMIN DASHBOARD)
router.get(
  '/',
  requireRole(ROLES.HOSPITAL_ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR, ROLES.SUPER_ADMIN),
  requirePermission(PERMISSIONS['APPOINTMENT.VIEW']),
  // Remove validation - all fields are optional with defaults
  appointmentController.getAllAppointments
);

// 🎯 TẠO LỊCH HẸN MỚI
router.post(
  '/',
  requireRole(ROLES.RECEPTIONIST, ROLES.DOCTOR, ROLES.PATIENT, ROLES.HOSPITAL_ADMIN),
  requirePermission(PERMISSIONS['APPOINTMENT.CREATE']),
  validateBody(appointmentValidation.createAppointment),
  appointmentController.createAppointment
);

// 🎯 GHI NHẬN PHÁT HIỆN LÂM SÀNG
router.post(
  '/clinical-findings',
  requireRole(ROLES.DOCTOR),
  requirePermission(PERMISSIONS['MEDICAL.CREATE_RECORDS']),
  validateBody(medicalRecordValidation.recordClinicalFindings),
  medicalRecordController.recordClinicalFindings
);

// ========================
// 📍 EXAMPLE ROUTE FOR PAGINATION RESPONSE STRUCTURE
// ========================

// 🎯 LẤY DANH SÁCH LỊCH HẸN VỚI PHÂN TRANG
router.get(
  '/paginated',
  requireRole(ROLES.HOSPITAL_ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR),
  requirePermission(PERMISSIONS['APPOINTMENT.VIEW']),
  validateQuery(appointmentValidation.getPatientAppointments),
  async (req, res) => {
    try {
      const appointments = await appointmentController.getPatientAppointments(req, res);
      const total = appointments.length; // Tổng số bản ghi
      const limit = req.query.limit ? parseInt(req.query.limit) : 10; // Số bản ghi trên mỗi trang
      const page = req.query.page ? parseInt(req.query.page) : 1; // Trang hiện tại

      // Tính toán phân trang
      const totalPages = Math.ceil(total / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      // Cắt danh sách lịch hẹn theo trang
      const paginatedAppointments = appointments.slice((page - 1) * limit, page * limit);

      return res.json({
        success: true,
        data: {
          data: paginatedAppointments, // Danh sách lịch hẹn của trang hiện tại
          pagination: {
            total,
            page,
            limit,
            totalPages,
            hasNext,
            hasPrev
          }
        }
      });
    } catch (error) {
      console.error('Error fetching paginated appointments:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

module.exports = router;
