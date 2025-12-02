// src/services/feedback.service.js
const Feedback = require('../models/feedback.model');

/**
 * Tạo feedback từ bệnh nhân
 */
async function createFeedback(data) {
  const feedback = new Feedback(data);
  await feedback.save();
  return feedback.populate([
    { path: 'appointmentId' },
    { path: 'patientId' },
    { path: 'doctorId', select: 'email name' }
  ]);
}

/**
 * Lấy tất cả feedback
 */
async function getAllFeedback(filter = {}) {
  return Feedback.find(filter)
    .populate([
      { path: 'appointmentId' },
      { path: 'patientId' },
      { path: 'doctorId', select: 'email name' }
    ])
    .sort({ createdAt: -1 });
}

/**
 * Lấy feedback theo ID
 */
async function getFeedbackById(feedbackId) {
  return Feedback.findById(feedbackId).populate([
    { path: 'appointmentId' },
    { path: 'patientId' },
    { path: 'doctorId', select: 'email name' }
  ]);
}

/**
 * Lấy feedback của bác sĩ
 */
async function getFeedbackByDoctor(doctorId) {
  return Feedback.find({ doctorId, status: 'APPROVED' })
    .populate([
      { path: 'patientId' },
      { path: 'appointmentId' }
    ])
    .sort({ createdAt: -1 });
}

/**
 * Cập nhật feedback (phê duyệt/từ chối)
 */
async function updateFeedback(feedbackId, data) {
  return Feedback.findByIdAndUpdate(feedbackId, data, { new: true }).populate([
    { path: 'appointmentId' },
    { path: 'patientId' },
    { path: 'doctorId', select: 'email name' }
  ]);
}

/**
 * Xóa feedback
 */
async function deleteFeedback(feedbackId) {
  return Feedback.findByIdAndDelete(feedbackId);
}

/**
 * Lấy thống kê đánh giá bác sĩ
 */
async function getDoctorStats(doctorId) {
  const feedbacks = await Feedback.find({ 
    doctorId, 
    status: 'APPROVED' 
  });

  if (feedbacks.length === 0) {
    return {
      totalReviews: 0,
      averageRating: 0,
      categories: {}
    };
  }

  const totalRating = feedbacks.reduce((sum, f) => sum + f.rating, 0);
  const avgRating = (totalRating / feedbacks.length).toFixed(1);

  const categories = {
    avgServiceQuality: feedbacks.reduce((sum, f) => sum + (f.categories?.serviceQuality || 0), 0) / feedbacks.length,
    avgDoctorAttitude: feedbacks.reduce((sum, f) => sum + (f.categories?.doctorAttitude || 0), 0) / feedbacks.length,
    avgClinicCleanliness: feedbacks.reduce((sum, f) => sum + (f.categories?.clinicCleanliness || 0), 0) / feedbacks.length,
    avgValueForMoney: feedbacks.reduce((sum, f) => sum + (f.categories?.valueForMoney || 0), 0) / feedbacks.length
  };

  return {
    totalReviews: feedbacks.length,
    averageRating: avgRating,
    categories
  };
}

module.exports = {
  createFeedback,
  getAllFeedback,
  getFeedbackById,
  getFeedbackByDoctor,
  updateFeedback,
  deleteFeedback,
  getDoctorStats
};
