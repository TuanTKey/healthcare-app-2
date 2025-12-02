import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Text, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import api from '../../services/api';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';

const MedicalRecordsScreen = ({ navigation }) => {
  const { user } = useSelector(state => state.auth);
  const [records, setRecords] = useState([]);
  const [medicalRecordId, setMedicalRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRecords();
  }, [user?._id]);

  const loadRecords = async () => {
    try {
      setLoading(true);
      if (!user?._id) return;

      console.log('📋 Fetching medical records for patient:', user._id);
      const response = await api.get(`/medical-records/patient/${user._id}/records`);
      console.log('📋 Medical records response:', response.data);
      
      // Parse response - API trả về { medicalRecord, visits, pagination }
      let recordsList = [];
      let recordId = null;
      
      if (response.data?.data?.visits && Array.isArray(response.data.data.visits)) {
        // Cấu trúc mới: lấy danh sách visits và recordId
        recordsList = response.data.data.visits;
        recordId = response.data.data.medicalRecord?.recordId;
      } else if (response.data?.data?.medicalRecords && Array.isArray(response.data.data.medicalRecords)) {
        recordsList = response.data.data.medicalRecords;
      } else if (response.data?.data?.data && Array.isArray(response.data.data.data)) {
        recordsList = response.data.data.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        recordsList = response.data.data;
      } else if (Array.isArray(response.data)) {
        recordsList = response.data;
      }
      
      console.log('📋 Parsed records/visits count:', recordsList.length, 'recordId:', recordId);
      setRecords(recordsList);
      setMedicalRecordId(recordId);
    } catch (error) {
      console.error('⚠️ Lỗi tải hồ sơ bệnh án:', error.message);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecords();
    setRefreshing(false);
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
          Hồ sơ bệnh án ({records.length})
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Lịch sử khám chữa bệnh của bạn
        </Text>
      </View>

      {records.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content style={styles.emptyContent}>
            <MaterialIcons name="folder-open" size={48} color="#ccc" />
            <Text variant="titleMedium" style={styles.emptyText}>
              Chưa có lượt khám nào
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              Lịch sử khám chữa bệnh sẽ xuất hiện ở đây
            </Text>
          </Card.Content>
        </Card>
      ) : (
        records.map((visit, index) => (
          <Card key={visit._id || visit.visitId || index} style={styles.recordCard}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <View style={styles.dateSection}>
                  <Text variant="bodySmall" style={styles.dateLabel}>
                    NGÀY KHÁM
                  </Text>
                  <Text variant="titleMedium" style={styles.date}>
                    {visit.visitDate ? format(new Date(visit.visitDate), 'dd/MM/yyyy') : 'N/A'}
                  </Text>
                </View>
                <View style={[styles.statusBadge, visit.status === 'COMPLETED' && styles.completedBadge]}>
                  <Text style={styles.statusText}>
                    {visit.status === 'COMPLETED' ? 'HOÀN THÀNH' : visit.status || 'ĐANG ĐIỀU TRỊ'}
                  </Text>
                </View>
              </View>

              <View style={{height: 1, backgroundColor: '#ccc', marginVertical: 10}} />

              <View style={styles.infoSection}>
                {visit.doctorId && (
                  <View style={styles.infoRow}>
                    <MaterialIcons name="person" size={16} color="#666" />
                    <Text variant="bodyMedium" style={styles.infoText}>
                      BS. {visit.doctorId?.personalInfo?.lastName || ''} {visit.doctorId?.personalInfo?.firstName || 'N/A'}
                    </Text>
                  </View>
                )}
                
                {visit.department && (
                  <View style={styles.infoRow}>
                    <MaterialIcons name="business" size={16} color="#666" />
                    <Text variant="bodyMedium" style={styles.infoText}>
                      {visit.department}
                    </Text>
                  </View>
                )}

                {visit.visitType && (
                  <View style={styles.infoRow}>
                    <MaterialIcons name="local-hospital" size={16} color="#666" />
                    <Text variant="bodyMedium" style={styles.infoText}>
                      {visit.visitType === 'OUTPATIENT' ? 'Ngoại trú' : 
                       visit.visitType === 'INPATIENT' ? 'Nội trú' :
                       visit.visitType === 'EMERGENCY' ? 'Cấp cứu' :
                       visit.visitType === 'FOLLOW_UP' ? 'Tái khám' : visit.visitType}
                    </Text>
                  </View>
                )}
              </View>

              {visit.chiefComplaint && (
                <View style={styles.diagnosisSection}>
                  <Text variant="titleSmall" style={styles.sectionTitle}>
                    Lý do khám
                  </Text>
                  <Text variant="bodyMedium" style={styles.diagnosisText}>
                    {visit.chiefComplaint}
                  </Text>
                </View>
              )}

              {visit.symptoms && visit.symptoms.length > 0 && (
                <View style={styles.symptomsSection}>
                  <Text variant="titleSmall" style={styles.sectionTitle}>
                    Triệu chứng
                  </Text>
                  <Text variant="bodyMedium" style={styles.symptomsText}>
                    {Array.isArray(visit.symptoms) 
                      ? visit.symptoms.map(s => s.symptom || s).join(', ') 
                      : visit.symptoms}
                  </Text>
                </View>
              )}

              {visit.diagnoses && visit.diagnoses.length > 0 && (
                <View style={styles.treatmentSection}>
                  <Text variant="titleSmall" style={styles.sectionTitle}>
                    Chẩn đoán
                  </Text>
                  <Text variant="bodyMedium" style={styles.treatmentText}>
                    {visit.diagnoses.map(d => d.diagnosis || d.description || d).join(', ')}
                  </Text>
                </View>
              )}

              {visit.notes && (
                <View style={styles.notesSection}>
                  <Text variant="titleSmall" style={styles.sectionTitle}>
                    Ghi chú
                  </Text>
                  <Text variant="bodyMedium" style={styles.notesText}>
                    {visit.notes}
                  </Text>
                </View>
              )}

              <Button 
                mode="outlined" 
                style={styles.detailButton}
                onPress={() => navigation.navigate('MedicalRecordDetail', { 
                  visitId: visit._id || visit.visitId,
                  recordId: medicalRecordId 
                })}
              >
                Xem chi tiết
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
  recordCard: {
    margin: 16,
    marginTop: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  dateSection: {
    flex: 1,
  },
  dateLabel: {
    color: '#666',
    fontWeight: '500',
  },
  date: {
    fontWeight: 'bold',
    color: '#1976d2',
  },
  statusBadge: {
    backgroundColor: '#ff9800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completedBadge: {
    backgroundColor: '#4caf50',
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    marginVertical: 12,
  },
  infoSection: {
    marginBottom: 16,
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
  diagnosisSection: {
    marginBottom: 12,
  },
  symptomsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  diagnosisText: {
    color: '#d32f2f',
    fontWeight: '500',
  },
  symptomsText: {
    color: '#666',
    lineHeight: 20,
  },
  detailButton: {
    marginTop: 8,
  },
});

export default MedicalRecordsScreen;