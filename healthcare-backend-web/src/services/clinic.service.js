// src/services/clinic.service.js
const Clinic = require('../models/clinic.model');

/**
 * Tạo phòng khám
 */
async function createClinic(data) {
  const clinic = new Clinic(data);
  await clinic.save();
  return clinic;
}

/**
 * Lấy tất cả phòng khám
 */
async function getAllClinics() {
  return Clinic.find().sort({ createdAt: -1 });
}

/**
 * Lấy phòng khám theo ID
 */
async function getClinicById(clinicId) {
  return Clinic.findById(clinicId);
}

/**
 * Cập nhật phòng khám
 */
async function updateClinic(clinicId, data) {
  return Clinic.findByIdAndUpdate(clinicId, data, { new: true });
}

/**
 * Xóa phòng khám
 */
async function deleteClinic(clinicId) {
  return Clinic.findByIdAndDelete(clinicId);
}

/**
 * Lấy phòng khám khả dụng (không đang bảo trì)
 */
async function getAvailableClinics() {
  return Clinic.find({ status: { $ne: 'MAINTENANCE' } });
}

module.exports = {
  createClinic,
  getAllClinics,
  getClinicById,
  updateClinic,
  deleteClinic,
  getAvailableClinics
};
