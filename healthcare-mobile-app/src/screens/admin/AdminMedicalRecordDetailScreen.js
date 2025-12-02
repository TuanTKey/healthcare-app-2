import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import api from '../../services/api';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Chip from '../../components/common/Chip';

const AdminMedicalRecordDetailScreen = ({ route, navigation }) => {
  const { recordId, patientId } = route.params;
  const [medicalRecord, setMedicalRecord] = useState(null);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMedicalRecord();
    navigation.setOptions({
      title: 'Chi tiết hồ sơ bệnh án',
      headerShown: true,
    });
  }, [recordId, patientId]);

  const loadMedicalRecord = async () => {
    try {
      setLoading(true);
      console.log('📋 Loading medical record:', recordId, 'patientId:', patientId);
      
      // Lấy thông tin hồ sơ và danh sách visits
      const response = await api.get(`/medical-records/patient/${patientId}/records`);
      console.log('📋 Medical record response:', response.data);
      
      if (response.data?.data) {
        setMedicalRecord(response.data.data.medicalRecord);
        setVisits(response.data.data.visits || []);
      }
    } catch (error) {
      console.error('❌ Lỗi tải hồ sơ:', error.message);
      Alert.alert('Lỗi', 'Không thể tải thông tin hồ sơ bệnh án');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMedicalRecord();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED': return '#4CAF50';
      case 'DRAFT': return '#FF9800';
      case 'ARCHIVED': return '#9E9E9E';
      default: return '#1976d2';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'COMPLETED': return 'HOÀN THÀNH';
      case 'DRAFT': return 'ĐANG SOẠN';
      case 'ARCHIVED': return 'ĐÃ LƯU TRỮ';
      default: return status;
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: vi });
    } catch {
      return date;
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

  if (!medicalRecord) {
    return (
      <View style={styles.centerContainer}>
        <MaterialIcons name="error-outline" size={48} color="#ccc" />
        <Text style={styles.errorText}>Không tìm thấy hồ sơ</Text>
        <Button mode="outlined" onPress={() => navigation.goBack()}>
          Quay lại
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
      {/* Header Card - Thông tin hồ sơ */}
      <Card style={styles.headerCard}>
        <Card.Content>
          <View style={styles.headerTop}>
            <View style={styles.recordIdSection}>
              <Text style={styles.label}>MÃ HỒ SƠ</Text>
              <Text style={styles.recordId}>{medicalRecord.recordId || recordId}</Text>
            </View>
            <Chip
              style={{ backgroundColor: getStatusColor(medicalRecord.status) }}
              textStyle={{ color: 'white' }}
              label={getStatusLabel(medicalRecord.status)}
            />
          </View>

          <View style={styles.divider} />

          {/* Thông tin bệnh nhân */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>THÔNG TIN BỆNH NHÂN</Text>
            <View style={styles.infoRow}>
              <MaterialIcons name="person" size={18} color="#666" />
              <Text style={styles.infoText}>
                {medicalRecord.patientId?.personalInfo?.firstName} {medicalRecord.patientId?.personalInfo?.lastName}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="email" size={18} color="#666" />
              <Text style={styles.infoText}>{medicalRecord.patientId?.email}</Text>
            </View>
            {medicalRecord.patientInfo?.bloodType && (
              <View style={styles.infoRow}>
                <MaterialIcons name="opacity" size={18} color="#666" />
                <Text style={styles.infoText}>Nhóm máu: {medicalRecord.patientInfo.bloodType}</Text>
              </View>
            )}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{visits.length}</Text>
              <Text style={styles.statLabel}>Lượt khám</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {medicalRecord.createdAt ? format(new Date(medicalRecord.createdAt), 'dd/MM/yyyy') : 'N/A'}
              </Text>
              <Text style={styles.statLabel}>Ngày tạo</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Danh sách các lượt khám */}
      <View style={styles.visitsSection}>
        <Text style={styles.visitsSectionTitle}>
          LỊCH SỬ KHÁM BỆNH ({visits.length} lượt)
        </Text>
        
        {visits.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <MaterialIcons name="event-busy" size={48} color="#ccc" />
              <Text style={styles.emptyText}>Chưa có lượt khám nào</Text>
            </Card.Content>
          </Card>
        ) : (
          visits.map((visit, index) => (
            <TouchableOpacity 
              key={visit._id || visit.visitId || index}
              onPress={() => navigation.navigate('MedicalRecordDetail', {
                recordId: medicalRecord.recordId || recordId,
                visitId: visit._id || visit.visitId
              })}
            >
              <Card style={styles.visitCard}>
                <Card.Content>
                  <View style={styles.visitHeader}>
                    <View style={styles.visitInfo}>
                      <Text style={styles.visitId}>
                        {visit.visitId || `Lượt khám #${index + 1}`}
                      </Text>
                      <Text style={styles.visitDate}>
                        {formatDate(visit.visitDate)}
                      </Text>
                    </View>
                    <Chip
                      style={{ backgroundColor: getStatusColor(visit.status) }}
                      textStyle={{ color: 'white', fontSize: 10 }}
                      label={getStatusLabel(visit.status)}
                    />
                  </View>

                  {visit.doctorId && (
                    <View style={styles.infoRow}>
                      <MaterialIcons name="medical-services" size={16} color="#666" />
                      <Text style={styles.infoText}>
                        BS. {visit.doctorId?.personalInfo?.firstName || visit.doctorId?.email}
                      </Text>
                    </View>
                  )}

                  {visit.department && (
                    <View style={styles.infoRow}>
                      <MaterialIcons name="business" size={16} color="#666" />
                      <Text style={styles.infoText}>{visit.department}</Text>
                    </View>
                  )}

                  {visit.chiefComplaint && (
                    <View style={styles.complaintSection}>
                      <Text style={styles.complaintLabel}>Lý do khám:</Text>
                      <Text style={styles.complaintText} numberOfLines={2}>
                        {visit.chiefComplaint}
                      </Text>
                    </View>
                  )}

                  {visit.diagnoses && visit.diagnoses.length > 0 && (
                    <View style={styles.diagnosisSection}>
                      <Text style={styles.diagnosisLabel}>Chẩn đoán:</Text>
                      <Text style={styles.diagnosisText} numberOfLines={2}>
                        {visit.diagnoses.map(d => d.diagnosis || d).join(', ')}
                      </Text>
                    </View>
                  )}

                  <View style={styles.viewDetailRow}>
                    <Text style={styles.viewDetailText}>Xem chi tiết</Text>
                    <MaterialIcons name="chevron-right" size={20} color="#1976d2" />
                  </View>
                </Card.Content>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Button
          mode="outlined"
          style={styles.actionButton}
          icon="arrow-left"
          onPress={() => navigation.goBack()}
        >
          Quay lại
        </Button>
      </View>
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
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  errorText: {
    marginTop: 16,
    marginBottom: 16,
    color: '#666',
    fontSize: 16,
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  recordIdSection: {
    flex: 1,
  },
  label: {
    color: '#999',
    fontWeight: '600',
    fontSize: 11,
  },
  recordId: {
    fontWeight: 'bold',
    color: '#1976d2',
    fontSize: 18,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 12,
  },
  infoSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    color: '#666',
    fontSize: 12,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    marginLeft: 10,
    color: '#333',
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  visitsSection: {
    padding: 16,
    paddingTop: 8,
  },
  visitsSectionTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
  },
  emptyCard: {
    marginBottom: 16,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    marginTop: 12,
    color: '#999',
  },
  visitCard: {
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#1976d2',
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  visitInfo: {
    flex: 1,
  },
  visitId: {
    fontWeight: 'bold',
    color: '#1976d2',
    fontSize: 14,
  },
  visitDate: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  complaintSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  complaintLabel: {
    fontWeight: '600',
    fontSize: 12,
    color: '#666',
  },
  complaintText: {
    color: '#333',
    marginTop: 4,
    lineHeight: 18,
  },
  diagnosisSection: {
    marginTop: 8,
  },
  diagnosisLabel: {
    fontWeight: '600',
    fontSize: 12,
    color: '#666',
  },
  diagnosisText: {
    color: '#d32f2f',
    marginTop: 4,
    fontWeight: '500',
  },
  viewDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  viewDetailText: {
    color: '#1976d2',
    fontWeight: '500',
    fontSize: 13,
  },
  actionButtons: {
    padding: 16,
    paddingBottom: 32,
  },
  actionButton: {
    marginBottom: 8,
  },
});

export default AdminMedicalRecordDetailScreen;
