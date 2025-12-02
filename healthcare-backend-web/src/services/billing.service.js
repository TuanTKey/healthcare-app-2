// src/services/billing.service.js
const Bill = require('../models/bill.model');
const Appointment = require('../models/appointment.model');
const { AppError } = require('../middlewares/error.middleware');
const { generateMedicalCode } = require('../utils/healthcare.utils');
const notificationEmailService = require('./notificationEmail.service');

class BillingService {
  /**
   * Tạo hóa đơn từ appointment
   */
  async createBillFromAppointment(appointmentId, billingData = {}) {
    try {
      // Lấy appointment details
      const appointment = await Appointment.findById(appointmentId).populate('patientId doctorId');
      
      if (!appointment) {
        throw new AppError('Không tìm thấy lịch khám', 404);
      }

      // Nếu đã có hóa đơn, không tạo thêm
      if (appointment.billId) {
        return await Bill.findById(appointment.billId);
      }

      // Tính giá khám mặc định
      const consultationFee = billingData.consultationFee || 500000; // 500k VND
      const taxes = Math.round(consultationFee * 0.1); // 10% VAT
      const total = consultationFee + taxes;

      // Tạo hóa đơn
      const bill = new Bill({
        billId: `BILL${generateMedicalCode(8)}`,
        patientId: appointment.patientId._id,
        appointmentId: appointment._id,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        billType: 'CONSULTATION',
        services: [
          {
            serviceCode: 'CONSULT001',
            serviceName: 'Khám bệnh',
            description: `Khám bệnh với bác sĩ ${appointment.doctorId.name}`,
            quantity: 1,
            unitPrice: consultationFee,
            discount: 0,
            taxRate: 0.1,
            total: consultationFee
          }
        ],
        subtotal: consultationFee,
        totalDiscount: 0,
        totalTax: taxes,
        grandTotal: total,
        amountPaid: 0,
        balanceDue: total,
        status: 'ISSUED',
        createdBy: appointment.createdBy || appointment.patientId._id
      });

      await bill.save();

      // Update appointment với billId
      appointment.billId = bill._id;
      await appointment.save();

      return bill.populate('patientId');
    } catch (error) {
      throw error;
    }
  }

  async createBill(data) {
    try {
      const bill = new Bill({
        ...data,
        billId: `BILL${generateMedicalCode(8)}`,
        status: 'PENDING'
      });
      await bill.save();
      return bill.populate('patientId');
    } catch (error) {
      throw error;
    }
  }

  async getByPatient(patientId) {
    try {
      return await Bill.find({ patientId })
        .populate('patientId')
        .populate('appointmentId')
        .sort({ issueDate: -1 });
    } catch (error) {
      throw error;
    }
  }

  async processPayment(billId, paymentData) {
    try {
      const bill = await Bill.findById(billId).populate('patientId');
      
      if (!bill) {
        throw new AppError('Không tìm thấy hóa đơn', 404);
      }

      // Thêm payment vào mảng
      const payment = {
        paymentId: `PAY${generateMedicalCode(8)}`,
        paymentDate: new Date(),
        amount: paymentData.amount,
        method: paymentData.method,
        reference: paymentData.reference,
        status: 'COMPLETED'
      };

      bill.payments.push(payment);
      bill.amountPaid += paymentData.amount;
      bill.balanceDue = bill.grandTotal - bill.amountPaid;

      // Update status
      if (bill.balanceDue <= 0) {
        bill.status = 'PAID';
      } else if (bill.amountPaid > 0) {
        bill.status = 'PARTIAL';
      }

      await bill.save();
      
      // 🎯 GỬI EMAIL THÔNG BÁO THANH TOÁN
      try {
        await notificationEmailService.sendPaymentConfirmation({
          patientName: bill.patientId.name,
          patientEmail: bill.patientId.email,
          billId: bill.billId,
          amount: payment.amount,
          method: payment.method,
          transactionId: payment.paymentId,
          date: new Date()
        });
      } catch (emailError) {
        console.warn('⚠️ [SERVICE] Failed to send payment confirmation email:', emailError.message);
        // Không throw error, để thanh toán vẫn thành công
      }
      
      return bill.populate('patientId');
    } catch (error) {
      throw error;
    }
  }

  async getById(id) {
    try {
      const bill = await Bill.findById(id)
        .populate('patientId')
        .populate('appointmentId');
      
      if (!bill) throw new AppError('Không tìm thấy hóa đơn', 404);
      return bill;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new BillingService();
