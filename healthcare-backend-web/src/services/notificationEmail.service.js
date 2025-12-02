// src/services/notificationEmail.service.js
const { sendEmail } = require('../utils/email');
const { appConfig } = require('../config');

/**
 * Gửi email thông báo khi bệnh nhân đặt lịch khám
 */
async function sendAppointmentConfirmation(appointmentData) {
  try {
    const { patientEmail, patientName, doctorName, appointmentDate, appointmentTime, clinicName, appointmentId } = appointmentData;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0099cc;">Xác nhận đặt lịch khám bệnh</h2>
        <p>Xin chào <strong>${patientName}</strong>,</p>
        
        <p>Cảm ơn bạn đã đặt lịch khám tại hệ thống ${appConfig.hospital.name}. Dưới đây là thông tin chi tiết lịch hẹn của bạn:</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>📅 Ngày khám:</strong> ${new Date(appointmentDate).toLocaleDateString('vi-VN')}</p>
          <p><strong>⏰ Giờ khám:</strong> ${appointmentTime}</p>
          <p><strong>👨‍⚕️ Bác sĩ:</strong> ${doctorName}</p>
          <p><strong>🏥 Phòng khám:</strong> ${clinicName || 'Chưa xác định'}</p>
          <p><strong>🆔 Mã lịch hẹn:</strong> ${appointmentId}</p>
        </div>

        <p>📌 <strong>Lưu ý quan trọng:</strong></p>
        <ul>
          <li>Vui lòng đến khám 10 phút trước giờ hẹn</li>
          <li>Mang theo CMND/Hộ chiếu và bảo hiểm y tế (nếu có)</li>
          <li>Nếu không thể đến khám, vui lòng huỷ trước 24 giờ</li>
        </ul>

        <p>Nếu có bất kỳ câu hỏi, vui lòng liên hệ: <strong>${appConfig.hospital.supportPhone}</strong></p>

        <p style="margin-top: 30px; color: #666;">
          Trân trọng,<br/>
          <strong>${appConfig.hospital.name}</strong>
        </p>
      </div>
    `;

    await sendEmail({
      to: patientEmail,
      subject: `Xác nhận lịch khám - ${new Date(appointmentDate).toLocaleDateString('vi-VN')}`,
      html: htmlContent
    });

    console.log(`✅ Email xác nhận lịch hẹn được gửi đến ${patientEmail}`);
  } catch (error) {
    console.error('❌ Lỗi gửi email xác nhận lịch hẹn:', error);
  }
}

/**
 * Gửi email thông báo khi thanh toán thành công
 */
async function sendPaymentConfirmation(paymentData) {
  try {
    const { patientEmail, patientName, appointmentDate, amount, transactionId, billId } = paymentData;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #00cc66;">✅ Xác nhận thanh toán thành công</h2>
        <p>Xin chào <strong>${patientName}</strong>,</p>
        
        <p>Cảm ơn bạn! Thanh toán của bạn đã được xử lý thành công.</p>
        
        <div style="background-color: #f0f9f7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>💰 Số tiền thanh toán:</strong> ${amount.toLocaleString('vi-VN')} VNĐ</p>
          <p><strong>🆔 Mã hóa đơn:</strong> ${billId}</p>
          <p><strong>📝 Mã giao dịch:</strong> ${transactionId}</p>
          <p><strong>📅 Ngày thanh toán:</strong> ${new Date().toLocaleDateString('vi-VN')}</p>
        </div>

        <p>Lịch khám của bạn đã được xác nhận. Hãy sẵn sàng cho buổi khám vào <strong>${new Date(appointmentDate).toLocaleDateString('vi-VN')}</strong>.</p>

        <p>Nếu có bất kỳ câu hỏi, vui lòng liên hệ: <strong>${appConfig.hospital.supportPhone}</strong></p>

        <p style="margin-top: 30px; color: #666;">
          Trân trọng,<br/>
          <strong>${appConfig.hospital.name}</strong>
        </p>
      </div>
    `;

    await sendEmail({
      to: patientEmail,
      subject: '✅ Xác nhận thanh toán thành công',
      html: htmlContent
    });

    console.log(`✅ Email xác nhận thanh toán được gửi đến ${patientEmail}`);
  } catch (error) {
    console.error('❌ Lỗi gửi email xác nhận thanh toán:', error);
  }
}

/**
 * Gửi email nhắc lịch hẹn cho bệnh nhân (trước 24h)
 */
async function sendAppointmentReminder(appointmentData) {
  try {
    const { patientEmail, patientName, doctorName, appointmentDate, appointmentTime, clinicName } = appointmentData;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ffa500;">📌 Nhắc lịch khám - Ngày mai</h2>
        <p>Xin chào <strong>${patientName}</strong>,</p>
        
        <p>Đây là thông báo nhắc lịch khám của bạn. Bạn có một cuộc hẹn khám bệnh vào <strong>ngày mai</strong>:</p>
        
        <div style="background-color: #fff8f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>📅 Ngày khám:</strong> ${new Date(appointmentDate).toLocaleDateString('vi-VN')}</p>
          <p><strong>⏰ Giờ khám:</strong> ${appointmentTime}</p>
          <p><strong>👨‍⚕️ Bác sĩ:</strong> ${doctorName}</p>
          <p><strong>🏥 Phòng khám:</strong> ${clinicName || 'Chưa xác định'}</p>
        </div>

        <p>⏱️ <strong>Vui lòng đến khám 10 phút trước giờ hẹn</strong></p>

        <p>Nếu bạn không thể đến khám, vui lòng liên hệ ngay để huỷ lịch hẹn.</p>

        <p style="margin-top: 30px; color: #666;">
          Trân trọng,<br/>
          <strong>${appConfig.hospital.name}</strong>
        </p>
      </div>
    `;

    await sendEmail({
      to: patientEmail,
      subject: `📌 Nhắc lịch khám - ${new Date(appointmentDate).toLocaleDateString('vi-VN')}`,
      html: htmlContent
    });

    console.log(`✅ Email nhắc lịch hẹn được gửi đến ${patientEmail}`);
  } catch (error) {
    console.error('❌ Lỗi gửi email nhắc lịch hẹn:', error);
  }
}

module.exports = {
  sendAppointmentConfirmation,
  sendPaymentConfirmation,
  sendAppointmentReminder
};
