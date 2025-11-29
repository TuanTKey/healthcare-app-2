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

const PatientMedicalRecordsScreen = ({ navigation }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredRecords, setFilteredRecords] = useState([]);

  useEffect(() => {
    loadMedicalRecords();
  }, []);

  useEffect(() => {
    filterRecords();
  }, [searchQuery, records]);

  const loadMedicalRecords = async () => {
    try {
      setLoading(true);
      console.log('📋 Fetching all medical records');
      
      const response = await api.get('/medicalRecord');
      console.log('📋 Medical records response:', response.data);
      
      let recordsList = [];
      if (response.data?.data?.medicalRecords && Array.isArray(response.data.data.medicalRecords)) {
        recordsList = response.data.data.medicalRecords;
      } else if (response.data?.data?.data && Array.isArray(response.data.data.data)) {
        recordsList = response.data.data.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        recordsList = response.data.data;
      } else if (Array.isArray(response.data)) {
        recordsList = response.data;
      }
      
      setRecords(recordsList);
    } catch (error) {
      console.error('❌ Lỗi tải hồ sơ bệnh án:', error.message);
      Alert.alert('Lỗi', 'Không thể tải danh sách hồ sơ bệnh án');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const filterRecords = () => {
    if (!searchQuery.trim()) {
      setFilteredRecords(records);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = records.filter(record => {
      const patientName = record.patientId?.personalInfo?.firstName || '';
      const patientEmail = record.patientId?.email || '';
      const recordId = record.recordId || '';
      const doctorName = record.doctorId?.personalInfo?.firstName || '';

      return (
        patientName.toLowerCase().includes(query) ||
        patientEmail.toLowerCase().includes(query) ||
        recordId.toLowerCase().includes(query) ||
        doctorName.toLowerCase().includes(query)
      );
    });

    setFilteredRecords(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMedicalRecords();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED':
        return '#4CAF50';
      case 'DRAFT':
        return '#FF9800';
      case 'ARCHIVED':
        return '#9E9E9E';
      default:
        return '#1976d2';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'COMPLETED':
        return 'HOÀN THÀNH';
      case 'DRAFT':
        return 'ĐANG SOẠN';
      case 'ARCHIVED':
        return 'ĐÃ LƯU TRỮ';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Đang tải hồ sơ bệnh án...</Text>
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
          Quản Lý Hồ Sơ Bệnh Án
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Tổng cộng: {filteredRecords.length} hồ sơ
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          placeholder="Tìm kiếm theo tên bệnh nhân, ID, bác sĩ..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          mode="outlined"
          style={styles.searchInput}
        />
      </View>

      {filteredRecords.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content style={styles.emptyContent}>
            <MaterialIcons name="folder-open" size={48} color="#ccc" />
            <Text variant="titleMedium" style={styles.emptyText}>
              Không tìm thấy hồ sơ
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              {searchQuery ? 'Thử tìm kiếm với từ khóa khác' : 'Chưa có hồ sơ bệnh án'}
            </Text>
          </Card.Content>
        </Card>
      ) : (
        filteredRecords.map((record, index) => (
          <Card key={record._id || index} style={styles.recordCard}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <View style={styles.headerInfo}>
                  <Text variant="titleSmall" style={styles.recordId}>
                    {record.recordId}
                  </Text>
                  <Text variant="bodySmall" style={styles.patientName}>
                    Bệnh nhân: {record.patientId?.personalInfo?.firstName || 'N/A'}
                  </Text>
                </View>
                <Chip
                  style={{ backgroundColor: getStatusColor(record.status) }}
                  textStyle={{ color: 'white' }}
                  label={getStatusLabel(record.status)}
                />
              </View>

              <View style={{height: 1, backgroundColor: '#ccc', marginVertical: 10}} />

              <View style={styles.infoRow}>
                <MaterialIcons name="event" size={16} color="#666" />
                <Text variant="bodySmall" style={styles.infoText}>
                  {format(new Date(record.visitDate), 'dd/MM/yyyy', { locale: vi })}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <MaterialIcons name="person" size={16} color="#666" />
                <Text variant="bodySmall" style={styles.infoText}>
                  Bác sĩ: {record.doctorId?.personalInfo?.firstName || record.doctorId?.email || 'N/A'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <MaterialIcons name="business" size={16} color="#666" />
                <Text variant="bodySmall" style={styles.infoText}>
                  {record.department}
                </Text>
              </View>

              {record.chiefComplaint && (
                <View style={styles.complaintSection}>
                  <Text variant="bodySmall" style={styles.complaintLabel}>
                    Lý do khám:
                  </Text>
                  <Text variant="bodySmall" style={styles.complaintText}>
                    {record.chiefComplaint}
                  </Text>
                </View>
              )}

              <Button
                mode="outlined"
                style={styles.detailButton}
                icon="eye"
                onPress={() => navigation.navigate('MedicalRecordDetail', { recordId: record.recordId || record._id })}
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
  recordCard: {
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
  recordId: {
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 4,
  },
  patientName: {
    color: '#333',
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
    flex: 1,
  },
  complaintSection: {
    marginTop: 8,
    marginBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  complaintLabel: {
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  complaintText: {
    color: '#333',
    lineHeight: 18,
  },
  detailButton: {
    marginTop: 8,
  },
});

export default PatientMedicalRecordsScreen;
