// src/controllers/feedback.controller.js
const feedbackService = require('../services/feedback.service');
const { log } = require('../services/audit.service');

/**
 * [POST] /api/feedback
 * Tạo feedback từ bệnh nhân
 */
async function createFeedback(req, res, next) {
  try {
    const { appointmentId, patientId, doctorId, rating, comment, categories } = req.body;
    const userId = req.user.sub;

    const feedback = await feedbackService.createFeedback({
      appointmentId,
      patientId,
      doctorId,
      rating,
      comment,
      categories,
      status: 'PENDING'
    });

    await log(userId, 'CREATE_FEEDBACK', { appointmentId, doctorId });

    res.status(201).json({
      success: true,
      message: 'Gửi đánh giá thành công, chờ phê duyệt',
      data: feedback
    });
  } catch (err) {
    console.error('Create feedback error:', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
}

/**
 * [GET] /api/feedback
 * Lấy tất cả feedback (admin)
 */
async function getAllFeedback(req, res, next) {
  try {
    const { status, doctorId } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (doctorId) filter.doctorId = doctorId;

    const feedbacks = await feedbackService.getAllFeedback(filter);

    res.json({
      success: true,
      data: feedbacks
    });
  } catch (err) {
    console.error('Get feedback error:', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
}

/**
 * [GET] /api/feedback/doctor/:doctorId
 * Lấy feedback của bác sĩ
 */
async function getFeedbackByDoctor(req, res, next) {
  try {
    const { doctorId } = req.params;

    const feedbacks = await feedbackService.getFeedbackByDoctor(doctorId);
    const stats = await feedbackService.getDoctorStats(doctorId);

    res.json({
      success: true,
      data: {
        feedbacks,
        stats
      }
    });
  } catch (err) {
    console.error('Get doctor feedback error:', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
}

/**
 * [GET] /api/feedback/:feedbackId
 * Lấy chi tiết feedback
 */
async function getFeedbackById(req, res, next) {
  try {
    const { feedbackId } = req.params;
    const feedback = await feedbackService.getFeedbackById(feedbackId);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        error: 'Feedback không tồn tại'
      });
    }

    res.json({
      success: true,
      data: feedback
    });
  } catch (err) {
    console.error('Get feedback error:', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
}

/**
 * [PUT] /api/feedback/:feedbackId
 * Phê duyệt/từ chối feedback (admin)
 */
async function updateFeedback(req, res, next) {
  try {
    const { feedbackId } = req.params;
    const { status } = req.body;
    const userId = req.user.sub;

    const feedback = await feedbackService.updateFeedback(feedbackId, {
      status,
      updatedAt: new Date()
    });

    await log(userId, 'UPDATE_FEEDBACK', { feedbackId, status });

    res.json({
      success: true,
      message: 'Cập nhật feedback thành công',
      data: feedback
    });
  } catch (err) {
    console.error('Update feedback error:', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
}

/**
 * [DELETE] /api/feedback/:feedbackId
 * Xóa feedback
 */
async function deleteFeedback(req, res, next) {
  try {
    const { feedbackId } = req.params;
    const userId = req.user.sub;

    await feedbackService.deleteFeedback(feedbackId);

    await log(userId, 'DELETE_FEEDBACK', { feedbackId });

    res.json({
      success: true,
      message: 'Xóa feedback thành công'
    });
  } catch (err) {
    console.error('Delete feedback error:', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
}

module.exports = {
  createFeedback,
  getAllFeedback,
  getFeedbackByDoctor,
  getFeedbackById,
  updateFeedback,
  deleteFeedback
};
