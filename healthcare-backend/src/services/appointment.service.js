const Appointment = require('../models/appointment.model');
const User = require('../models/user.model');
const { AppError, ERROR_CODES } = require('../middlewares/error.middleware');
const { generateMedicalCode } = require('../utils/healthcare.utils');

class AppointmentService {
  
  async createAppointment(appointmentData) {
    try {
      console.log('📅 [SERVICE] Creating appointment');
      console.log('📋 [SERVICE] Appointment data:', JSON.stringify({
        ...appointmentData,
        appointmentDate: appointmentData.appointmentDate?.toString?.() || appointmentData.appointmentDate
      }));

      // If no doctorId provided, find first active doctor
      if (!appointmentData.doctorId) {
        const firstDoctor = await User.findOne({ 
          role: 'DOCTOR',
          status: 'ACTIVE'
        });
        
        if (!firstDoctor) {
          throw new AppError('Không có bác sĩ nào khả dụng', 404, 'NO_DOCTORS_AVAILABLE');
        }
        
        appointmentData.doctorId = firstDoctor._id;
        console.log('📋 [SERVICE] Assigned doctor:', firstDoctor._id);
      }

      // Validate doctor exists and is active
      const doctor = await User.findOne({ 
        _id: appointmentData.doctorId, 
        role: 'DOCTOR',
        status: 'ACTIVE'
      });
      
      if (!doctor) {
        throw new AppError('Không tìm thấy bác sĩ hoặc bác sĩ không hoạt động', 404, 'DOCTOR_NOT_FOUND');
      }

      // Validate patient exists
      const patient = await User.findOne({ 
        _id: appointmentData.patientId, 
        role: 'PATIENT',
        status: 'ACTIVE'
      });
      
      if (!patient) {
        throw new AppError('Không tìm thấy bệnh nhân', 404, 'PATIENT_NOT_FOUND');
      }

      // Check for scheduling conflicts - wrap in try-catch
      try {
        const conflictingAppointment = await this.checkSchedulingConflict(
          appointmentData.doctorId, 
          appointmentData.appointmentDate,
          appointmentData.duration
        );

        if (conflictingAppointment) {
          throw new AppError('Bác sĩ đã có lịch hẹn trong khoảng thời gian này', 400, 'SCHEDULING_CONFLICT');
        }
      } catch (conflictError) {
        if (conflictError.statusCode) throw conflictError; // Re-throw AppError
        console.warn('⚠️ [SERVICE] Warning during conflict check:', conflictError.message);
        // Continue if it's just a date parsing issue
      }

      // Generate appointment ID
      const appointmentId = await this.generateAppointmentId();

      const appointment = new Appointment({
        ...appointmentData,
        appointmentId,
        status: 'SCHEDULED'
      });

      console.log('💾 [SERVICE] Saving appointment to database...');
      await appointment.save();
      console.log('✅ [SERVICE] Appointment saved successfully:', appointment._id);

      return await this.populateAppointment(appointment._id);

    } catch (error) {
      console.error('❌ [SERVICE] Appointment creation failed:', error.message);
      console.error('❌ [SERVICE] Error details:', error.stack);
      throw error;
    }
  }

  async checkSchedulingConflict(doctorId, appointmentDate, duration = 30) {
    try {
      // Safely convert appointmentDate to Date object
      let appointmentTime;
      
      if (appointmentDate instanceof Date) {
        appointmentTime = appointmentDate;
      } else if (typeof appointmentDate === 'string') {
        // Parse ISO string or timestamp
        appointmentTime = new Date(appointmentDate);
      } else if (typeof appointmentDate === 'number') {
        // Handle timestamp
        appointmentTime = new Date(appointmentDate);
      } else {
        console.warn('⚠️ Invalid date format:', appointmentDate);
        return null;
      }

      // Validate the date is valid
      if (isNaN(appointmentTime.getTime())) {
        console.warn('⚠️ Invalid date after parsing:', appointmentDate);
        return null;
      }

      const endTime = new Date(appointmentTime.getTime() + duration * 60000);

      return await Appointment.findOne({
        doctorId,
        appointmentDate: {
          $gte: appointmentTime,
          $lt: endTime
        },
        status: { $in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] }
      });
    } catch (error) {
      console.error('❌ Error checking scheduling conflict:', error.message);
      // Return null to not block appointment if there's an error
      return null;
    }
  }

  async generateAppointmentId() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `AP${timestamp}${random}`;
  }

  async populateAppointment(appointmentId) {
    return await Appointment.findById(appointmentId)
      .populate('patientId', 'personalInfo email phone')
      .populate('doctorId', 'personalInfo email professionalInfo')
      .populate('createdBy', 'personalInfo email');
  }

  async getAppointmentsByUser(userId, userRole, filters = {}) {
    try {
      const { page = 1, limit = 10, status, startDate, endDate } = filters;
      const skip = (page - 1) * limit;

      let query = {};
      
      if (userRole === 'PATIENT') {
        query.patientId = userId;
      } else if (userRole === 'DOCTOR') {
        query.doctorId = userId;
      }

      if (status) query.status = status;
      
      if (startDate && endDate) {
        query.appointmentDate = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      const [appointments, total] = await Promise.all([
        Appointment.find(query)
          .populate('patientId', 'personalInfo email phone')
          .populate('doctorId', 'personalInfo email professionalInfo')
          .sort({ appointmentDate: -1 })
          .skip(skip)
          .limit(limit),
        Appointment.countDocuments(query)
      ]);

      return {
        appointments,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      };

    } catch (error) {
      console.error('❌ [SERVICE] Get appointments failed:', error.message);
      throw error;
    }
  }

  async updateAppointmentStatus(appointmentId, status, updatedBy, metadata = {}) {
    try {
      const appointment = await Appointment.findOne({ appointmentId });
      
      if (!appointment) {
        throw new AppError('Không tìm thấy lịch hẹn', 404, 'APPOINTMENT_NOT_FOUND');
      }

      const validTransitions = {
        'SCHEDULED': ['CONFIRMED', 'CANCELLED'],
        'CONFIRMED': ['IN_PROGRESS', 'CANCELLED'],
        'IN_PROGRESS': ['COMPLETED', 'CANCELLED'],
        'COMPLETED': [],
        'CANCELLED': []
      };

      if (!validTransitions[appointment.status]?.includes(status)) {
        throw new AppError(`Không thể chuyển từ ${appointment.status} sang ${status}`, 400, 'INVALID_STATUS_TRANSITION');
      }

      appointment.status = status;
      
      // Handle specific status updates
      if (status === 'IN_PROGRESS') {
        appointment.actualStartTime = new Date();
      } else if (status === 'COMPLETED') {
        appointment.actualEndTime = new Date();
      } else if (status === 'CANCELLED') {
        appointment.cancellation = {
          cancelledBy: updatedBy,
          cancellationDate: new Date(),
          reason: metadata.reason || '',
          notes: metadata.notes || ''
        };
      }

      await appointment.save();
      return await this.populateAppointment(appointment._id);

    } catch (error) {
      console.error('❌ [SERVICE] Update appointment status failed:', error.message);
      throw error;
    }
  }

  async getAppointmentStatistics(doctorId, startDate, endDate) {
    try {
      const matchStage = {
        appointmentDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };

      if (doctorId) {
        matchStage.doctorId = doctorId;
      }

      const stats = await Appointment.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalDuration: { $sum: '$duration' }
          }
        },
        {
          $group: {
            _id: null,
            statusCounts: {
              $push: {
                status: '$_id',
                count: '$count'
              }
            },
            totalAppointments: { $sum: '$count' },
            averageDuration: { $avg: '$totalDuration' }
          }
        }
      ]);

      return stats[0] || {
        statusCounts: [],
        totalAppointments: 0,
        averageDuration: 0
      };

    } catch (error) {
      console.error('❌ [SERVICE] Get appointment statistics failed:', error.message);
      throw error;
    }
  }

  /**
   * 🎯 ĐẶT LẠI LỊCH HẸN
   */
  async rescheduleAppointment(appointmentId, newTime, rescheduledBy) {
    try {
      console.log('🔄 [SERVICE] Rescheduling appointment:', appointmentId);

      const appointment = await Appointment.findOne({ appointmentId });
      
      if (!appointment) {
        throw new AppError('Không tìm thấy lịch hẹn', 404, ERROR_CODES.APPOINTMENT_NOT_FOUND);
      }

      // 🎯 KIỂM TRA TRẠNG THÁI CÓ THỂ ĐẶT LẠI
      if (!['SCHEDULED', 'CONFIRMED'].includes(appointment.status)) {
        throw new AppError('Chỉ có thể đặt lại lịch hẹn đang chờ hoặc đã xác nhận', 400);
      }

      // 🎯 KIỂM TRA TRÙNG LỊCH MỚI
      const conflictingAppointment = await Appointment.findOne({
        doctorId: appointment.doctorId,
        appointmentDate: {
          $gte: new Date(newTime),
          $lt: new Date(new Date(newTime).getTime() + appointment.duration * 60000)
        },
        status: { $in: ['SCHEDULED', 'CONFIRMED'] },
        appointmentId: { $ne: appointmentId }
      });

      if (conflictingAppointment) {
        throw new AppError('Bác sĩ đã có lịch hẹn trong khoảng thời gian mới', 400);
      }

      // 🎯 LƯU THÔNG TIN CŨ ĐỂ AUDIT
      const oldTime = appointment.appointmentDate;

      // 🎯 CẬP NHẬT THỜI GIAN MỚI
      appointment.appointmentDate = newTime;
      appointment.status = 'RESCHEDULED';
      await appointment.save();

      // 🎯 GỬI EMAIL THÔNG BÁO
      try {
        const patient = await User.findById(appointment.patientId);
        const doctor = await User.findById(appointment.doctorId);
        
        await EmailService.sendAppointmentRescheduledEmail({
          patient,
          doctor,
          appointment,
          oldTime,
          newTime
        });
      } catch (emailError) {
        console.error('❌ [SERVICE] Failed to send reschedule email:', emailError.message);
      }

      // 🎯 LẤY KẾT QUẢ MỚI NHẤT
      const rescheduledAppointment = await Appointment.findOne({ appointmentId })
        .populate('patientId', 'name email phone')
        .populate('doctorId', 'name email specialization');

      console.log('✅ [SERVICE] Appointment rescheduled:', appointmentId);
      return rescheduledAppointment;

    } catch (error) {
      console.error('❌ [SERVICE] Reschedule appointment failed:', error.message);
      throw error;
    }
  }

  /**
   * 🎯 TÌM KIẾM LỊCH HẸN NÂNG CAO
   */
  async searchAppointments(filters) {
    try {
      const {
        patientId,
        doctorId,
        department,
        status,
        type,
        dateFrom,
        dateTo,
        page = 1,
        limit = 20,
        sortBy = 'appointmentDate',
        sortOrder = 'desc'
      } = filters;

      console.log('🔍 [SERVICE] Searching appointments with filters:', filters);

      // 🎯 BUILD QUERY
      let query = {};

      if (patientId) query.patientId = patientId;
      if (doctorId) query.doctorId = doctorId;
      if (status) query.status = status;
      if (type) query.type = type;

      // 🎯 FILTER THEO THỜI GIAN
      if (dateFrom || dateTo) {
        query.appointmentDate = {};
        if (dateFrom) query.appointmentDate.$gte = new Date(dateFrom);
        if (dateTo) query.appointmentDate.$lte = new Date(dateTo);
      }

      // 🎯 FILTER THEO DEPARTMENT
      if (department) {
        const doctorsInDept = await User.find({ 
          role: 'DOCTOR', 
          'professionalInfo.department': department 
        }).select('_id');
        
        const doctorIds = doctorsInDept.map(doc => doc._id);
        query.doctorId = { $in: doctorIds };
      }

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      // 🎯 THỰC HIỆN TÌM KIẾM
      const [appointments, total] = await Promise.all([
        Appointment.find(query)
          .populate('patientId', 'name email phone dateOfBirth gender')
          .populate('doctorId', 'name email specialization department professionalInfo')
          .sort(sort)
          .skip(skip)
          .limit(limit),
        Appointment.countDocuments(query)
      ]);

      // 🎯 TÍNH TOÁN PHÂN TRANG
      const totalPages = Math.ceil(total / limit);

      return {
        appointments,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        filters: {
          patientId,
          doctorId,
          department,
          status,
          type,
          dateFrom,
          dateTo
        }
      };

    } catch (error) {
      console.error('❌ [SERVICE] Search appointments failed:', error.message);
      throw error;
    }
  }

  /**
   * 🎯 LẤY LỊCH HẸN THEO DEPARTMENT
   */
  async getDepartmentAppointments(departmentId, date) {
    try {
      console.log('🏥 [SERVICE] Getting department appointments:', departmentId, date);

      // 🎯 TÌM TẤT CẢ BÁC SĨ TRONG DEPARTMENT
      const doctors = await User.find({ 
        role: 'DOCTOR',
        'professionalInfo.department': departmentId,
        isActive: true
      }).select('_id name email specialization');

      const doctorIds = doctors.map(doctor => doctor._id);

      // 🎯 BUILD QUERY
      let query = { 
        doctorId: { $in: doctorIds },
        status: { $in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] }
      };

      if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        query.appointmentDate = {
          $gte: startOfDay,
          $lte: endOfDay
        };
      }

      // 🎯 LẤY LỊCH HẸN
      const appointments = await Appointment.find(query)
        .populate('patientId', 'name email phone dateOfBirth gender')
        .populate('doctorId', 'name email specialization')
        .sort({ appointmentDate: 1 });

      // 🎯 NHÓM THEO BÁC SĨ
      const appointmentsByDoctor = {};
      doctors.forEach(doctor => {
        appointmentsByDoctor[doctor._id] = {
          doctor,
          appointments: appointments.filter(apt => 
            apt.doctorId._id.toString() === doctor._id.toString()
          )
        };
      });

      return {
        departmentId,
        date: date || new Date().toISOString().split('T')[0],
        doctors,
        appointmentsByDoctor,
        totalAppointments: appointments.length
      };

    } catch (error) {
      console.error('❌ [SERVICE] Get department appointments failed:', error.message);
      throw error;
    }
  }

  /**
   * 🎯 CẬP NHẬT LỊCH LÀM VIỆC
   */
  async updateSchedule(scheduleId, updateData, updatedBy) {
    try {
      console.log('📋 [SERVICE] Updating schedule:', scheduleId);

      // 🎯 TRONG THỰC TẾ SẼ CÓ MODEL SCHEDULE RIÊNG
      // Ở đây tạm thời xử lý logic cập nhật các appointment liên quan
      
      const { doctorId, date, changes } = updateData;

      // 🎯 KIỂM TRA BÁC SĨ
      const doctor = await User.findOne({ 
        _id: doctorId, 
        role: 'DOCTOR',
        isActive: true 
      });
      
      if (!doctor) {
        throw new AppError('Không tìm thấy bác sĩ', 404);
      }

      // 🎯 XỬ LÝ CÁC THAY ĐỔI TRONG LỊCH
      let updatedCount = 0;
      
      if (changes.cancellations && changes.cancellations.length > 0) {
        // HỦY CÁC LỊCH HẸN ĐƯỢC CHỈ ĐỊNH
        for (const appointmentId of changes.cancellations) {
          const appointment = await Appointment.findOne({ appointmentId });
          if (appointment && appointment.doctorId.toString() === doctorId) {
            appointment.cancel(updatedBy, 'Lịch làm việc thay đổi', 'Hủy do thay đổi lịch làm việc của bác sĩ');
            await appointment.save();
            updatedCount++;
          }
        }
      }

      if (changes.reschedules && changes.reschedules.length > 0) {
        // ĐẶT LẠI CÁC LỊCH HẸN
        for (const reschedule of changes.reschedules) {
          const appointment = await Appointment.findOne({ appointmentId: reschedule.appointmentId });
          if (appointment && appointment.doctorId.toString() === doctorId) {
            await this.rescheduleAppointment(
              reschedule.appointmentId, 
              reschedule.newTime, 
              updatedBy
            );
            updatedCount++;
          }
        }
      }

      console.log(`✅ [SERVICE] Schedule updated: ${updatedCount} changes applied`);
      return {
        scheduleId,
        doctorId,
        date,
        updatedCount,
        changes: updateData.changes
      };

    } catch (error) {
      console.error('❌ [SERVICE] Update schedule failed:', error.message);
      throw error;
    }
  }

  /**
   * 🎯 GỬI THÔNG BÁO NHẮC LỊCH HẸN
   */
  async sendAppointmentReminder(appointmentId) {
    try {
      console.log('🔔 [SERVICE] Sending appointment reminder:', appointmentId);

      const appointment = await Appointment.findOne({ appointmentId })
        .populate('patientId', 'name email phone settings')
        .populate('doctorId', 'name email specialization department');

      if (!appointment) {
        throw new AppError('Không tìm thấy lịch hẹn', 404);
      }

      // 🎯 KIỂM TRA THỜI GIAN GỬI NHẮC (24h trước)
      const appointmentTime = new Date(appointment.appointmentDate);
      const now = new Date();
      const timeDiff = appointmentTime - now;
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      if (hoursDiff > 24) {
        throw new AppError('Chỉ gửi nhắc nhở trong vòng 24h trước lịch hẹn', 400);
      }

      if (hoursDiff < 0) {
        throw new AppError('Không thể gửi nhắc nhở cho lịch hẹn đã qua', 400);
      }

      const { patientId: patient, doctorId: doctor } = appointment;

      // 🎯 GỬI EMAIL NHẮC NHỞ
      try {
        if (patient.settings?.notifications?.email) {
          await EmailService.sendAppointmentReminder({
            patient,
            doctor,
            appointment,
            hoursUntil: Math.floor(hoursDiff)
          });
        }
      } catch (emailError) {
        console.error('❌ [SERVICE] Failed to send reminder email:', emailError.message);
      }

      // 🎯 CẬP NHẬT TRẠNG THÁI ĐÃ GỬI NHẮC
      appointment.reminders.emailSent = true;
      appointment.reminders.reminderDate = new Date();
      await appointment.save();

      console.log('✅ [SERVICE] Appointment reminder sent:', appointmentId);
      return {
        appointmentId,
        patient: patient.name,
        doctor: doctor.name,
        appointmentTime: appointment.appointmentDate,
        reminderSent: true,
        channels: ['email'] // Có thể mở rộng SMS/push notification
      };

    } catch (error) {
      console.error('❌ [SERVICE] Send appointment reminder failed:', error.message);
      throw error;
    }
  }

  /**
   * 🎯 TỰ ĐỘNG GỬI NHẮC NHỞ CHO CÁC LỊCH HẸN SẮP TỚI
   */
  async sendScheduledReminders() {
    try {
      console.log('⏰ [SERVICE] Sending scheduled reminders');

      const now = new Date();
      const reminderStart = new Date(now.getTime() + 23 * 60 * 60 * 1000); // 23-25h từ bây giờ
      const reminderEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

      // 🎯 TÌM CÁC LỊCH HẸN TRONG KHOẢNG THỜI GIAN NHẮC
      const appointmentsToRemind = await Appointment.find({
        appointmentDate: {
          $gte: reminderStart,
          $lte: reminderEnd
        },
        status: { $in: ['SCHEDULED', 'CONFIRMED'] },
        'reminders.emailSent': false
      })
      .populate('patientId', 'name email phone settings')
      .populate('doctorId', 'name email specialization');

      console.log(`📨 [SERVICE] Found ${appointmentsToRemind.length} appointments to remind`);

      const results = {
        total: appointmentsToRemind.length,
        successful: 0,
        failed: 0,
        details: []
      };

      // 🎯 GỬI NHẮC CHO TỪNG LỊCH HẸN
      for (const appointment of appointmentsToRemind) {
        try {
          await this.sendAppointmentReminder(appointment.appointmentId);
          results.successful++;
          results.details.push({
            appointmentId: appointment.appointmentId,
            status: 'success',
            patient: appointment.patientId.name
          });
        } catch (error) {
          results.failed++;
          results.details.push({
            appointmentId: appointment.appointmentId,
            status: 'failed',
            error: error.message,
            patient: appointment.patientId.name
          });
        }
      }

      console.log(`✅ [SERVICE] Scheduled reminders completed: ${results.successful} successful, ${results.failed} failed`);
      return results;

    } catch (error) {
      console.error('❌ [SERVICE] Send scheduled reminders failed:', error.message);
      throw error;
    }
  }
  /**
   * 🎯 LẤY LỊCH HẸN CỦA BỆNH NHÂN
   */
  async getPatientAppointments(filters) {
    try {
      const { 
        patientId,
        status, 
        page = 1, 
        limit = 10,
        startDate,
        endDate
      } = filters;

      console.log('📋 [APPOINTMENT] Getting appointments for patient:', patientId);

      const skip = (page - 1) * limit;

      // 🎯 BUILD QUERY
      let query = { patientId };
      
      if (status) query.status = status;

      if (startDate || endDate) {
        query.appointmentDate = {};
        if (startDate) query.appointmentDate.$gte = new Date(startDate);
        if (endDate) query.appointmentDate.$lte = new Date(endDate);
      }

      // 🎯 THỰC HIỆN TÌM KIẾM
      const [appointments, total] = await Promise.all([
        Appointment.find(query)
          .populate('patientId', 'personalInfo email phone')
          .populate('doctorId', 'personalInfo email professionalInfo')
          .populate('createdBy', 'personalInfo email')
          .sort({ appointmentDate: -1 })
          .skip(skip)
          .limit(limit),
        Appointment.countDocuments(query)
      ]);

      // 🎯 TÍNH TOÁN PHÂN TRANG
      const totalPages = Math.ceil(total / limit);

      return {
        appointments,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };

    } catch (error) {
      console.error('❌ [APPOINTMENT] Get patient appointments failed:', error.message);
      throw error;
    }
  }

  /**
   * 🎯 LẤY LỊCH HẸN CỦA BÁC SĨ
   */
  async getDoctorAppointments(filters) {
    try {
      const { 
        doctorId,
        status, 
        page = 1, 
        limit = 10,
        date
      } = filters;

      console.log('👨‍⚕️ [APPOINTMENT] Getting appointments for doctor:', doctorId);

      const skip = (page - 1) * limit;

      // 🎯 BUILD QUERY
      let query = { doctorId };
      
      if (status) query.status = status;

      if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        query.appointmentDate = {
          $gte: startOfDay,
          $lte: endOfDay
        };
      }

      // 🎯 THỰC HIỆN TÌM KIẾM
      const [appointments, total] = await Promise.all([
        Appointment.find(query)
          .populate('patientId', 'personalInfo email phone')
          .populate('doctorId', 'personalInfo email professionalInfo')
          .sort({ appointmentDate: 1 })
          .skip(skip)
          .limit(limit),
        Appointment.countDocuments(query)
      ]);

      // 🎯 TÍNH TOÁN PHÂN TRANG
      const totalPages = Math.ceil(total / limit);

      return {
        appointments,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };

    } catch (error) {
      console.error('❌ [APPOINTMENT] Get doctor appointments failed:', error.message);
      throw error;
    }
  }

  /**
   * 🎯 LẤY THÔNG TIN LỊCH HẸN CHI TIẾT
   */
  async getAppointment(appointmentId) {
    try {
      console.log('🔍 [APPOINTMENT] Getting appointment details:', appointmentId);

      const appointment = await Appointment.findOne({ appointmentId })
        .populate('patientId', 'personalInfo email phone dateOfBirth gender')
        .populate('doctorId', 'personalInfo email professionalInfo specialization department')
        .populate('createdBy', 'personalInfo email')
        .populate('cancellation.cancelledBy', 'personalInfo email');

      if (!appointment) {
        throw new AppError('Không tìm thấy lịch hẹn', 404, ERROR_CODES.APPOINTMENT_NOT_FOUND);
      }

      return appointment;

    } catch (error) {
      console.error('❌ [APPOINTMENT] Get appointment failed:', error.message);
      throw error;
    }
  }

  /**
   * 🎯 CẬP NHẬT LỊCH HẸN
   */
  async updateAppointment(appointmentId, updateData, updatedBy) {
    try {
      console.log('✏️ [APPOINTMENT] Updating appointment:', appointmentId, 'with data:', JSON.stringify(updateData));

      const appointment = await Appointment.findOne({ appointmentId });
      
      if (!appointment) {
        throw new AppError('Không tìm thấy lịch hẹn', 404, ERROR_CODES.APPOINTMENT_NOT_FOUND);
      }

      // 🎯 KIỂM TRA QUYỀN CHỈNH SỬA
      if (appointment.status === 'COMPLETED' || appointment.status === 'CANCELLED') {
        throw new AppError('Không thể chỉnh sửa lịch hẹn đã hoàn thành hoặc đã hủy', 400);
      }

      // 🎯 CẬP NHẬT THÔNG TIN
      const allowedFields = [
        'appointmentDate', 'duration', 'type', 'mode', 'location',
        'room', 'reason', 'description', 'symptoms', 'preparationInstructions'
      ];
      
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          appointment[field] = updateData[field];
        }
      });

      // 🎯 XỬ LÝ CẬP NHẬT STATUS RIÊNG
      if (updateData.status) {
        const validTransitions = {
          'SCHEDULED': ['CONFIRMED', 'CANCELLED'],
          'PENDING': ['CONFIRMED', 'CANCELLED', 'SCHEDULED'],
          'CONFIRMED': ['IN_PROGRESS', 'CANCELLED'],
          'IN_PROGRESS': ['COMPLETED', 'CANCELLED'],
          'COMPLETED': [],
          'CANCELLED': []
        };

        const currentStatus = appointment.status;
        const newStatus = updateData.status;

        if (!validTransitions[currentStatus]?.includes(newStatus)) {
          throw new AppError(`Không thể chuyển từ ${currentStatus} sang ${newStatus}`, 400, 'INVALID_STATUS_TRANSITION');
        }

        appointment.status = newStatus;

        // Cập nhật timestamps theo status
        if (newStatus === 'IN_PROGRESS') {
          appointment.actualStartTime = new Date();
        } else if (newStatus === 'COMPLETED') {
          appointment.actualEndTime = new Date();
        }
      }

      // 🎯 KIỂM TRA TRÙNG LỊCH NẾU CÓ THAY ĐỔI THỜI GIAN
      if (updateData.appointmentDate) {
        const conflictingAppointment = await this.checkSchedulingConflict(
          appointment.doctorId, 
          updateData.appointmentDate,
          updateData.duration || appointment.duration
        );

        if (conflictingAppointment && conflictingAppointment.appointmentId !== appointmentId) {
          throw new AppError('Bác sĩ đã có lịch hẹn trong khoảng thời gian mới', 400, 'SCHEDULING_CONFLICT');
        }
      }

      await appointment.save();

      console.log('✅ [APPOINTMENT] Appointment updated:', appointmentId);
      return await this.getAppointment(appointmentId);

    } catch (error) {
      console.error('❌ [APPOINTMENT] Update appointment failed:', error.message);
      throw error;
    }
  }

  /**
   * 🎯 HỦY LỊCH HẸN
   */
  async cancelAppointment(appointmentId, cancelledBy, reason, notes = '') {
    try {
      console.log('❌ [APPOINTMENT] Cancelling appointment:', appointmentId);

      const appointment = await Appointment.findOne({ appointmentId });
      
      if (!appointment) {
        throw new AppError('Không tìm thấy lịch hẹn', 404, ERROR_CODES.APPOINTMENT_NOT_FOUND);
      }

      // 🎯 KIỂM TRA TRẠNG THÁI CÓ THỂ HỦY
      if (appointment.status === 'COMPLETED') {
        throw new AppError('Không thể hủy lịch hẹn đã hoàn thành', 400);
      }

      if (appointment.status === 'CANCELLED') {
        throw new AppError('Lịch hẹn đã được hủy trước đó', 400);
      }

      // 🎯 HỦY LỊCH HẸN
      appointment.cancel(cancelledBy, reason, notes);
      await appointment.save();

      console.log('✅ [APPOINTMENT] Appointment cancelled:', appointmentId);
      return await this.getAppointment(appointmentId);

    } catch (error) {
      console.error('❌ [APPOINTMENT] Cancel appointment failed:', error.message);
      throw error;
    }
  }

  /**
   * 🎯 TẠO LỊCH LÀM VIỆC
   */
  async createSchedule(scheduleData) {
    try {
      console.log('📋 [APPOINTMENT] Creating schedule for doctor:', scheduleData.doctorId);

      // 🎯 TRONG THỰC TẾ SẼ CÓ MODEL SCHEDULE RIÊNG
      // Ở đây tạm thời trả về thông tin cơ bản
      const schedule = {
        scheduleId: `SCH${generateMedicalCode(8)}`,
        ...scheduleData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('✅ [APPOINTMENT] Schedule created:', schedule.scheduleId);
      return schedule;

    } catch (error) {
      console.error('❌ [APPOINTMENT] Create schedule failed:', error.message);
      throw error;
    }
  }

  /**
   * 🎯 LẤY LỊCH LÀM VIỆC
   */
  async getDoctorSchedule(doctorId, date, week) {
    try {
      console.log('📅 [APPOINTMENT] Getting schedule for doctor:', doctorId);

      let query = { doctorId, status: { $in: ['SCHEDULED', 'CONFIRMED'] } };

      if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        query.appointmentDate = {
          $gte: startOfDay,
          $lte: endOfDay
        };
      } else if (week) {
        const startOfWeek = new Date(week);
        startOfWeek.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        
        query.appointmentDate = {
          $gte: startOfWeek,
          $lte: endOfWeek
        };
      } else {
        // Mặc định lấy lịch trong 7 ngày tới
        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + 7);
        endDate.setHours(23, 59, 59, 999);
        
        query.appointmentDate = {
          $gte: startDate,
          $lte: endDate
        };
      }

      const appointments = await Appointment.find(query)
        .populate('patientId', 'personalInfo email phone')
        .populate('doctorId', 'personalInfo email professionalInfo')
        .sort({ appointmentDate: 1 });

      // 🎯 NHÓM THEO NGÀY
      const scheduleByDate = {};
      appointments.forEach(appointment => {
        const dateKey = appointment.appointmentDate.toISOString().split('T')[0];
        if (!scheduleByDate[dateKey]) {
          scheduleByDate[dateKey] = [];
        }
        scheduleByDate[dateKey].push(appointment);
      });

      return {
        doctorId,
        dateRange: {
          start: query.appointmentDate.$gte,
          end: query.appointmentDate.$lte
        },
        scheduleByDate,
        totalAppointments: appointments.length
      };

    } catch (error) {
      console.error('❌ [APPOINTMENT] Get doctor schedule failed:', error.message);
      throw error;
    }
  }

  /**
   * LẤY DANH SÁCH TẤT CẢ LỊCH HẸN (CHO ADMIN DASHBOARD)
   */
  async getAllAppointments(filters = {}) {
    try {
      const { page = 1, limit = 20, status, startDate, endDate, search } = filters;
      const skip = (page - 1) * limit;

      let query = {};

      // Filter by status nếu có
      if (status) {
        query.status = status;
      }

      // Filter by date range nếu có
      if (startDate || endDate) {
        query.appointmentDate = {};
        if (startDate) {
          query.appointmentDate.$gte = new Date(startDate);
        }
        if (endDate) {
          query.appointmentDate.$lte = new Date(endDate);
        }
      }

      // Search by patient email hoặc doctor email nếu có
      if (search) {
        const searchRegex = { $regex: search, $options: 'i' };
        query.$or = [
          { 'patientId.email': searchRegex },
          { 'doctorId.email': searchRegex },
          { reason: searchRegex }
        ];
      }

      console.log('🔍 [SERVICE] Fetching all appointments with filters:', query);

      const total = await Appointment.countDocuments(query);
      
      const appointments = await Appointment.find(query)
        .populate('patientId', 'personalInfo email phone')
        .populate('doctorId', 'personalInfo email professionalInfo')
        .sort({ appointmentDate: -1 })
        .limit(limit)
        .skip(skip);

      return {
        data: appointments,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      console.error('❌ [SERVICE] Get all appointments failed:', error.message);
      throw error;
    }
  }

  /**
   * 📊 LẤY THỐNG KÊ LỊCH HẸN (CHO ADMIN DASHBOARD)
   */
  async getAppointmentsStats() {
    try {
      console.log('📊 [SERVICE] Getting appointments statistics');

      // Lấy tổng số lịch hẹn
      const totalAppointments = await Appointment.countDocuments();

      // Lấy lịch hẹn theo trạng thái
      const byStatus = await Appointment.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      // Lấy lịch hẹn hôm nay
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayAppointments = await Appointment.countDocuments({
        appointmentDate: {
          $gte: today,
          $lt: tomorrow
        }
      });

      // Lịch hẹn đang chờ xác nhận
      const pendingAppointments = await Appointment.countDocuments({
        status: { $in: ['SCHEDULED', 'PENDING'] }
      });

      // Lịch hẹn đã xác nhận
      const confirmedAppointments = await Appointment.countDocuments({
        status: 'CONFIRMED'
      });

      // Lịch hẹn đã hoàn thành
      const completedAppointments = await Appointment.countDocuments({
        status: 'COMPLETED'
      });

      // Lịch hẹn đã hủy
      const cancelledAppointments = await Appointment.countDocuments({
        status: 'CANCELLED'
      });

      const statusMap = {};
      byStatus.forEach(item => {
        statusMap[item._id] = item.count;
      });

      return {
        total: totalAppointments,
        today: todayAppointments,
        pending: pendingAppointments,
        confirmed: confirmedAppointments,
        completed: completedAppointments,
        cancelled: cancelledAppointments,
        byStatus: statusMap
      };

    } catch (error) {
      console.error('❌ [SERVICE] Get appointments stats failed:', error.message);
      throw error;
    }
  }
}

module.exports = new AppointmentService();