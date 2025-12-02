import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../services/api';

const DoctorRecordDetail = ({ navigation, route }) => {
  const { recordId } = route.params;
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchRecordDetail();
  }, [recordId]);

  const fetchRecordDetail = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/medical-records/${recordId}`);
      
      console.log('📋 Record detail response:', JSON.stringify(response.data, null, 2));
      
      if (response.data?.data) {
        setRecord(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching record:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin hồ sơ bệnh án');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRecordDetail();
    setRefreshing(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get patient name
  const getPatientName = () => {
    if (record?.patientId?.personalInfo) {
      const info = record.patientId.personalInfo;
      return `${info.firstName || ''} ${info.lastName || ''}`.trim() || record.patientId.email || 'N/A';
    }
    return 'N/A';
  };

  // Get doctor name
  const getDoctorName = () => {
    if (record?.doctorId?.personalInfo) {
      const info = record.doctorId.personalInfo;
      return `${info.firstName || ''} ${info.lastName || ''}`.trim() || 'N/A';
    }
    return 'N/A';
  };

  const getVisitTypeText = (type) => {
    const types = {
      'OUTPATIENT': 'Ngoại trú',
      'INPATIENT': 'Nội trú',
      'EMERGENCY': 'Cấp cứu',
      'FOLLOW_UP': 'Tái khám',
      'CONSULTATION': 'Tư vấn'
    };
    return types[type] || type || 'N/A';
  };

  const getStatusColor = (status) => {
    const colors = {
      'DRAFT': '#FF9800',
      'COMPLETED': '#4CAF50',
      'CANCELLED': '#F44336'
    };
    return colors[status] || '#999';
  };

  const getStatusText = (status) => {
    const texts = {
      'DRAFT': 'Bản nháp',
      'COMPLETED': 'Hoàn thành',
      'CANCELLED': 'Đã hủy'
    };
    return texts[status] || status || 'N/A';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00796B" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  if (!record) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={64} color="#ccc" />
        <Text style={styles.errorText}>Không tìm thấy hồ sơ bệnh án</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchRecordDetail}>
          <Text style={styles.retryText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#00796B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi Tiết Hồ Sơ</Text>
        <TouchableOpacity onPress={onRefresh}>
          <MaterialIcons name="refresh" size={24} color="#00796B" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00796B']} />
        }
      >
        {/* Record ID & Status */}
        <View style={styles.section}>
          <View style={styles.recordHeader}>
            <View>
              <Text style={styles.recordId}>Mã: {record.recordId || record._id?.slice(-8)}</Text>
              <Text style={styles.recordDate}>{formatDate(record.visitDate || record.createdAt)}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(record.status) }]}>
              <Text style={styles.statusText}>{getStatusText(record.status)}</Text>
            </View>
          </View>
        </View>

        {/* Patient Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <MaterialIcons name="person" size={18} color="#00796B" /> Thông tin bệnh nhân
          </Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Họ tên:</Text>
              <Text style={styles.infoValue}>{getPatientName()}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{record.patientId?.email || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>SĐT:</Text>
              <Text style={styles.infoValue}>{record.patientId?.phone || 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* Visit Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <MaterialIcons name="medical-services" size={18} color="#00796B" /> Thông tin khám
          </Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Loại khám:</Text>
              <Text style={styles.infoValue}>{getVisitTypeText(record.visitType)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Khoa:</Text>
              <Text style={styles.infoValue}>{record.department || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Bác sĩ:</Text>
              <Text style={styles.infoValue}>BS. {getDoctorName()}</Text>
            </View>
          </View>
        </View>

        {/* Chief Complaint */}
        {record.chiefComplaint && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <MaterialIcons name="report-problem" size={18} color="#FF9800" /> Lý do khám
            </Text>
            <View style={styles.infoCard}>
              <Text style={styles.paragraphText}>{record.chiefComplaint}</Text>
            </View>
          </View>
        )}

        {/* History of Present Illness */}
        {record.historyOfPresentIllness && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <MaterialIcons name="history" size={18} color="#2196F3" /> Tiền sử bệnh
            </Text>
            <View style={styles.infoCard}>
              <Text style={styles.paragraphText}>{record.historyOfPresentIllness}</Text>
            </View>
          </View>
        )}

        {/* Symptoms */}
        {record.symptoms && record.symptoms.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <MaterialIcons name="healing" size={18} color="#E91E63" /> Triệu chứng
            </Text>
            <View style={styles.infoCard}>
              {record.symptoms.map((symptom, index) => (
                <View key={index} style={styles.symptomItem}>
                  <Text style={styles.symptomName}>• {symptom.symptom || symptom}</Text>
                  {symptom.severity && (
                    <Text style={styles.symptomDetail}>Mức độ: {symptom.severity}</Text>
                  )}
                  {symptom.duration && (
                    <Text style={styles.symptomDetail}>Thời gian: {symptom.duration}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Vital Signs */}
        {record.vitalSigns && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <MaterialIcons name="favorite" size={18} color="#F44336" /> Sinh hiệu
            </Text>
            <View style={styles.vitalSignsGrid}>
              {record.vitalSigns.bloodPressure && (
                <View style={styles.vitalItem}>
                  <MaterialIcons name="speed" size={24} color="#E91E63" />
                  <Text style={styles.vitalValue}>
                    {record.vitalSigns.bloodPressure.systolic}/{record.vitalSigns.bloodPressure.diastolic}
                  </Text>
                  <Text style={styles.vitalLabel}>Huyết áp</Text>
                </View>
              )}
              {record.vitalSigns.heartRate && (
                <View style={styles.vitalItem}>
                  <MaterialIcons name="favorite" size={24} color="#F44336" />
                  <Text style={styles.vitalValue}>{record.vitalSigns.heartRate}</Text>
                  <Text style={styles.vitalLabel}>Nhịp tim</Text>
                </View>
              )}
              {record.vitalSigns.temperature && (
                <View style={styles.vitalItem}>
                  <MaterialIcons name="thermostat" size={24} color="#FF9800" />
                  <Text style={styles.vitalValue}>{record.vitalSigns.temperature}°C</Text>
                  <Text style={styles.vitalLabel}>Nhiệt độ</Text>
                </View>
              )}
              {record.vitalSigns.weight && (
                <View style={styles.vitalItem}>
                  <MaterialIcons name="fitness-center" size={24} color="#4CAF50" />
                  <Text style={styles.vitalValue}>{record.vitalSigns.weight} kg</Text>
                  <Text style={styles.vitalLabel}>Cân nặng</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Diagnoses */}
        {record.diagnoses && record.diagnoses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <MaterialIcons name="local-hospital" size={18} color="#9C27B0" /> Chẩn đoán
            </Text>
            <View style={styles.infoCard}>
              {record.diagnoses.map((diag, index) => (
                <View key={index} style={styles.diagnosisItem}>
                  <Text style={styles.diagnosisCode}>{diag.code || `#${index + 1}`}</Text>
                  <Text style={styles.diagnosisDesc}>{diag.description || diag}</Text>
                  {diag.type && (
                    <Text style={styles.diagnosisType}>Loại: {diag.type}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Physical Examination */}
        {record.physicalExamination && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <MaterialIcons name="assignment" size={18} color="#607D8B" /> Khám lâm sàng
            </Text>
            <View style={styles.infoCard}>
              {record.physicalExamination.generalAppearance && (
                <View style={styles.examItem}>
                  <Text style={styles.examLabel}>Tổng quát:</Text>
                  <Text style={styles.examValue}>{record.physicalExamination.generalAppearance}</Text>
                </View>
              )}
              {record.physicalExamination.findings && (
                <View style={styles.examItem}>
                  <Text style={styles.examLabel}>Phát hiện:</Text>
                  <Text style={styles.examValue}>{record.physicalExamination.findings}</Text>
                </View>
              )}
              {record.physicalExamination.notes && (
                <View style={styles.examItem}>
                  <Text style={styles.examLabel}>Ghi chú:</Text>
                  <Text style={styles.examValue}>{record.physicalExamination.notes}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Treatment Plan */}
        {record.treatmentPlan && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <MaterialIcons name="healing" size={18} color="#00BCD4" /> Phương án điều trị
            </Text>
            <View style={styles.infoCard}>
              <Text style={styles.paragraphText}>
                {typeof record.treatmentPlan === 'string' 
                  ? record.treatmentPlan 
                  : record.treatmentPlan.description || JSON.stringify(record.treatmentPlan)}
              </Text>
            </View>
          </View>
        )}

        {/* Notes */}
        {record.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <MaterialIcons name="note" size={18} color="#795548" /> Ghi chú
            </Text>
            <View style={styles.infoCard}>
              <Text style={styles.paragraphText}>{record.notes}</Text>
            </View>
          </View>
        )}

        {/* Timestamps */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <MaterialIcons name="access-time" size={18} color="#9E9E9E" /> Thời gian
          </Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ngày tạo:</Text>
              <Text style={styles.infoValue}>{formatDate(record.createdAt)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Cập nhật:</Text>
              <Text style={styles.infoValue}>{formatDate(record.updatedAt)}</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5'
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999'
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#00796B',
    borderRadius: 8
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  content: {
    flex: 1
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  recordId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00796B'
  },
  recordDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 4
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12
  },
  infoCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  infoLabel: {
    fontSize: 14,
    color: '#666'
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right'
  },
  paragraphText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22
  },
  symptomItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  symptomName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333'
  },
  symptomDetail: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginLeft: 12
  },
  vitalSignsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around'
  },
  vitalItem: {
    alignItems: 'center',
    width: '45%',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    marginBottom: 12
  },
  vitalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8
  },
  vitalLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4
  },
  diagnosisItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  diagnosisCode: {
    fontSize: 12,
    color: '#9C27B0',
    fontWeight: 'bold'
  },
  diagnosisDesc: {
    fontSize: 14,
    color: '#333',
    marginTop: 4
  },
  diagnosisType: {
    fontSize: 12,
    color: '#666',
    marginTop: 4
  },
  examItem: {
    marginBottom: 12
  },
  examLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  examValue: {
    fontSize: 14,
    color: '#333'
  }
});

export default DoctorRecordDetail;
