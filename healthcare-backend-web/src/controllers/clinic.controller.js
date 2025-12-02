// src/controllers/clinic.controller.js
const clinicService = require('../services/clinic.service');
const { log } = require('../services/audit.service');

/**
 * [POST] /api/clinic
 * Tạo phòng khám
 */
async function createClinic(req, res, next) {
  try {
    const { name, description, location, capacity } = req.body;
    const userId = req.user.sub;

    const clinic = await clinicService.createClinic({
      name,
      description,
      location,
      capacity
    });

    await log(userId, 'CREATE_CLINIC', { name });

    res.status(201).json({
      success: true,
      message: 'Tạo phòng khám thành công',
      data: clinic
    });
  } catch (err) {
    console.error('Create clinic error:', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
}

/**
 * [GET] /api/clinic
 * Lấy tất cả phòng khám
 */
async function getAllClinics(req, res, next) {
  try {
    const clinics = await clinicService.getAllClinics();

    res.json({
      success: true,
      data: clinics
    });
  } catch (err) {
    console.error('Get clinics error:', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
}

/**
 * [GET] /api/clinic/available
 * Lấy phòng khám khả dụng
 */
async function getAvailableClinics(req, res, next) {
  try {
    const clinics = await clinicService.getAvailableClinics();

    res.json({
      success: true,
      data: clinics
    });
  } catch (err) {
    console.error('Get available clinics error:', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
}

/**
 * [GET] /api/clinic/:clinicId
 * Lấy chi tiết phòng khám
 */
async function getClinicById(req, res, next) {
  try {
    const { clinicId } = req.params;
    const clinic = await clinicService.getClinicById(clinicId);

    if (!clinic) {
      return res.status(404).json({
        success: false,
        error: 'Phòng khám không tồn tại'
      });
    }

    res.json({
      success: true,
      data: clinic
    });
  } catch (err) {
    console.error('Get clinic error:', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
}

/**
 * [PUT] /api/clinic/:clinicId
 * Cập nhật phòng khám
 */
async function updateClinic(req, res, next) {
  try {
    const { clinicId } = req.params;
    const { name, description, location, capacity, status } = req.body;
    const userId = req.user.sub;

    const clinic = await clinicService.updateClinic(clinicId, {
      name,
      description,
      location,
      capacity,
      status,
      updatedAt: new Date()
    });

    await log(userId, 'UPDATE_CLINIC', { clinicId });

    res.json({
      success: true,
      message: 'Cập nhật phòng khám thành công',
      data: clinic
    });
  } catch (err) {
    console.error('Update clinic error:', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
}

/**
 * [DELETE] /api/clinic/:clinicId
 * Xóa phòng khám
 */
async function deleteClinic(req, res, next) {
  try {
    const { clinicId } = req.params;
    const userId = req.user.sub;

    await clinicService.deleteClinic(clinicId);

    await log(userId, 'DELETE_CLINIC', { clinicId });

    res.json({
      success: true,
      message: 'Xóa phòng khám thành công'
    });
  } catch (err) {
    console.error('Delete clinic error:', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
}

module.exports = {
  createClinic,
  getAllClinics,
  getAvailableClinics,
  getClinicById,
  updateClinic,
  deleteClinic
};
