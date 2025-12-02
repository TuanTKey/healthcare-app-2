import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, Text, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Chip from '../../components/common/Chip';

const MedicalRecordDetailScreen = ({ route, navigation }) => {
  const user = useSelector(state => state.auth.user);
  const { recordId, visitId } = route.params;
  const [visit, setVisit] = useState(null);
  const [medicalRecord, setMedicalRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadVisitDetail();
    // Set header title
    navigation.setOptions({
      title: 'Chi tiết lượt khám',
      headerShown: true,
    });
  }, [recordId, visitId]);

  const loadVisitDetail = async () => {
    try {
      setLoading(true);
      console.log('📋 Fetching visit detail:', visitId, 'from record:', recordId);
      
      // Sử dụng endpoint mới để lấy chi tiết visit
      const response = await api.get(`/medical-records/${recordId}/visits/${visitId}`);
      console.log('📋 Visit detail response:', response.data);
      
      if (response.data?.data) {
        setVisit(response.data.data.visit);
        setMedicalRecord(response.data.data.medicalRecord);
      }
    } catch (error) {
      console.error('❌ Lỗi tải chi tiết lượt khám:', error.message);
      Alert.alert('Lỗi', 'Không thể tải chi tiết lượt khám');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVisitDetail();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Đang tải chi tiết lượt khám...</Text>
      </View>
    );
  }

  if (!visit) {
    return (
      <View style={styles.centerContainer}>
        <MaterialIcons name="error-outline" size={48} color="#ccc" />
        <Text style={styles.errorText}>Không tìm thấy lượt khám</Text>
      </View>
    );
  }

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: vi });
    } catch {
      return date;
    }
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

  const getVisitTypeLabel = (visitType) => {
    switch (visitType) {
      case 'OUTPATIENT':
        return 'Ngoại trú';
      case 'INPATIENT':
        return 'Nội trú';
      case 'EMERGENCY':
        return 'Cấp cứu';
      case 'FOLLOW_UP':
        return 'Tái khám';
      default:
        return visitType;
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header Info */}
      <Card style={styles.headerCard}>
        <Card.Content>
          <View style={styles.headerTop}>
            <View style={styles.recordIdSection}>
              <Text variant="bodySmall" style={styles.label}>
                MÃ LƯỢT KHÁM
              </Text>
              <Text variant="titleMedium" style={styles.recordId}>
                {visit.visitId || 'N/A'}
              </Text>
            </View>
            <Chip
              style={{ backgroundColor: getStatusColor(visit.status) }}
              textStyle={{ color: 'white' }}
              label={getStatusLabel(visit.status)}
            />
          </View>

          <View style={{height: 1, backgroundColor: '#ccc', marginVertical: 10}} />

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <MaterialIcons name="event" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text variant="bodySmall" style={styles.label}>
                  NGÀY KHÁM
                </Text>
                <Text variant="bodyMedium" style={styles.value}>
                  {formatDate(visit.visitDate)}
                </Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <MaterialIcons name="local-hospital" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text variant="bodySmall" style={styles.label}>
                  LOẠI KHÁM
                </Text>
                <Text variant="bodyMedium" style={styles.value}>
                  {getVisitTypeLabel(visit.visitType)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <MaterialIcons name="business" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text variant="bodySmall" style={styles.label}>
                  KHOA
                </Text>
                <Text variant="bodyMedium" style={styles.value}>
                  {visit.department || 'N/A'}
                </Text>
              </View>
            </View>

            {visit.doctorId && (
              <View style={styles.infoItem}>
                <MaterialIcons name="person" size={20} color="#666" />
                <View style={styles.infoContent}>
                  <Text variant="bodySmall" style={styles.label}>
                    BÁC SĨ
                  </Text>
                  <Text variant="bodyMedium" style={styles.value}>
                    {visit.doctorId?.personalInfo?.firstName || visit.doctorId?.email || 'N/A'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </Card.Content>
      </Card>

      {/* Chief Complaint */}
      {visit.chiefComplaint && (
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              LÝ DO KHÁM
            </Text>
            <Text variant="bodyMedium" style={styles.sectionContent}>
              {visit.chiefComplaint}
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* History of Present Illness */}
      {visit.historyOfPresentIllness && (
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              LỊCH SỬ BỆNH LÝ HIỆN TẠI
            </Text>
            <Text variant="bodyMedium" style={styles.sectionContent}>
              {visit.historyOfPresentIllness}
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Symptoms */}
      {visit.symptoms && visit.symptoms.length > 0 && (
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              TRIỆU CHỨNG
            </Text>
            <View style={styles.itemsList}>
              {visit.symptoms.map((symptom, index) => (
                <View key={index} style={styles.listItem}>
                  <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                  <Text variant="bodyMedium" style={styles.listItemText}>
                    {symptom.symptom || symptom}
                  </Text>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Vital Signs */}
      {visit.vitalSigns && Object.keys(visit.vitalSigns).length > 0 && (
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              DẤU HIỆU SINH TỒN
            </Text>
            <View style={styles.vitalSignsGrid}>
              {visit.vitalSigns.bloodPressure && (
                <View style={styles.vitalItem}>
                  <Text variant="bodySmall" style={styles.vitalLabel}>
                    Huyết áp
                  </Text>
                  <Text variant="bodyMedium" style={styles.vitalValue}>
                    {visit.vitalSigns.bloodPressure.systolic || 0}/{visit.vitalSigns.bloodPressure.diastolic || 0} mmHg
                  </Text>
                </View>
              )}
              {visit.vitalSigns.heartRate && (
                <View style={styles.vitalItem}>
                  <Text variant="bodySmall" style={styles.vitalLabel}>
                    Nhịp tim
                  </Text>
                  <Text variant="bodyMedium" style={styles.vitalValue}>
                    {visit.vitalSigns.heartRate} bpm
                  </Text>
                </View>
              )}
              {visit.vitalSigns.temperature && (
                <View style={styles.vitalItem}>
                  <Text variant="bodySmall" style={styles.vitalLabel}>
                    Nhiệt độ
                  </Text>
                  <Text variant="bodyMedium" style={styles.vitalValue}>
                    {visit.vitalSigns.temperature}°C
                  </Text>
                </View>
              )}
              {visit.vitalSigns.respiratoryRate && (
                <View style={styles.vitalItem}>
                  <Text variant="bodySmall" style={styles.vitalLabel}>
                    Nhịp thở
                  </Text>
                  <Text variant="bodyMedium" style={styles.vitalValue}>
                    {visit.vitalSigns.respiratoryRate} lần/phút
                  </Text>
                </View>
              )}
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Physical Examination */}
      {visit.physicalExamination && (
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              KHÁM LÂM SÀNG
            </Text>
            <Text variant="bodyMedium" style={styles.sectionContent}>
              {typeof visit.physicalExamination === 'string'
                ? visit.physicalExamination
                : visit.physicalExamination.findings || 'N/A'}
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Diagnoses */}
      {visit.diagnoses && visit.diagnoses.length > 0 && (
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              CHẨN ĐOÁN
            </Text>
            <View style={styles.itemsList}>
              {visit.diagnoses.map((diagnosis, index) => (
                <View key={index} style={[styles.listItem, styles.diagnosisItem]}>
                  <MaterialIcons name="warning" size={16} color="#FF5722" />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium" style={styles.listItemText}>
                      {diagnosis.diagnosis || diagnosis}
                    </Text>
                    {diagnosis.code && (
                      <Text variant="bodySmall" style={styles.codeText}>
                        Mã: {diagnosis.code}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Treatment Plan */}
      {visit.treatmentPlan && (
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              KẾ HOẠCH ĐIỀU TRỊ
            </Text>
            <Text variant="bodyMedium" style={styles.sectionContent}>
              {typeof visit.treatmentPlan === 'string'
                ? visit.treatmentPlan
                : visit.treatmentPlan.description || visit.treatmentPlan.recommendations || 'N/A'}
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Notes */}
      {visit.notes && (
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              GHI CHÚ THÊM
            </Text>
            <Text variant="bodyMedium" style={styles.sectionContent}>
              {visit.notes}
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Footer Info */}
      <Card style={styles.footerCard}>
        <Card.Content>
          {medicalRecord?.recordId && (
            <View style={styles.footerItem}>
              <Text variant="bodySmall" style={styles.footerLabel}>
                Mã hồ sơ: {medicalRecord.recordId}
              </Text>
            </View>
          )}
          {visit.createdAt && (
            <View style={styles.footerItem}>
              <Text variant="bodySmall" style={styles.footerLabel}>
                Ngày tạo: {formatDate(visit.createdAt)}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

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
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  errorText: {
    marginTop: 16,
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
  recordId: {
    fontWeight: 'bold',
    color: '#1976d2',
    marginTop: 4,
  },
  label: {
    color: '#999',
    fontWeight: '600',
    fontSize: 11,
  },
  divider: {
    marginVertical: 12,
  },
  infoGrid: {
    marginBottom: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  value: {
    marginTop: 4,
    color: '#333',
  },
  sectionCard: {
    margin: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 12,
    fontSize: 13,
  },
  sectionContent: {
    color: '#333',
    lineHeight: 22,
  },
  itemsList: {
    marginTop: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingLeft: 8,
  },
  diagnosisItem: {
    paddingVertical: 4,
  },
  listItemText: {
    marginLeft: 8,
    flex: 1,
    color: '#333',
  },
  codeText: {
    marginLeft: 8,
    marginTop: 2,
    color: '#999',
    fontStyle: 'italic',
  },
  vitalSignsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  vitalItem: {
    width: '48%',
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#1976d2',
  },
  vitalLabel: {
    color: '#666',
    fontWeight: '500',
    marginBottom: 4,
  },
  vitalValue: {
    fontWeight: 'bold',
    color: '#1976d2',
  },
  footerCard: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
  },
  footerItem: {
    marginBottom: 8,
  },
  footerLabel: {
    color: '#999',
    fontSize: 12,
  },
  actionButtons: {
    padding: 16,
    paddingBottom: 32,
  },
  actionButton: {
    marginBottom: 8,
  },
  editButton: {
    backgroundColor: '#2196F3',
  },
  deleteButton: {
    backgroundColor: '#f44336',
  },
});

export default MedicalRecordDetailScreen;
