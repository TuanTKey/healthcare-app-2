import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, Text, ActivityIndicator, TouchableOpacity, Modal, TextInput as RNTextInput } from 'react-native';
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
  const [creatingBill, setCreatingBill] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [billOptions, setBillOptions] = useState({
    consultationFee: '',
    discount: '',
    notes: ''
  });

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

  // 🎯 TẠO HOÁ ĐƠN TỪ ĐƠN THUỐC
  const handleCreateBill = async () => {
    try {
      setCreatingBill(true);
      
      const payload = {
        consultationFee: billOptions.consultationFee ? parseFloat(billOptions.consultationFee) : 0,
        discount: billOptions.discount ? parseFloat(billOptions.discount) : 0,
        notes: billOptions.notes || `Hoá đơn từ đơn thuốc ${prescription.prescriptionId}`,
        defaultPrice: 10000 // Giá mặc định nếu thuốc không có giá
      };

      console.log('💰 Creating bill from prescription:', prescription._id);
      const response = await api.post(`/bills/from-prescription/${prescription._id}`, payload);
      
      console.log('💰 Bill created:', response.data);
      
      setShowBillModal(false);
      setBillOptions({ consultationFee: '', discount: '', notes: '' });
      
      Alert.alert(
        'Thành công',
        `Đã tạo hoá đơn ${response.data?.data?.billNumber || ''} thành công!`,
        [
          {
            text: 'Xem hoá đơn',
            onPress: () => {
              // Navigate to bill detail
              if (response.data?.data?._id) {
                navigation.navigate('BillDetail', { billId: response.data.data._id });
              }
            }
          },
          { text: 'OK', onPress: () => loadPrescription() }
        ]
      );
    } catch (error) {
      console.error('❌ Create bill error:', error.response?.data || error.message);
      
      let errorMessage = 'Không thể tạo hoá đơn';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setCreatingBill(false);
    }
  };

  // Tính tổng tiền dự kiến
  const calculateEstimatedTotal = () => {
    let total = 0;
    
    if (prescription?.medications) {
      prescription.medications.forEach(med => {
        const price = med.medicationId?.pricing?.sellingPrice || 10000;
        const quantity = med.totalQuantity || 1;
        total += price * quantity;
      });
    }
    
    if (billOptions.consultationFee) {
      total += parseFloat(billOptions.consultationFee) || 0;
    }
    
    if (billOptions.discount) {
      total -= parseFloat(billOptions.discount) || 0;
    }
    
    return Math.max(0, total);
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

      {/* Create Bill Button */}
      {!prescription.billCreated && (
        <TouchableOpacity 
          style={styles.createBillButton}
          onPress={() => setShowBillModal(true)}
        >
          <MaterialIcons name="receipt" size={24} color="#fff" />
          <Text style={styles.createBillText}>Tạo Hoá Đơn Từ Đơn Thuốc</Text>
        </TouchableOpacity>
      )}

      {/* Bill Already Created */}
      {prescription.billCreated && (
        <View style={styles.billCreatedBanner}>
          <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
          <View style={styles.billCreatedInfo}>
            <Text style={styles.billCreatedTitle}>Đã tạo hoá đơn</Text>
            <Text style={styles.billCreatedDate}>
              {prescription.billCreatedAt 
                ? format(new Date(prescription.billCreatedAt), 'dd/MM/yyyy HH:mm', { locale: vi })
                : ''}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.viewBillBtn}
            onPress={() => {
              if (prescription.billId) {
                navigation.navigate('BillDetail', { billId: prescription.billId });
              }
            }}
          >
            <Text style={styles.viewBillText}>Xem</Text>
            <MaterialIcons name="chevron-right" size={18} color="#1976d2" />
          </TouchableOpacity>
        </View>
      )}

      {/* Create Bill Modal */}
      <Modal
        visible={showBillModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBillModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tạo Hoá Đơn</Text>
              <TouchableOpacity onPress={() => setShowBillModal(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Prescription Info */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Thông tin đơn thuốc</Text>
                <Text style={styles.modalInfoText}>Mã đơn: {prescription.prescriptionId}</Text>
                <Text style={styles.modalInfoText}>
                  Bệnh nhân: {prescription.patientId?.personalInfo?.firstName || 'N/A'}
                </Text>
                <Text style={styles.modalInfoText}>
                  Số loại thuốc: {prescription.medications?.length || 0}
                </Text>
              </View>

              {/* Medications List */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Chi tiết thuốc</Text>
                {prescription.medications?.map((med, index) => (
                  <View key={index} style={styles.medItem}>
                    <Text style={styles.medItemName}>{med.name}</Text>
                    <View style={styles.medItemRow}>
                      <Text style={styles.medItemQty}>SL: {med.totalQuantity || 1}</Text>
                      <Text style={styles.medItemPrice}>
                        {(med.medicationId?.pricing?.sellingPrice || 10000).toLocaleString('vi-VN')}đ
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Additional Options */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Tuỳ chọn thêm</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Phí khám bệnh (VNĐ)</Text>
                  <RNTextInput
                    style={styles.input}
                    placeholder="0"
                    keyboardType="numeric"
                    value={billOptions.consultationFee}
                    onChangeText={(text) => setBillOptions({...billOptions, consultationFee: text})}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Giảm giá (VNĐ)</Text>
                  <RNTextInput
                    style={styles.input}
                    placeholder="0"
                    keyboardType="numeric"
                    value={billOptions.discount}
                    onChangeText={(text) => setBillOptions({...billOptions, discount: text})}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Ghi chú</Text>
                  <RNTextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Ghi chú cho hoá đơn..."
                    multiline
                    numberOfLines={3}
                    value={billOptions.notes}
                    onChangeText={(text) => setBillOptions({...billOptions, notes: text})}
                  />
                </View>
              </View>

              {/* Estimated Total */}
              <View style={styles.totalSection}>
                <Text style={styles.totalLabel}>Tổng dự kiến:</Text>
                <Text style={styles.totalAmount}>
                  {calculateEstimatedTotal().toLocaleString('vi-VN')} VNĐ
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelBtn}
                onPress={() => setShowBillModal(false)}
              >
                <Text style={styles.cancelBtnText}>Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmBtn, creatingBill && styles.disabledBtn]}
                onPress={handleCreateBill}
                disabled={creatingBill}
              >
                {creatingBill ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <MaterialIcons name="receipt" size={20} color="#fff" />
                    <Text style={styles.confirmBtnText}>Tạo Hoá Đơn</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  // Create Bill Button
  createBillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 16,
    gap: 10,
  },
  createBillText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Bill Created Banner
  billCreatedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  billCreatedInfo: {
    flex: 1,
    marginLeft: 12,
  },
  billCreatedTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2E7D32',
  },
  billCreatedDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  viewBillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewBillText: {
    color: '#1976d2',
    fontWeight: '500',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalBody: {
    padding: 16,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 10,
  },
  modalInfoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  medItem: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  medItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  medItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  medItemQty: {
    fontSize: 13,
    color: '#666',
  },
  medItemPrice: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#fafafa',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
    padding: 16,
    marginTop: 10,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  confirmBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  confirmBtnText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  disabledBtn: {
    opacity: 0.7,
  },
});

export default PrescriptionDetailScreen;
