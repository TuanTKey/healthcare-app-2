// src/services/doctorSchedule.service.js
const DoctorSchedule = require('../models/doctorSchedule.model');

/**
 * Tạo lịch làm việc bác sĩ
 */
async function createSchedule(data) {
  const schedule = new DoctorSchedule(data);
  await schedule.save();
  return schedule.populate('doctorId', 'email name');
}

/**
 * Lấy lịch của bác sĩ theo ngày
 */
async function getScheduleByDate(doctorId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return DoctorSchedule.find({
    doctorId,
    date: { $gte: startOfDay, $lte: endOfDay }
  }).populate('doctorId', 'email name');
}

/**
 * Lấy lịch của bác sĩ trong khoảng thời gian
 */
async function getScheduleByRange(doctorId, startDate, endDate) {
  return DoctorSchedule.find({
    doctorId,
    date: { $gte: new Date(startDate), $lte: new Date(endDate) }
  }).populate('doctorId', 'email name').sort({ date: 1 });
}

/**
 * Cập nhật lịch làm việc
 */
async function updateSchedule(scheduleId, data) {
  const schedule = await DoctorSchedule.findByIdAndUpdate(
    scheduleId,
    data,
    { new: true }
  ).populate('doctorId', 'email name');
  return schedule;
}

/**
 * Xóa lịch làm việc
 */
async function deleteSchedule(scheduleId) {
  return DoctorSchedule.findByIdAndDelete(scheduleId);
}

/**
 * Lấy tất cả lịch của bác sĩ
 */
async function getAllSchedules(doctorId) {
  return DoctorSchedule.find({ doctorId })
    .populate('doctorId', 'email name')
    .sort({ date: -1 });
}

/**
 * Kiểm tra bác sĩ có làm việc vào ca này không
 */
async function isAvailable(doctorId, date, shift) {
  const schedule = await DoctorSchedule.findOne({
    doctorId,
    date: new Date(date),
    shift,
    status: 'AVAILABLE'
  });
  return !!schedule;
}

module.exports = {
  createSchedule,
  getScheduleByDate,
  getScheduleByRange,
  updateSchedule,
  deleteSchedule,
  getAllSchedules,
  isAvailable
};
