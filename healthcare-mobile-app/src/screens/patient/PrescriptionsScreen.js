import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Text, ActivityIndicator, Alert } from 'react-native';
import { useSelector } from 'react-redux';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Chip from '../../components/common/Chip';
import api from '../../services/api';

const PrescriptionsScreen = () => {
  const { user } = useSelector(state => state.auth);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPrescriptions();
  }, []);

  const loadPrescriptions = async () => {
    try {
      setLoading(true);
      
      // Lấy đơn thuốc theo userId của bệnh nhân đang đăng nhập
      const patientId = user?._id || user?.id;
      
      if (!patientId) {
        console.log('No patient ID found');
        setPrescriptions([]);
        return;
      }

      const response = await api.get(`/prescriptions/patients/${patientId}/prescriptions`);
      console.log('Prescriptions response:', response.data);
      
      if (response.data.success) {
        const data = response.data.data;
        // data có thể là { prescriptions: [...], pagination: {...} } hoặc trực tiếp là array
        const prescriptionsData = data.prescriptions || data || [];
        setPrescriptions(prescriptionsData);
      } else {
        setPrescriptions([]);
      }
    } catch (error) {
      console.error('Error loading prescriptions:', error);
      // Nếu lỗi 404 hoặc không có dữ liệu, không hiện alert
      if (error.response?.status !== 404) {
        Alert.alert('Lỗi', 'Không thể tải danh sách đơn thuốc');
      }
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPrescriptions();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    const statusUpper = status?.toUpperCase();
    switch (statusUpper) {
      case 'ACTIVE': return '#4caf50';
      case 'COMPLETED': 
      case 'DISPENSED': return '#2196f3';
      case 'CANCELLED': return '#f44336';
      case 'PARTIAL': return '#ff9800';
      case 'PENDING': return '#9e9e9e';
      default: return '#999';
    }
  };

  const getStatusText = (status) => {
    const statusUpper = status?.toUpperCase();
    switch (statusUpper) {
      case 'ACTIVE': return 'ĐANG SỬ DỤNG';
      case 'COMPLETED': return 'HOÀN THÀNH';
      case 'DISPENSED': return 'ĐÃ PHÁT THUỐC';
      case 'CANCELLED': return 'ĐÃ HỦY';
      case 'PARTIAL': return 'PHÁT MỘT PHẦN';
      case 'PENDING': return 'CHỜ XỬ LÝ';
      default: return status || 'N/A';
    }
  };

  // Helper để lấy thông tin thuốc từ prescription
  const formatMedication = (med) => {
    return {
      name: med.name || med.medicationId?.name || 'Không rõ',
      dosage: typeof med.dosage === 'object' 
        ? `${med.dosage.value || 1} ${med.dosage.unit || 'viên'}` 
        : med.dosage || '',
      frequency: typeof med.frequency === 'object'
        ? med.frequency.instructions || `${med.frequency.timesPerDay || 1} lần/ngày`
        : med.frequency || '',
      duration: typeof med.duration === 'object'
        ? `${med.duration.value || ''} ${med.duration.unit === 'days' ? 'ngày' : med.duration.unit || ''}`
        : med.duration || ''
    };
  };

  // Helper để lấy tên bác sĩ
  const getDoctorName = (prescription) => {
    if (prescription.doctorId?.personalInfo?.fullName) {
      return `BS. ${prescription.doctorId.personalInfo.fullName}`;
    }
    if (prescription.doctorId?.email) {
      return prescription.doctorId.email;
    }
    return 'Bác sĩ';
  };

  // Helper để lấy ngày kê đơn
  const getPrescriptionDate = (prescription) => {
    const dateStr = prescription.issueDate || prescription.createdAt;
    if (dateStr) {
      try {
        return format(new Date(dateStr), 'dd/MM/yyyy');
      } catch (e) {
        return 'N/A';
      }
    }
    return 'N/A';
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Đang tải đơn thuốc...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          Đơn thuốc
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Danh sách đơn thuốc được kê
        </Text>
      </View>

      {prescriptions.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content style={styles.emptyContent}>
            <MaterialIcons name="local-pharmacy" size={48} color="#ccc" />
            <Text variant="titleMedium" style={styles.emptyText}>
              Chưa có đơn thuốc
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              Các đơn thuốc được kê sẽ xuất hiện ở đây
            </Text>
          </Card.Content>
        </Card>
      ) : (
        prescriptions.map((prescription) => (
          <Card key={prescription._id || prescription.prescriptionId} style={styles.prescriptionCard}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <View>
                  <Text variant="titleMedium" style={styles.doctorName}>
                    {getDoctorName(prescription)}
                  </Text>
                  <Text variant="bodySmall" style={styles.date}>
                    {getPrescriptionDate(prescription)}
                  </Text>
                  <Text variant="bodySmall" style={styles.prescriptionId}>
                    Mã đơn: {prescription.prescriptionId || 'N/A'}
                  </Text>
                </View>
                <Chip 
                  mode="outlined"
                  textStyle={styles.chipText}
                  style={[styles.statusChip, { borderColor: getStatusColor(prescription.status) }]}
                >
                  <Text style={[styles.statusText, { color: getStatusColor(prescription.status) }]}>
                    {getStatusText(prescription.status)}
                  </Text>
                </Chip>
              </View>

              <View style={styles.medicationsSection}>
                <Text variant="titleSmall" style={styles.sectionTitle}>
                  Thuốc được kê ({prescription.medications?.length || 0})
                </Text>
                {prescription.medications?.map((med, index) => {
                  const formattedMed = formatMedication(med);
                  return (
                    <View key={index} style={styles.medicationItem}>
                      <View style={styles.medHeader}>
                        <MaterialIcons name="local-pharmacy" size={16} color="#4caf50" />
                        <Text variant="bodyMedium" style={styles.medName}>
                          {formattedMed.name}
                        </Text>
                      </View>
                      <View style={formattedMed.dosage ? styles.medDetails : null}>
                        {formattedMed.dosage && (
                          <Text variant="bodySmall" style={styles.medDetail}>
                            <Text style={styles.detailLabel}>Liều lượng: </Text>
                            {formattedMed.dosage}
                          </Text>
                        )}
                        {formattedMed.frequency && (
                          <Text variant="bodySmall" style={styles.medDetail}>
                            <Text style={styles.detailLabel}>Tần suất: </Text>
                            {formattedMed.frequency}
                          </Text>
                        )}
                        {formattedMed.duration && (
                          <Text variant="bodySmall" style={styles.medDetail}>
                            <Text style={styles.detailLabel}>Thời gian: </Text>
                            {formattedMed.duration}
                          </Text>
                        )}
                        {med.instructions && (
                          <Text variant="bodySmall" style={styles.medDetail}>
                            <Text style={styles.detailLabel}>Hướng dẫn: </Text>
                            {med.instructions}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>

              {(prescription.notes || prescription.specialInstructions) && (
                <View style={styles.instructionsSection}>
                  <Text variant="titleSmall" style={styles.sectionTitle}>
                    Ghi chú / Hướng dẫn
                  </Text>
                  <Text variant="bodyMedium" style={styles.instructionsText}>
                    {prescription.specialInstructions || prescription.notes}
                  </Text>
                </View>
              )}
            </Card.Content>
          </Card>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  header: {
    padding: 16,
    backgroundColor: 'white',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: '#666',
  },
  emptyCard: {
    margin: 16,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 16,
    color: '#666',
  },
  emptySubtext: {
    marginTop: 8,
    color: '#999',
    textAlign: 'center',
  },
  prescriptionCard: {
    margin: 16,
    marginTop: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  doctorName: {
    fontWeight: 'bold',
  },
  date: {
    color: '#666',
    marginTop: 2,
  },
  prescriptionId: {
    color: '#999',
    fontSize: 11,
    marginTop: 2,
  },
  statusChip: {
    height: 32,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  medicationsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  medicationItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  medHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  medName: {
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  medDetails: {
    paddingLeft: 24,
  },
  medDetail: {
    color: '#666',
    marginBottom: 2,
  },
  detailLabel: {
    fontWeight: '500',
    color: '#333',
  },
  instructionsSection: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
  },
  instructionsText: {
    color: '#1976d2',
    lineHeight: 20,
  },
});

export default PrescriptionsScreen;