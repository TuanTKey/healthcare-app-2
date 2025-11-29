import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, Text, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import api from '../../services/api';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Chip from '../../components/common/Chip';

const PrescriptionDetailScreen = ({ route, navigation }) => {
  const { prescriptionId } = route.params;
  
  const [prescription, setPrescription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPrescription();
  }, []);

  const loadPrescription = async () => {
    try {
      setLoading(true);
      console.log('💊 Fetching prescription details:', prescriptionId);
      
      const response = await api.get(`/prescriptions/${prescriptionId}`);
      console.log('💊 Prescription response:', JSON.stringify(response.data, null, 2));
      
      // Handle different response formats
      let prescriptionData = null;
      if (response.data?.data?.data) {
        prescriptionData = response.data.data.data;
      } else if (response.data?.data) {
        prescriptionData = response.data.data;
      } else if (response.data?.prescription) {
        prescriptionData = response.data.prescription;
      } else {
        prescriptionData = response.data;
      }
      
      console.log('💊 Extracted prescription:', prescriptionData);
      setPrescription(prescriptionData);
    } catch (error) {
      console.error('❌ Lỗi tải chi tiết đơn thuốc:', error.message);
      console.error('❌ Error details:', error.response?.data);
      Alert.alert('Lỗi', 'Không thể tải chi tiết đơn thuốc');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPrescription();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return '#4CAF50';
      case 'COMPLETED':
        return '#2196F3';
      case 'EXPIRED':
        return '#FF9800';
      case 'CANCELLED':
        return '#F44336';
      default:
        return '#1976d2';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'ĐANG HIỆU LỰC';
      case 'COMPLETED':
        return 'HOÀN THÀNH';
      case 'EXPIRED':
        return 'HẾT HẠN';
      case 'CANCELLED':
        return 'HỦY BỎ';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Đang tải chi tiết...</Text>
      </View>
    );
  }

  if (!prescription) {
    return (
      <View style={styles.centerContainer}>
        <MaterialIcons name="error-outline" size={48} color="#FF9800" />
        <Text style={styles.errorText}>Không thể tải chi tiết đơn thuốc</Text>
        <Button mode="contained" style={styles.retryButton} onPress={loadPrescription}>
          Thử lại
        </Button>
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
      {/* Header */}
      <Card style={styles.headerCard}>
        <Card.Content>
          <View style={styles.headerRow}>
            <View style={styles.headerInfo}>
              <Text variant="headlineSmall" style={styles.prescriptionId}>
                {prescription.prescriptionId || 'N/A'}
              </Text>
              <Text variant="bodySmall" style={styles.docName}>
                Bác sĩ: {prescription.doctorId?.personalInfo?.firstName || 'N/A'}
              </Text>
            </View>
            <Chip
              style={{ backgroundColor: getStatusColor(prescription.status) }}
              textStyle={{ color: 'white' }}
              label={getStatusLabel(prescription.status)}
            />
          </View>
          
          <View style={{height: 1, backgroundColor: '#ccc', marginVertical: 10}} />
          
          <View style={styles.patientSection}>
            <MaterialIcons name="person" size={18} color="#666" />
            <Text variant="bodySmall" style={styles.patientName}>
              {prescription.patientId?.personalInfo?.firstName || 'Bệnh nhân N/A'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="event" size={16} color="#666" />
            <Text variant="bodySmall" style={styles.infoText}>
              Ngày cấp: {format(new Date(prescription.issueDate), 'dd/MM/yyyy', { locale: vi })}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="calendar-today" size={16} color="#666" />
            <Text variant="bodySmall" style={styles.infoText}>
              Hiệu lực: {prescription.validityDays || 30} ngày
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Medications */}
      <Card style={styles.medicationsCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            🔬 Danh sách thuốc ({prescription.medications?.length || 0})
          </Text>
          
          {prescription.medications && prescription.medications.length > 0 ? (
            prescription.medications.map((med, index) => (
              <View key={index} style={styles.medicationItem}>
                <View style={styles.medHeader}>
                  <Text variant="titleSmall" style={styles.medName}>
                    {med.name || med.medicationId?.name || 'Thuốc N/A'}
                  </Text>
                  {med.genericName && (
                    <Text variant="bodySmall" style={styles.genericName}>
                      ({med.genericName})
                    </Text>
                  )}
                </View>

                <View style={styles.medDetail}>
                  <Text variant="bodySmall" style={styles.medDetailLabel}>
                    📏 Liều lượng:
                  </Text>
                  <Text variant="bodySmall" style={styles.medDetailValue}>
                    {med.dosage?.value || 'N/A'} {med.dosage?.unit || 'N/A'} {med.dosage?.form ? `- ${med.dosage.form}` : ''}
                  </Text>
                </View>

                <View style={styles.medDetail}>
                  <Text variant="bodySmall" style={styles.medDetailLabel}>
                    ⏱️ Tần suất:
                  </Text>
                  <Text variant="bodySmall" style={styles.medDetailValue}>
                    {med.frequency?.instructions || `${med.frequency?.timesPerDay || 'N/A'} lần/ngày`}
                  </Text>
                </View>

                <View style={styles.medDetail}>
                  <Text variant="bodySmall" style={styles.medDetailLabel}>
                    📅 Thời gian:
                  </Text>
                  <Text variant="bodySmall" style={styles.medDetailValue}>
                    {med.duration?.value || 'N/A'} {med.duration?.unit || 'ngày'}
                  </Text>
                </View>

                <View style={styles.medDetail}>
                  <Text variant="bodySmall" style={styles.medDetailLabel}>
                    💊 Số lượng:
                  </Text>
                  <Text variant="bodySmall" style={styles.medDetailValue}>
                    {med.totalQuantity || 'N/A'} {med.form || 'viên'}
                  </Text>
                </View>

                {med.route && (
                  <View style={styles.medDetail}>
                    <Text variant="bodySmall" style={styles.medDetailLabel}>
                      🔀 Đường dùng:
                    </Text>
                    <Text variant="bodySmall" style={styles.medDetailValue}>
                      {med.route || 'N/A'}
                    </Text>
                  </View>
                )}

                {index < prescription.medications.length - 1 && (
                  <View style={{height: 1, backgroundColor: '#ccc', marginVertical: 10}} />
                )}
              </View>
            ))
          ) : (
            <Text variant="bodySmall" style={styles.emptyText}>
              Không có thuốc nào
            </Text>
          )}
        </Card.Content>
      </Card>

      {/* Additional Info */}
      {prescription.notes && (
        <Card style={styles.notesCard}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              📝 Ghi chú
            </Text>
            <Text variant="bodySmall" style={styles.notesText}>
              {prescription.notes}
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Button 
          mode="outlined" 
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          Quay lại
        </Button>
        <Button 
          mode="contained" 
          style={styles.button}
          onPress={() => console.log('In đơn thuốc')}
        >
          In đơn
        </Button>
      </View>

      <View style={styles.spacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
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
  errorText: {
    marginTop: 16,
    color: '#FF9800',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
  },
  headerCard: {
    marginBottom: 16,
    backgroundColor: 'white',
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerInfo: {
    flex: 1,
  },
  prescriptionId: {
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 4,
  },
  docName: {
    color: '#666',
    marginTop: 4,
  },
  divider: {
    marginVertical: 12,
  },
  patientSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  patientName: {
    marginLeft: 8,
    color: '#333',
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  infoText: {
    marginLeft: 8,
    color: '#666',
  },
  medicationsCard: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  medicationItem: {
    paddingVertical: 12,
  },
  medHeader: {
    marginBottom: 8,
  },
  medName: {
    fontWeight: 'bold',
    color: '#1976d2',
  },
  genericName: {
    color: '#999',
    marginTop: 2,
  },
  medDetail: {
    flexDirection: 'row',
    marginTop: 6,
    alignItems: 'flex-start',
  },
  medDetailLabel: {
    color: '#666',
    minWidth: 100,
    fontWeight: '500',
  },
  medDetailValue: {
    color: '#333',
    flex: 1,
  },
  medDivider: {
    marginVertical: 12,
  },
  emptyText: {
    color: '#999',
    textAlign: 'center',
    paddingVertical: 16,
  },
  notesCard: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  notesText: {
    color: '#333',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 16,
  },
  button: {
    flex: 1,
  },
  spacer: {
    height: 20,
  },
});

export default PrescriptionDetailScreen;
