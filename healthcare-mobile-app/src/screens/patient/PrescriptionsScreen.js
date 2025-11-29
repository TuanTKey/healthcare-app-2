import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Text, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Chip from '../../components/common/Chip';

const PrescriptionsScreen = () => {
  const { user } = useSelector(state => state.auth);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const mockPrescriptions = [
    {
      id: '1',
      date: '2024-01-15',
      doctor: 'BS. Nguyễn Văn A',
      medications: [
        { name: 'Amoxicillin 500mg', dosage: '1 viên', frequency: '3 lần/ngày', duration: '7 ngày' },
        { name: 'Paracetamol 500mg', dosage: '1 viên', frequency: 'Khi sốt', duration: '3 ngày' }
      ],
      status: 'active',
      instructions: 'Uống sau ăn. Tái khám sau 7 ngày.'
    },
    {
      id: '2',
      date: '2024-01-10',
      doctor: 'BS. Trần Thị B',
      medications: [
        { name: 'Loratadine 10mg', dosage: '1 viên', frequency: '1 lần/ngày', duration: '10 ngày' },
        { name: 'Kem bôi Cortioid', dosage: 'lượng nhỏ', frequency: '2 lần/ngày', duration: '7 ngày' }
      ],
      status: 'completed',
      instructions: 'Bôi kem lên vùng da tổn thương. Tránh tiếp xúc ánh nắng.'
    }
  ];

  useEffect(() => {
    loadPrescriptions();
  }, []);

  const loadPrescriptions = async () => {
    setLoading(true);
    setTimeout(() => {
      setPrescriptions(mockPrescriptions);
      setLoading(false);
    }, 1000);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPrescriptions();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#4caf50';
      case 'completed': return '#2196f3';
      case 'cancelled': return '#f44336';
      default: return '#999';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'ĐANG SỬ DỤNG';
      case 'completed': return 'HOÀN THÀNH';
      case 'cancelled': return 'ĐÃ HỦY';
      default: return status;
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
          <Card key={prescription.id} style={styles.prescriptionCard}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <View>
                  <Text variant="titleMedium" style={styles.doctorName}>
                    {prescription.doctor}
                  </Text>
                  <Text variant="bodySmall" style={styles.date}>
                    {format(new Date(prescription.date), 'dd/MM/yyyy')}
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
                  Thuốc được kê
                </Text>
                {prescription.medications.map((med, index) => (
                  <View key={index} style={styles.medicationItem}>
                    <View style={styles.medHeader}>
                      <MaterialIcons name="local-pharmacy" size={16} color="#4caf50" />
                      <Text variant="bodyMedium" style={styles.medName}>
                        {med.name}
                      </Text>
                    </View>
                    <View style={med.dosage ? styles.medDetails : null}>
                      {med.dosage && (
                        <Text variant="bodySmall" style={styles.medDetail}>
                          <Text style={styles.detailLabel}>Liều lượng: </Text>
                          {med.dosage}
                        </Text>
                      )}
                      {med.frequency && (
                        <Text variant="bodySmall" style={styles.medDetail}>
                          <Text style={styles.detailLabel}>Tần suất: </Text>
                          {med.frequency}
                        </Text>
                      )}
                      {med.duration && (
                        <Text variant="bodySmall" style={styles.medDetail}>
                          <Text style={styles.detailLabel}>Thời gian: </Text>
                          {med.duration}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>

              {prescription.instructions && (
                <View style={styles.instructionsSection}>
                  <Text variant="titleSmall" style={styles.sectionTitle}>
                    Hướng dẫn sử dụng
                  </Text>
                  <Text variant="bodyMedium" style={styles.instructionsText}>
                    {prescription.instructions}
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