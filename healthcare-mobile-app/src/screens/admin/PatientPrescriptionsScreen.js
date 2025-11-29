import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, Text, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import api from '../../services/api';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Chip from '../../components/common/Chip';
import TextInput from '../../components/common/TextInput';

const PatientPrescriptionsScreen = ({ navigation }) => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPrescriptions, setFilteredPrescriptions] = useState([]);

  useEffect(() => {
    loadPrescriptions();
  }, []);

  useEffect(() => {
    filterPrescriptions();
  }, [searchQuery, prescriptions]);

  const loadPrescriptions = async () => {
    try {
      setLoading(true);
      console.log('💊 Fetching all prescriptions');
      
      const response = await api.get('/prescriptions');
      console.log('💊 Prescriptions response structure:', Object.keys(response.data));
      console.log('💊 Full response:', JSON.stringify(response.data, null, 2));
      
      let prescriptionsList = [];
      // Service returns { success, data: { data: [...], pagination: {...} } }
      if (response.data?.data?.data) {
        // data.data is the wrapper object with data array and pagination
        if (Array.isArray(response.data.data.data)) {
          prescriptionsList = response.data.data.data;
        } else if (Array.isArray(response.data.data)) {
          // Fallback: data.data might be directly the array
          prescriptionsList = response.data.data;
        }
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        prescriptionsList = response.data.data;
      } else if (Array.isArray(response.data)) {
        prescriptionsList = response.data;
      }
      
      console.log('💊 Extracted prescriptions count:', prescriptionsList.length);
      console.log('💊 Sample prescription:', prescriptionsList[0]);
      setPrescriptions(prescriptionsList);
    } catch (error) {
      console.error('❌ Lỗi tải đơn thuốc:', error.message);
      console.error('❌ Error details:', error.response?.data);
      Alert.alert('Lỗi', 'Không thể tải danh sách đơn thuốc');
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const filterPrescriptions = () => {
    if (!searchQuery.trim()) {
      setFilteredPrescriptions(prescriptions);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = prescriptions.filter(prescription => {
      const patientName = prescription.patientId?.personalInfo?.firstName || '';
      const patientEmail = prescription.patientId?.email || '';
      const doctorName = prescription.doctorId?.personalInfo?.firstName || '';

      return (
        patientName.toLowerCase().includes(query) ||
        patientEmail.toLowerCase().includes(query) ||
        doctorName.toLowerCase().includes(query)
      );
    });

    setFilteredPrescriptions(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPrescriptions();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ISSUED':
        return '#2196F3';
      case 'FILLED':
        return '#4CAF50';
      case 'CANCELLED':
        return '#F44336';
      case 'EXPIRED':
        return '#9E9E9E';
      default:
        return '#FF9800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'ISSUED':
        return 'ĐÃ CẤP';
      case 'FILLED':
        return 'ĐÃ PHÁT';
      case 'CANCELLED':
        return 'HỦY BỎ';
      case 'EXPIRED':
        return 'HẾT HẠN';
      default:
        return status;
    }
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
          Quản Lý Đơn Thuốc
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Tổng cộng: {filteredPrescriptions.length} đơn thuốc
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          placeholder="Tìm kiếm theo tên bệnh nhân, bác sĩ..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          mode="outlined"
          style={styles.searchInput}
        />
      </View>

      {filteredPrescriptions.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content style={styles.emptyContent}>
            <MaterialIcons name="local-pharmacy" size={48} color="#ccc" />
            <Text variant="titleMedium" style={styles.emptyText}>
              Không tìm thấy đơn thuốc
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              {searchQuery ? 'Thử tìm kiếm với từ khóa khác' : 'Chưa có đơn thuốc'}
            </Text>
          </Card.Content>
        </Card>
      ) : (
        filteredPrescriptions.map((prescription, index) => (
          <Card key={prescription._id || index} style={styles.prescriptionCard}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <View style={styles.headerInfo}>
                  <Text variant="titleSmall" style={styles.patientName}>
                    {prescription.patientId?.personalInfo?.firstName || 'Bệnh nhân N/A'}
                  </Text>
                  <Text variant="bodySmall" style={styles.doctorName}>
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

              <View style={styles.infoRow}>
                <MaterialIcons name="event" size={16} color="#666" />
                <Text variant="bodySmall" style={styles.infoText}>
                  {format(new Date(prescription.createdAt), 'dd/MM/yyyy', { locale: vi })}
                </Text>
              </View>

              {prescription.medications && prescription.medications.length > 0 && (
                <View style={styles.medicationSection}>
                  <Text variant="bodySmall" style={styles.sectionTitle}>
                    Thuốc được kê:
                  </Text>
                  {prescription.medications.slice(0, 3).map((med, idx) => (
                    <Text key={idx} variant="bodySmall" style={styles.medicationItem}>
                      • {med.name || med.medicationId?.name} {med.dosage?.value && `- ${med.dosage.value}${med.dosage.unit}`}
                    </Text>
                  ))}
                  {prescription.medications.length > 3 && (
                    <Text variant="bodySmall" style={styles.medicationItem}>
                      +{prescription.medications.length - 3} loại khác
                    </Text>
                  )}
                </View>
              )}

              <Button
                mode="outlined"
                style={styles.detailButton}
                icon="eye"
                onPress={() => navigation.navigate('PrescriptionDetail', { prescriptionId: prescription._id })}
              >
                Xem Chi Tiết
              </Button>
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
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: '#666',
  },
  searchContainer: {
    padding: 16,
  },
  searchInput: {
    elevation: 0,
    backgroundColor: 'white',
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
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerInfo: {
    flex: 1,
  },
  patientName: {
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  doctorName: {
    color: '#666',
    marginTop: 2,
  },
  divider: {
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    marginLeft: 8,
    color: '#333',
  },
  medicationSection: {
    marginTop: 8,
    marginBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  sectionTitle: {
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  medicationItem: {
    color: '#333',
    marginLeft: 8,
    marginTop: 2,
  },
  moreText: {
    color: '#2196F3',
    marginLeft: 8,
    marginTop: 4,
    fontWeight: '500',
  },
  detailButton: {
    marginTop: 8,
  },
});

export default PatientPrescriptionsScreen;
