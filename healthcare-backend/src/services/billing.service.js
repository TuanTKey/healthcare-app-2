// src/services/billing.service.js
const Bill = require('../models/bill.model');
const Patient = require('../models/patient.model');
const Prescription = require('../models/prescription.model');
const Medication = require('../models/medication.model');
const User = require('../models/user.model');
const { AppError } = require('../middlewares/error.middleware');

class BillingService {
  /**
   * 🎯 TẠO HÓA ĐƠN TỪ ĐƠN THUỐC
   */
  async createBillFromPrescription(prescriptionId, createdBy, additionalData = {}) {
    try {
      // Lấy thông tin đơn thuốc
      const prescription = await Prescription.findById(prescriptionId)
        .populate('patientId', 'personalInfo email')
        .populate('doctorId', 'personalInfo')
        .populate('medications.medicationId');

      if (!prescription) {
        throw new AppError('Không tìm thấy đơn thuốc', 404, 'PRESCRIPTION_NOT_FOUND');
      }

      // Kiểm tra đơn thuốc đã có hoá đơn chưa
      const existingBill = await Bill.findOne({ 
        prescriptionId: prescriptionId,
        status: { $ne: 'WRITTEN_OFF' }
      });
      
      if (existingBill) {
        throw new AppError('Đơn thuốc này đã có hoá đơn', 400, 'BILL_ALREADY_EXISTS');
      }

      // Lấy thông tin bệnh nhân
      const patient = await Patient.findOne({ userId: prescription.patientId._id });
      
      // Tạo mã hóa đơn tự động
      const billCount = await Bill.countDocuments();
      const billId = `BILL${Date.now()}${Math.random().toString(36).substr(2, 5)}`.toUpperCase();
      const billNumber = `HD${String(billCount + 1).padStart(6, '0')}`;

      // Tạo danh sách items từ medications trong đơn thuốc
      const services = [];
      let subtotal = 0;

      for (const med of prescription.medications) {
        // Lấy giá từ medication hoặc sử dụng giá mặc định
        let unitPrice = 0;
        
        if (med.medicationId && med.medicationId.pricing) {
          unitPrice = med.medicationId.pricing.sellingPrice || 0;
        } else {
          // Tìm medication theo tên nếu không có medicationId
          const medication = await Medication.findOne({ 
            name: { $regex: new RegExp(med.name, 'i') } 
          });
          if (medication && medication.pricing) {
            unitPrice = medication.pricing.sellingPrice || 0;
          }
        }

        // Nếu không có giá, đặt giá mặc định
        if (!unitPrice) {
          unitPrice = additionalData.defaultPrice || 10000; // 10,000 VND mặc định
        }

        const quantity = med.totalQuantity || 1;
        const total = quantity * unitPrice;
        subtotal += total;

        services.push({
          serviceCode: med.medicationId?.medicationId || `MED-${Date.now()}`,
          serviceName: med.name,
          description: `${med.dosage?.value || ''} ${med.dosage?.unit || ''} - ${med.frequency?.instructions || med.instructions || ''}`.trim(),
          quantity: quantity,
          unitPrice: unitPrice,
          discount: 0,
          taxRate: 0,
          total: total
        });
      }

      // Thêm phí khám nếu có
      if (additionalData.consultationFee) {
        subtotal += additionalData.consultationFee;
        services.unshift({
          serviceCode: 'CONSULT-001',
          serviceName: 'Phí khám bệnh',
          description: 'Phí khám và tư vấn bác sĩ',
          quantity: 1,
          unitPrice: additionalData.consultationFee,
          discount: 0,
          taxRate: 0,
          total: additionalData.consultationFee
        });
      }

      // Tính toán tổng
      const totalDiscount = additionalData.discount || 0;
      const totalTax = 0; // Thuế VAT nếu có
      const grandTotal = subtotal - totalDiscount + totalTax;

      // Thông tin bệnh nhân
      const patientInfo = prescription.patientId.personalInfo || {};
      
      // Tạo bill
      const bill = new Bill({
        billId,
        billNumber,
        patientId: prescription.patientId._id,
        prescriptionId: prescription._id, // Link to prescription
        issueDate: new Date(),
        dueDate: additionalData.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        billType: 'PHARMACY',
        services,
        subtotal,
        totalDiscount,
        totalTax,
        grandTotal,
        amountPaid: 0,
        balanceDue: grandTotal,
        status: 'ISSUED',
        notes: additionalData.notes || `Hoá đơn thuốc từ đơn thuốc ${prescription.prescriptionId}`,
        createdBy
      });

      // Tính toán lại để đảm bảo chính xác
      bill.calculateTotals();
      
      const savedBill = await bill.save();

      // Cập nhật đơn thuốc - đánh dấu đã tạo hoá đơn
      prescription.billId = savedBill._id;
      prescription.billCreated = true;
      prescription.billCreatedAt = new Date();
      await prescription.save();

      console.log(`✅ Bill created from prescription: ${savedBill.billNumber} for prescription ${prescription.prescriptionId}`);

      return savedBill;
    } catch (error) {
      console.error('❌ [BILLING SERVICE] Create bill from prescription error:', error);
      throw error;
    }
  }

  /**
   * 🎯 LẤY TẤT CẢ HÓA ĐƠN (CHO ADMIN)
   */
  async getAllBills(filters = {}) {
    try {
      const { 
        page = 1, 
        limit = 10,
        status,
        patientId,
        startDate,
        endDate
      } = filters;

      const skip = (page - 1) * limit;
      let query = {};

      if (status) query.status = status;
      if (patientId) query.patientId = patientId;
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      const [bills, total] = await Promise.all([
        Bill.find(query)
          .populate('patientId', 'personalInfo email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        Bill.countDocuments(query)
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        data: bills,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('❌ [BILLING SERVICE] Get all bills error:', error);
      throw error;
    }
  }

  /**
   * 🎯 TẠO HÓA ĐƠN MỚI
   */
  async createBill(patientId, billData, createdBy) {
    try {
      // Kiểm tra bệnh nhân tồn tại
      const patient = await Patient.findById(patientId);
      if (!patient) {
        throw new AppError('Không tìm thấy bệnh nhân', 404, 'PATIENT_NOT_FOUND');
      }

      // Tạo mã hóa đơn tự động
      const billCount = await Bill.countDocuments();
      const billNumber = `HD${String(billCount + 1).padStart(6, '0')}`;

      // Tính toán số tiền
      const totalAmount = this.calculateTotalAmount(billData.items);
      const taxAmount = this.calculateTax(totalAmount, billData.taxRate);
      const finalAmount = totalAmount + taxAmount;

      const bill = new Bill({
        billNumber,
        patientId,
        patientInfo: {
          name: `${patient.personalInfo.firstName} ${patient.personalInfo.lastName}`,
          phone: patient.personalInfo.phone,
          address: patient.personalInfo.address,
          email: patient.personalInfo.email
        },
        items: billData.items,
        totalAmount,
        taxRate: billData.taxRate || 0,
        taxAmount,
        finalAmount,
        status: 'PENDING',
        dueDate: billData.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdBy,
        notes: billData.notes
      });

      return await bill.save();
    } catch (error) {
      console.error('❌ [BILLING SERVICE] Create bill error:', error);
      throw error;
    }
  }

  /**
   * 🎯 LẤY THÔNG TIN HÓA ĐƠN
   */
  async getBill(billId, userId, userRole) {
    try {
      const bill = await Bill.findById(billId)
        .populate('patientId', 'personalInfo patientId email')
        .populate('prescriptionId', 'prescriptionId medications doctorId issueDate status')
        .populate('createdBy', 'personalInfo email')
        .populate('approvedBy', 'personalInfo email');

      if (!bill) {
        throw new AppError('Không tìm thấy hóa đơn', 404, 'BILL_NOT_FOUND');
      }

      // Kiểm tra quyền truy cập
      if (userRole === 'PATIENT' && bill.patientId._id.toString() !== userId) {
        throw new AppError('Bạn chỉ được xem hóa đơn của chính mình', 403, 'ACCESS_DENIED');
      }

      return bill;
    } catch (error) {
      console.error('❌ [BILLING SERVICE] Get bill error:', error);
      throw error;
    }
  }

  /**
   * 🎯 CẬP NHẬT HÓA ĐƠN
   */
  async updateBill(billId, updateData, updatedBy) {
    try {
      const bill = await Bill.findById(billId);
      if (!bill) {
        throw new AppError('Không tìm thấy hóa đơn', 404, 'BILL_NOT_FOUND');
      }

      // Kiểm tra trạng thái hóa đơn
      if (bill.status === 'PAID') {
        throw new AppError('Không thể cập nhật hóa đơn đã thanh toán', 400, 'BILL_ALREADY_PAID');
      }

      if (bill.status === 'WRITTEN_OFF') {
        throw new AppError('Không thể cập nhật hóa đơn đã hủy', 400, 'BILL_VOIDED');
      }

      // Cập nhật thông tin
      if (updateData.items) {
        bill.items = updateData.items;
        bill.totalAmount = this.calculateTotalAmount(updateData.items);
        bill.taxAmount = this.calculateTax(bill.totalAmount, bill.taxRate);
        bill.finalAmount = bill.totalAmount + bill.taxAmount;
      }

      if (updateData.taxRate !== undefined) {
        bill.taxRate = updateData.taxRate;
        bill.taxAmount = this.calculateTax(bill.totalAmount, bill.taxRate);
        bill.finalAmount = bill.totalAmount + bill.taxAmount;
      }

      if (updateData.dueDate) {
        bill.dueDate = updateData.dueDate;
      }

      if (updateData.notes !== undefined) {
        bill.notes = updateData.notes;
      }

      return await bill.save();
    } catch (error) {
      console.error('❌ [BILLING SERVICE] Update bill error:', error);
      throw error;
    }
  }

  /**
   * 🎯 LẤY DANH SÁCH HÓA ĐƠN CỦA BỆNH NHÂN
   */
  async getPatientBills(patientId, userId, userRole, filters = {}) {
    try {
      // Kiểm tra bệnh nhân tồn tại
      const patient = await Patient.findById(patientId);
      if (!patient) {
        throw new AppError('Không tìm thấy bệnh nhân', 404, 'PATIENT_NOT_FOUND');
      }

      // Kiểm tra quyền truy cập
      if (userRole === 'PATIENT' && patientId !== userId) {
        throw new AppError('Bạn chỉ được xem hóa đơn của chính mình', 403, 'ACCESS_DENIED');
      }

      // Xây dựng query
      const query = { patientId };
      if (filters.status) {
        query.status = filters.status;
      }
      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
      }

      const options = {
        page: filters.page || 1,
        limit: filters.limit || 10,
        sort: { createdAt: -1 },
        populate: {
          path: 'createdBy',
          select: 'name email'
        }
      };

      return await Bill.paginate(query, options);
    } catch (error) {
      console.error('❌ [BILLING SERVICE] Get patient bills error:', error);
      throw error;
    }
  }

  /**
   * 🎯 XỬ LÝ THANH TOÁN
   */
  async processPayment(billId, paymentData, processedBy) {
    try {
      const bill = await Bill.findById(billId);
      if (!bill) {
        throw new AppError('Không tìm thấy hóa đơn', 404, 'BILL_NOT_FOUND');
      }

      // Kiểm tra trạng thái hóa đơn
      if (bill.status === 'PAID') {
        throw new AppError('Hóa đơn đã được thanh toán', 400, 'BILL_ALREADY_PAID');
      }

      if (bill.status === 'WRITTEN_OFF') {
        throw new AppError('Không thể thanh toán hóa đơn đã hủy', 400, 'BILL_VOIDED');
      }

      // Kiểm tra số tiền thanh toán
      const remainingAmount = bill.finalAmount - bill.paidAmount;
      if (paymentData.amount > remainingAmount) {
        throw new AppError('Số tiền thanh toán vượt quá số tiền còn nợ', 400, 'PAYMENT_AMOUNT_EXCEEDED');
      }

      // Tạo giao dịch thanh toán
      const payment = {
        paymentDate: new Date(),
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        referenceNumber: paymentData.referenceNumber,
        notes: paymentData.notes,
        processedBy
      };

      bill.payments.push(payment);
      bill.paidAmount += paymentData.amount;

      // Cập nhật trạng thái hóa đơn
      if (bill.paidAmount >= bill.finalAmount) {
        bill.status = 'PAID';
      } else if (bill.paidAmount > 0) {
        bill.status = 'PARTIAL';
      }

      return await bill.save();
    } catch (error) {
      console.error('❌ [BILLING SERVICE] Process payment error:', error);
      throw error;
    }
  }

  /**
   * 🎯 LẤY LỊCH SỬ THANH TOÁN
   */
  async getPaymentHistory(patientId, userId, userRole, filters = {}) {
    try {
      // Kiểm tra bệnh nhân tồn tại
      const patient = await Patient.findById(patientId);
      if (!patient) {
        throw new AppError('Không tìm thấy bệnh nhân', 404, 'PATIENT_NOT_FOUND');
      }

      // Kiểm tra quyền truy cập
      if (userRole === 'PATIENT' && patientId !== userId) {
        throw new AppError('Bạn chỉ được xem lịch sử thanh toán của chính mình', 403, 'ACCESS_DENIED');
      }

      // Xây dựng query
      const paymentQuery = { 
        patientId,
        'payments.0': { $exists: true }
      };

      if (filters.startDate || filters.endDate) {
        paymentQuery['payments.paymentDate'] = {};
        if (filters.startDate) {
          paymentQuery['payments.paymentDate'].$gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          paymentQuery['payments.paymentDate'].$lte = new Date(filters.endDate);
        }
      }

      const bills = await Bill.find(paymentQuery)
        .select('billNumber payments patientInfo finalAmount paidAmount status createdAt')
        .sort({ 'payments.paymentDate': -1 })
        .lean();

      // Xử lý dữ liệu payments
      let allPayments = [];
      bills.forEach(bill => {
        bill.payments.forEach(payment => {
          allPayments.push({
            billNumber: bill.billNumber,
            billId: bill._id,
            patientInfo: bill.patientInfo,
            paymentDate: payment.paymentDate,
            amount: payment.amount,
            paymentMethod: payment.paymentMethod,
            referenceNumber: payment.referenceNumber,
            totalAmount: bill.finalAmount,
            paidAmount: bill.paidAmount,
            status: bill.status,
            billCreatedAt: bill.createdAt
          });
        });
      });

      // Lọc theo payment method nếu có
      if (filters.paymentMethod) {
        allPayments = allPayments.filter(
          payment => payment.paymentMethod === filters.paymentMethod
        );
      }

      // Phân trang
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);

      return {
        payments: allPayments.slice(startIndex, endIndex),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(allPayments.length / limit),
          totalPayments: allPayments.length,
          hasNext: endIndex < allPayments.length,
          hasPrev: startIndex > 0
        }
      };
    } catch (error) {
      console.error('❌ [BILLING SERVICE] Get payment history error:', error);
      throw error;
    }
  }

  /**
   * 🎯 HỦY HÓA ĐƠN
   */
  async voidBill(billId, reason, voidedBy) {
    try {
      const bill = await Bill.findById(billId);
      if (!bill) {
        throw new AppError('Không tìm thấy hóa đơn', 404, 'BILL_NOT_FOUND');
      }

      // Kiểm tra trạng thái hóa đơn
      if (bill.status === 'PAID') {
        throw new AppError('Không thể hủy hóa đơn đã thanh toán', 400, 'BILL_ALREADY_PAID');
      }

      if (bill.status === 'WRITTEN_OFF') {
        throw new AppError('Hóa đơn đã được hủy trước đó', 400, 'BILL_ALREADY_VOIDED');
      }

      // Hủy hóa đơn - đổi status thành WRITTEN_OFF (có trong schema)
      bill.status = 'WRITTEN_OFF';
      bill.notes = (bill.notes ? bill.notes + ' | ' : '') + `Hủy: ${reason.trim()}`;

      return await bill.save();
    } catch (error) {
      console.error('❌ [BILLING SERVICE] Void bill error:', error);
      throw error;
    }
  }

  /**
   * 🎯 TÍNH TỔNG TIỀN
   */
  calculateTotalAmount(items) {
    return items.reduce((total, item) => {
      return total + (item.quantity * item.unitPrice);
    }, 0);
  }

  /**
   * 🎯 TÍNH THUẾ
   */
  calculateTax(amount, taxRate = 0) {
    return amount * (taxRate / 100);
  }

  /**
   * 🎯 LẤY THỐNG KÊ DOANH THU
   */
  async getRevenueStats(timeRange = 'month') {
    try {
      const now = new Date();
      let startDate;

      switch (timeRange) {
        case 'day':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const stats = await Bill.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
            status: { $in: ['PAID', 'PARTIAL'] }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$paidAmount' },
            totalBills: { $sum: 1 },
            averageBillAmount: { $avg: '$finalAmount' }
          }
        }
      ]);

      return stats[0] || { totalRevenue: 0, totalBills: 0, averageBillAmount: 0 };
    } catch (error) {
      console.error('❌ [BILLING SERVICE] Get revenue stats error:', error);
      throw error;
    }
  }
}

module.exports = new BillingService();