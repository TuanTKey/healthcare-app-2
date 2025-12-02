// src/controllers/doctorSchedule.controller.js
const doctorScheduleService = require('../services/doctorSchedule.service');
const { log } = require('../services/audit.service');

/**
 * [POST] /api/doctor-schedule
 * Tạo lịch làm việc cho bác sĩ
 */
async function createSchedule(req, res, next) {
  try {
    const { doctorId, date, shift, status, note } = req.body;
    const userId = req.user.sub;

    const schedule = await doctorScheduleService.createSchedule({
      doctorId,
      date: new Date(date),
      shift,
      status: status || 'AVAILABLE',
      note
    });

    await log(userId, 'CREATE_DOCTOR_SCHEDULE', { doctorId, date, shift });

    res.status(201).json({
      success: true,
      message: 'Tạo lịch làm việc thành công',
      data: schedule
    });
  } catch (err) {
    console.error('Create schedule error:', err);
    res.status(400).json({
      success: false,
      error: err.message || 'Tạo lịch làm việc thất bại'
    });
  }
}

/**
 * [GET] /api/doctor-schedule/:doctorId
 * Lấy lịch làm việc của bác sĩ
 */
async function getSchedules(req, res, next) {
  try {
    const { doctorId } = req.params;
    const { startDate, endDate } = req.query;

    let schedules;
    if (startDate && endDate) {
      schedules = await doctorScheduleService.getScheduleByRange(doctorId, startDate, endDate);
    } else {
      schedules = await doctorScheduleService.getAllSchedules(doctorId);
    }

    res.json({
      success: true,
      data: schedules
    });
  } catch (err) {
    console.error('Get schedules error:', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
}

/**
 * [PUT] /api/doctor-schedule/:scheduleId
 * Cập nhật lịch làm việc
 */
async function updateSchedule(req, res, next) {
  try {
    const { scheduleId } = req.params;
    const { status, note } = req.body;
    const userId = req.user.sub;

    const schedule = await doctorScheduleService.updateSchedule(scheduleId, {
      status,
      note,
      updatedAt: new Date()
    });

    await log(userId, 'UPDATE_DOCTOR_SCHEDULE', { scheduleId });

    res.json({
      success: true,
      message: 'Cập nhật lịch làm việc thành công',
      data: schedule
    });
  } catch (err) {
    console.error('Update schedule error:', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
}

/**
 * [DELETE] /api/doctor-schedule/:scheduleId
 * Xóa lịch làm việc
 */
async function deleteSchedule(req, res, next) {
  try {
    const { scheduleId } = req.params;
    const userId = req.user.sub;

    await doctorScheduleService.deleteSchedule(scheduleId);

    await log(userId, 'DELETE_DOCTOR_SCHEDULE', { scheduleId });

    res.json({
      success: true,
      message: 'Xóa lịch làm việc thành công'
    });
  } catch (err) {
    console.error('Delete schedule error:', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
}

module.exports = {
  createSchedule,
  getSchedules,
  updateSchedule,
  deleteSchedule
};
