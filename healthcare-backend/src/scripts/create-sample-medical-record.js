#!/usr/bin/env node

/**
 * 🏥 SCRIPT TẠO HỒ SƠ BỆNH ÁN MẪU
 * Script này tạo dữ liệu mẫu cho hồ sơ bệnh án để test
 */

require('dotenv').config();
const mongoose = require('mongoose');
const MedicalRecord = require('../models/medicalRecord.model');
const User = require('../models/user.model');
const { appConfig, initializeConfig } = require('../config');
const { generateMedicalCode } = require('../utils/healthcare.utils');

async function createSampleMedicalRecords() {
  try {
    console.log('🚀 Bắt đầu tạo hồ sơ bệnh án mẫu...\n');

    // Kết nối database
    await initializeConfig();
    
    // Tìm bệnh nhân mẫu
    const patient = await User.findOne({ 
      email: 'patient@healthcare.com',
      role: 'PATIENT'
    });

    if (!patient) {
      console.error('❌ Không tìm thấy bệnh nhân với email: patient@healthcare.com');
      process.exit(1);
    }

    console.log(`✅ Tìm thấy bệnh nhân: ${patient.personalInfo.firstName} ${patient.personalInfo.lastName}`);
    console.log(`📧 Email: ${patient.email}\n`);

    // Tìm bác sĩ mẫu
    const doctor = await User.findOne({
      role: 'DOCTOR',
      status: 'ACTIVE'
    });

    if (!doctor) {
      console.error('❌ Không tìm thấy bác sĩ trong hệ thống');
      process.exit(1);
    }

    console.log(`✅ Tìm thấy bác sĩ: ${doctor.personalInfo.firstName} ${doctor.personalInfo.lastName}`);
    console.log(`🏥 Khoa: ${doctor.department}\n`);

    // Tạo 3 hồ sơ bệnh án mẫu
    const medicalRecords = [
      {
        recordId: `MR${generateMedicalCode(8)}`,
        patientId: patient._id,
        doctorId: doctor._id,
        department: doctor.department || 'GENERAL',
        visitType: 'OUTPATIENT',
        visitDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 ngày trước
        chiefComplaint: 'Đau đầu và mệt mỏi kéo dài',
        historyOfPresentIllness: 'Bệnh nhân có triệu chứng đau đầu từng cơn, thường xuyên cảm thấy mệt mỏi. Bệnh nhân không có sốt, không có các triệu chứng khác.',
        symptoms: [
          {
            symptom: 'Đau đầu',
            duration: '3 ngày',
            severity: 'MODERATE',
            notes: 'Đau ở vùng trán và thái dương'
          },
          {
            symptom: 'Mệt mỏi',
            duration: '1 tuần',
            severity: 'MILD',
            notes: 'Mệt mỏi tổng quát'
          }
        ],
        vitalSigns: {
          bloodPressure: {
            systolic: 130,
            diastolic: 85
          },
          heartRate: 72,
          respiratoryRate: 16,
          temperature: 36.8,
          oxygenSaturation: 98,
          height: 170,
          weight: 65,
          recordedAt: new Date(),
          recordedBy: doctor._id
        },
        physicalExamination: {
          generalAppearance: 'Bệnh nhân tỉnh táo, phản ứng tốt',
          cardiovascular: 'Nhịp tim đều, không có tâm âm bất thường',
          respiratory: 'Phổi hai bên thông thoáng, không có ran',
          abdominal: 'Bụng mềm, không đau tức, gan không to',
          neurological: 'Ý thức tốt, các phản xạ bình thường',
          musculoskeletal: 'Không có dị tật, cơ lực bình thường',
          skin: 'Da sạch, không có tổn thương',
          findings: 'Không phát hiện bất thường',
          observations: 'Bệnh nhân tương tác tốt, tuân thủ kiểm tra',
          notes: 'Khám lâm sàng không phát hiện bất thường nào'
        },
        diagnoses: [
          {
            diagnosis: 'Đau đầu căng thẳng',
            code: 'G44.2',
            type: 'PRIMARY',
            certainty: 'PROBABLE',
            notes: 'Có thể do stress và overwork'
          },
          {
            diagnosis: 'Chứng mệt mỏi toàn thân',
            code: 'R53.82',
            type: 'SECONDARY',
            certainty: 'PROBABLE',
            notes: 'Có thể liên quan đến thiếu ngủ hoặc stress'
          }
        ],
        treatmentPlan: {
          recommendations: '1. Nghỉ ngơi đủ 7-8 giờ mỗi đêm\n2. Giảm stress bằng cách tập thể dục nhẹ\n3. Uống đủ nước\n4. Tránh những tác nhân gây căng thẳng',
          followUp: {
            required: true,
            date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            notes: 'Quay lại khám sau 1 tuần để theo dõi tình trạng'
          },
          referrals: [],
          medicalHistory: [
            {
              category: 'CHRONIC_CONDITION',
              condition: 'Tăng huyết áp nhẹ',
              description: 'Bệnh nhân có tiền sử tăng huyết áp nhẹ, được điều trị bằng thuốc',
              onsetDate: new Date('2022-01-01'),
              status: 'ACTIVE',
              severity: 'MILD',
              treatment: 'Lisinopril 10mg/ngày',
              notes: 'Kiểm soát tốt với thuốc',
              addedBy: doctor._id,
              addedAt: new Date()
            }
          ]
        },
        status: 'COMPLETED',
        privacyLevel: 'STANDARD',
        duration: 30,
        createdBy: doctor._id
      },
      {
        recordId: `MR${generateMedicalCode(8)}`,
        patientId: patient._id,
        doctorId: doctor._id,
        department: doctor.department || 'GENERAL',
        visitType: 'OUTPATIENT',
        visitDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 ngày trước
        chiefComplaint: 'Cảm lạnh, sổ mũi và ho',
        historyOfPresentIllness: 'Bệnh nhân bị sổ mũi, ho và hơi sốt từ 3 ngày trước. Có tiếp xúc với người bệnh cảm lạnh.',
        symptoms: [
          {
            symptom: 'Sổ mũi',
            duration: '3 ngày',
            severity: 'MODERATE',
            notes: 'Sổ mũi đặc, có màu vàng nhạt'
          },
          {
            symptom: 'Ho',
            duration: '3 ngày',
            severity: 'MILD',
            notes: 'Ho nhẹ, không chảy máu'
          },
          {
            symptom: 'Sốt nhẹ',
            duration: '2 ngày',
            severity: 'MILD',
            notes: 'Sốt không quá 38.5°C'
          }
        ],
        vitalSigns: {
          bloodPressure: {
            systolic: 128,
            diastolic: 82
          },
          heartRate: 78,
          respiratoryRate: 18,
          temperature: 37.5,
          oxygenSaturation: 97,
          height: 170,
          weight: 65,
          recordedAt: new Date(),
          recordedBy: doctor._id
        },
        physicalExamination: {
          generalAppearance: 'Bệnh nhân tỉnh táo, hơi mệt',
          cardiovascular: 'Nhịp tim đều, huyết áp bình thường',
          respiratory: 'Phổi hai bên thông thoáng, nghe thấy ran rít nhẹ',
          abdominal: 'Bụng mềm, không đau',
          neurological: 'Ý thức tốt',
          musculoskeletal: 'Không có dị tật',
          skin: 'Da sạch',
          findings: 'Đường hô hấp phía trên viêm',
          observations: 'Không có dấu hiệu viêm phổi',
          notes: 'Khám phát hiện viêm đường hô hấp trên'
        },
        diagnoses: [
          {
            diagnosis: 'Viêm đường hô hấp trên cấp tính',
            code: 'J06.9',
            type: 'PRIMARY',
            certainty: 'CONFIRMED',
            notes: 'Cảm lạnh do virus'
          }
        ],
        treatmentPlan: {
          recommendations: '1. Nghỉ ngơi\n2. Uống đủ nước\n3. Sử dụng thuốc cảm lạnh OTC\n4. Tránh hoạt động nặng',
          followUp: {
            required: false,
            date: null,
            notes: 'Tự khỏi trong 5-7 ngày'
          },
          referrals: [],
          medicalHistory: [
            {
              category: 'ALLERGY',
              condition: 'Dị ứng với Penicillin',
              description: 'Bệnh nhân có tiền sử dị ứng với Penicillin',
              onsetDate: new Date('2020-06-15'),
              status: 'ACTIVE',
              severity: 'MODERATE',
              treatment: 'Tránh sử dụng Penicillin và các chất kháng sinh tương tự',
              notes: 'Phát ban khi sử dụng Penicillin',
              addedBy: doctor._id,
              addedAt: new Date()
            }
          ]
        },
        status: 'COMPLETED',
        privacyLevel: 'STANDARD',
        duration: 20,
        createdBy: doctor._id
      },
      {
        recordId: `MR${generateMedicalCode(8)}`,
        patientId: patient._id,
        doctorId: doctor._id,
        department: doctor.department || 'GENERAL',
        visitType: 'FOLLOW_UP',
        visitDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Hôm qua
        chiefComplaint: 'Khám theo dõi',
        historyOfPresentIllness: 'Bệnh nhân quay lại khám theo dõi sau điều trị. Triệu chứng đã cải thiện rõ rệt.',
        symptoms: [
          {
            symptom: 'Đau đầu',
            duration: 'Đã giảm',
            severity: 'MILD',
            notes: 'Chỉ còn đau nhẹ khi mệt mỏi'
          },
          {
            symptom: 'Mệt mỏi',
            duration: 'Đã giảm',
            severity: 'MILD',
            notes: 'Cảm thấy năng lượng hơn'
          }
        ],
        vitalSigns: {
          bloodPressure: {
            systolic: 125,
            diastolic: 80
          },
          heartRate: 70,
          respiratoryRate: 16,
          temperature: 36.7,
          oxygenSaturation: 98,
          height: 170,
          weight: 65,
          recordedAt: new Date(),
          recordedBy: doctor._id
        },
        physicalExamination: {
          generalAppearance: 'Bệnh nhân tỉnh táo, tươi tỉnh',
          cardiovascular: 'Nhịp tim đều',
          respiratory: 'Phổi hai bên thông thoáng',
          abdominal: 'Bụng mềm',
          neurological: 'Ý thức tốt',
          musculoskeletal: 'Bình thường',
          skin: 'Da sạch',
          findings: 'Không phát hiện bất thường',
          observations: 'Bệnh nhân đã cải thiện',
          notes: 'Tình trạng sức khỏe cải thiện rõ rệt'
        },
        diagnoses: [
          {
            diagnosis: 'Đau đầu căng thẳng - đã cải thiện',
            code: 'G44.2',
            type: 'PRIMARY',
            certainty: 'CONFIRMED',
            notes: 'Các triệu chứng đã giảm'
          }
        ],
        treatmentPlan: {
          recommendations: 'Tiếp tục các biện pháp chung:\n1. Duy trì lối sống lành mạnh\n2. Ngủ đủ 7-8 giờ mỗi đêm\n3. Tập thể dục đều đặn\n4. Quản lý căng thẳng',
          followUp: {
            required: false,
            date: null,
            notes: 'Bệnh nhân có thể tự quản lý tại nhà. Tái khám nếu triệu chứng quay lại.'
          },
          referrals: [],
          medicalHistory: []
        },
        status: 'COMPLETED',
        privacyLevel: 'STANDARD',
        duration: 15,
        createdBy: doctor._id
      }
    ];

    // Lưu vào database
    console.log('📝 Đang tạo hồ sơ bệnh án mẫu...\n');
    
    const savedRecords = await MedicalRecord.insertMany(medicalRecords);

    console.log('✅ Tạo thành công!\n');
    console.log('📊 Thông tin hồ sơ bệnh án:');
    console.log('═══════════════════════════════════════════════════════════\n');

    savedRecords.forEach((record, index) => {
      console.log(`📋 Hồ sơ ${index + 1}:`);
      console.log(`   ID: ${record.recordId}`);
      console.log(`   Loại khám: ${record.visitType}`);
      console.log(`   Ngày khám: ${new Date(record.visitDate).toLocaleDateString('vi-VN')}`);
      console.log(`   Lý do khám: ${record.chiefComplaint}`);
      console.log(`   Chẩn đoán chính: ${record.diagnoses[0]?.diagnosis || 'N/A'}`);
      console.log(`   Trạng thái: ${record.status}`);
      console.log('───────────────────────────────────────────────────────────\n');
    });

    console.log('✨ Bạn có thể xem các hồ sơ này trong app:\n');
    console.log(`   Endpoint: GET /api/medicalRecord/patient/${patient._id}/records`);
    console.log(`   Hoặc xem chi tiết: GET /api/medicalRecord/{recordId}\n`);

    process.exit(0);

  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Chạy script
createSampleMedicalRecords();
