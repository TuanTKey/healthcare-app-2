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
  const { recordId } = route.params;
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadRecordDetail();
    // Set header title
    navigation.setOptions({
      title: 'Chi tiết hồ sơ bệnh án',
      headerShown: true,
    });
  }, [recordId]);

  const loadRecordDetail = async () => {
    try {
      setLoading(true);
      console.log('📋 Fetching medical record detail:', recordId);
      
      const response = await api.get(`/medicalRecord/${recordId}`);
      console.log('📋 Medical record detail response:', response.data);
      
      let recordData = null;
      if (response.data?.data) {
        recordData = response.data.data;
      } else if (response.data) {
        recordData = response.data;
      }
      
      setRecord(recordData);
    } catch (error) {
      console.error('❌ Lỗi tải chi tiết hồ sơ:', error.message);
      Alert.alert('Lỗi', 'Không thể tải chi tiết hồ sơ bệnh án');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecordDetail();
    setRefreshing(false);
  };

  const handleEdit = () => {
    navigation.navigate('MedicalRecordEdit', { recordId, record });
  };

  const handleDelete = () => {
    Alert.alert(
      'Xóa hồ sơ bệnh án',
      'Bạn có chắc muốn xóa hồ sơ bệnh án này? Hành động này không thể hoàn tác.',
      [
        { text: 'Hủy', onPress: () => {}, style: 'cancel' },
        {
          text: 'Xóa',
          onPress: async () => {
            try {
              setDeleting(true);
              console.log('🗑️ Deleting medical record:', recordId);
              
              const response = await api.delete(`/medicalRecord/${recordId}`);
              console.log('🗑️ Delete response:', response.data);
              
              Alert.alert('Thành công', 'Hồ sơ bệnh án đã được xóa');
              navigation.goBack();
            } catch (error) {
              console.error('❌ Lỗi xóa hồ sơ:', error.message);
              Alert.alert('Lỗi', error.response?.data?.message || 'Không thể xóa hồ sơ');
            } finally {
              setDeleting(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Đang tải chi tiết hồ sơ...</Text>
      </View>
    );
  }

  if (!record) {
    return (
      <View style={styles.centerContainer}>
        <MaterialIcons name="error-outline" size={48} color="#ccc" />
        <Text style={styles.errorText}>Không tìm thấy hồ sơ</Text>
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
                MÃ HỒ SƠ
              </Text>
              <Text variant="titleMedium" style={styles.recordId}>
                {record.recordId || 'N/A'}
              </Text>
            </View>
            <Chip
              style={{ backgroundColor: getStatusColor(record.status) }}
              textStyle={{ color: 'white' }}
              label={getStatusLabel(record.status)}
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
                  {formatDate(record.visitDate)}
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
                  {getVisitTypeLabel(record.visitType)}
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
                  {record.department || 'N/A'}
                </Text>
              </View>
            </View>

            {record.doctorId && (
              <View style={styles.infoItem}>
                <MaterialIcons name="person" size={20} color="#666" />
                <View style={styles.infoContent}>
                  <Text variant="bodySmall" style={styles.label}>
                    BÁC SĨ
                  </Text>
                  <Text variant="bodyMedium" style={styles.value}>
                    {record.doctorId?.personalInfo?.firstName || record.doctorId?.email || 'N/A'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </Card.Content>
      </Card>

      {/* Chief Complaint */}
      {record.chiefComplaint && (
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              LÝ DO KHÁM
            </Text>
            <Text variant="bodyMedium" style={styles.sectionContent}>
              {record.chiefComplaint}
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* History of Present Illness */}
      {record.historyOfPresentIllness && (
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              LỊCH SỬ BỆNH LÝ HIỆN TẠI
            </Text>
            <Text variant="bodyMedium" style={styles.sectionContent}>
              {record.historyOfPresentIllness}
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Symptoms */}
      {record.symptoms && record.symptoms.length > 0 && (
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              TRIỆU CHỨNG
            </Text>
            <View style={styles.itemsList}>
              {record.symptoms.map((symptom, index) => (
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
      {record.vitalSigns && Object.keys(record.vitalSigns).length > 0 && (
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              DẤU HIỆU SINH TỒN
            </Text>
            <View style={styles.vitalSignsGrid}>
              {record.vitalSigns.bloodPressure && (
                <View style={styles.vitalItem}>
                  <Text variant="bodySmall" style={styles.vitalLabel}>
                    Huyết áp
                  </Text>
                  <Text variant="bodyMedium" style={styles.vitalValue}>
                    {record.vitalSigns.bloodPressure.systolic || 0}/{record.vitalSigns.bloodPressure.diastolic || 0} mmHg
                  </Text>
                </View>
              )}
              {record.vitalSigns.heartRate && (
                <View style={styles.vitalItem}>
                  <Text variant="bodySmall" style={styles.vitalLabel}>
                    Nhịp tim
                  </Text>
                  <Text variant="bodyMedium" style={styles.vitalValue}>
                    {record.vitalSigns.heartRate} bpm
                  </Text>
                </View>
              )}
              {record.vitalSigns.temperature && (
                <View style={styles.vitalItem}>
                  <Text variant="bodySmall" style={styles.vitalLabel}>
                    Nhiệt độ
                  </Text>
                  <Text variant="bodyMedium" style={styles.vitalValue}>
                    {record.vitalSigns.temperature}°C
                  </Text>
                </View>
              )}
              {record.vitalSigns.respiratoryRate && (
                <View style={styles.vitalItem}>
                  <Text variant="bodySmall" style={styles.vitalLabel}>
                    Nhịp thở
                  </Text>
                  <Text variant="bodyMedium" style={styles.vitalValue}>
                    {record.vitalSigns.respiratoryRate} lần/phút
                  </Text>
                </View>
              )}
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Physical Examination */}
      {record.physicalExamination && (
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              KHÁM LÂMÀN SÀNG
            </Text>
            <Text variant="bodyMedium" style={styles.sectionContent}>
              {typeof record.physicalExamination === 'string'
                ? record.physicalExamination
                : record.physicalExamination.findings || 'N/A'}
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Diagnoses */}
      {record.diagnoses && record.diagnoses.length > 0 && (
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              CHẨN ĐOÁN
            </Text>
            <View style={styles.itemsList}>
              {record.diagnoses.map((diagnosis, index) => (
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
      {record.treatmentPlan && (
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              KỊ HOẠCH ĐIỀU TRỊ
            </Text>
            <Text variant="bodyMedium" style={styles.sectionContent}>
              {typeof record.treatmentPlan === 'string'
                ? record.treatmentPlan
                : record.treatmentPlan.description || 'N/A'}
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Notes */}
      {record.notes && (
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              GHI CHÚ THÊM
            </Text>
            <Text variant="bodyMedium" style={styles.sectionContent}>
              {record.notes}
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Footer Info */}
      <Card style={styles.footerCard}>
        <Card.Content>
          {record.createdBy && (
            <View style={styles.footerItem}>
              <Text variant="bodySmall" style={styles.footerLabel}>
                Người tạo: {record.createdBy?.personalInfo?.firstName || record.createdBy?.email || 'N/A'}
              </Text>
            </View>
          )}
          {record.createdAt && (
            <View style={styles.footerItem}>
              <Text variant="bodySmall" style={styles.footerLabel}>
                Ngày tạo: {formatDate(record.createdAt)}
              </Text>
            </View>
          )}
          {record.lastModifiedBy && (
            <View style={styles.footerItem}>
              <Text variant="bodySmall" style={styles.footerLabel}>
                Cập nhật: {record.lastModifiedBy?.personalInfo?.firstName || record.lastModifiedBy?.email || 'N/A'}
              </Text>
            </View>
          )}
          {record.updatedAt && (
            <View style={styles.footerItem}>
              <Text variant="bodySmall" style={styles.footerLabel}>
                Lần cuối: {formatDate(record.updatedAt)}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {user?.role === 'HOSPITAL_ADMIN' || user?.role === 'DOCTOR' ? (
          <>
            <Button
              mode="contained"
              style={[styles.actionButton, styles.editButton]}
              icon="pencil"
              onPress={handleEdit}
              disabled={deleting}
            >
              Sửa
            </Button>
            <Button
              mode="contained"
              style={[styles.actionButton, styles.deleteButton]}
              icon="trash-can"
              onPress={handleDelete}
              loading={deleting}
              disabled={deleting}
            >
              Xóa
            </Button>
          </>
        ) : null}
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
