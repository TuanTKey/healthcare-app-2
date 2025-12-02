import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Card from '../../components/common/Card';
import Chip from '../../components/common/Chip';
import Button from '../../components/common/Button';
import api from '../../services/api';

const BillDetailScreen = ({ navigation, route }) => {
  const { billId } = route.params;
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');

  const fetchBill = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/bills/${billId}`);
      setBill(response.data?.data?.bill || response.data?.data);
    } catch (error) {
      console.error('Error fetching bill:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin hóa đơn');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [billId, navigation]);

  useEffect(() => {
    fetchBill();
  }, [fetchBill]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount || 0);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PAID': return '#4caf50';
      case 'PENDING': return '#ff9800';
      case 'PARTIALLY_PAID': return '#2196f3';
      case 'CANCELLED': return '#f44336';
      case 'VOIDED': return '#9e9e9e';
      default: return '#757575';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'PAID': return 'Đã thanh toán';
      case 'PENDING': return 'Chờ thanh toán';
      case 'PARTIALLY_PAID': return 'Thanh toán một phần';
      case 'CANCELLED': return 'Đã hủy';
      case 'VOIDED': return 'Đã vô hiệu';
      default: return status;
    }
  };

  const handleProcessPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền hợp lệ');
      return;
    }

    const remainingAmount = (bill.totalAmount || 0) - (bill.paidAmount || 0);
    if (amount > remainingAmount) {
      Alert.alert('Lỗi', `Số tiền không được vượt quá ${formatCurrency(remainingAmount)}`);
      return;
    }

    try {
      setProcessing(true);
      await api.post(`/bills/${billId}/payments`, {
        amount,
        paymentMethod,
        notes: `Thanh toán qua ${paymentMethod}`,
      });

      Alert.alert('Thành công', 'Thanh toán thành công!');
      setPaymentModalVisible(false);
      setPaymentAmount('');
      fetchBill();
    } catch (error) {
      console.error('Error processing payment:', error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể xử lý thanh toán');
    } finally {
      setProcessing(false);
    }
  };

  const handleVoidBill = () => {
    Alert.alert(
      'Xác nhận',
      'Bạn có chắc muốn vô hiệu hóa hóa đơn này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Vô hiệu',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessing(true);
              await api.patch(`/bills/${billId}/void`, {
                reason: 'Vô hiệu bởi nhân viên',
              });
              Alert.alert('Thành công', 'Đã vô hiệu hóa hóa đơn');
              fetchBill();
            } catch (error) {
              console.error('Error voiding bill:', error);
              Alert.alert('Lỗi', 'Không thể vô hiệu hóa hóa đơn');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handlePrintBill = () => {
    Alert.alert('Thông báo', 'Chức năng in hóa đơn đang được phát triển');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976d2" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  if (!bill) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={64} color="#f44336" />
        <Text style={styles.errorText}>Không tìm thấy hóa đơn</Text>
      </View>
    );
  }

  const remainingAmount = (bill.totalAmount || 0) - (bill.paidAmount || 0);
  const canProcessPayment = bill.status === 'PENDING' || bill.status === 'PARTIALLY_PAID';

  const RadioOption = ({ label, value, selected, onSelect }) => (
    <TouchableOpacity 
      style={styles.radioOption}
      onPress={() => onSelect(value)}
      activeOpacity={0.7}
    >
      <View style={[styles.radioCircle, selected && styles.radioCircleSelected]}>
        {selected && <View style={styles.radioInner} />}
      </View>
      <Text style={styles.radioLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Bill Header */}
        <Card style={styles.headerCard}>
          <View style={styles.billHeader}>
            <View>
              <Text style={styles.billNumber}>
                Hóa đơn #{bill.billNumber || bill._id?.slice(-8)}
              </Text>
              <Text style={styles.billDate}>
                {new Date(bill.createdAt).toLocaleDateString('vi-VN', {
                  weekday: 'long',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
            <Chip
              style={[styles.statusChip, { backgroundColor: getStatusColor(bill.status) + '20' }]}
              textStyle={[styles.statusText, { color: getStatusColor(bill.status) }]}
              label={getStatusLabel(bill.status)}
            />
          </View>
        </Card>

        {/* Patient Info */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Thông tin bệnh nhân</Text>
          <View style={styles.infoRow}>
            <MaterialIcons name="person" size={20} color="#666" />
            <Text style={styles.infoText}>
              {bill.patient?.personalInfo?.firstName} {bill.patient?.personalInfo?.lastName}
              {bill.patient?.name && ` (${bill.patient.name})`}
            </Text>
          </View>
          {bill.patient?.personalInfo?.phone && (
            <View style={styles.infoRow}>
              <MaterialIcons name="phone" size={20} color="#666" />
              <Text style={styles.infoText}>{bill.patient.personalInfo.phone}</Text>
            </View>
          )}
          {bill.patient?.email && (
            <View style={styles.infoRow}>
              <MaterialIcons name="email" size={20} color="#666" />
              <Text style={styles.infoText}>{bill.patient.email}</Text>
            </View>
          )}
        </Card>

        {/* Bill Items */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Chi tiết hóa đơn</Text>
          {bill.items && bill.items.length > 0 ? (
            bill.items.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name || item.description}</Text>
                  <Text style={styles.itemQuantity}>
                    {item.quantity} x {formatCurrency(item.unitPrice)}
                  </Text>
                </View>
                <Text style={styles.itemTotal}>
                  {formatCurrency(item.quantity * item.unitPrice)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.noItemsText}>Không có chi tiết</Text>
          )}
          
          <View style={styles.divider} />
          
          {/* Subtotals */}
          <View style={styles.subtotalRow}>
            <Text style={styles.subtotalLabel}>Tạm tính</Text>
            <Text style={styles.subtotalValue}>{formatCurrency(bill.subtotal || bill.totalAmount)}</Text>
          </View>
          
          {bill.discount > 0 && (
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>Giảm giá</Text>
              <Text style={[styles.subtotalValue, { color: '#4caf50' }]}>
                -{formatCurrency(bill.discount)}
              </Text>
            </View>
          )}
          
          {bill.tax > 0 && (
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>Thuế</Text>
              <Text style={styles.subtotalValue}>{formatCurrency(bill.tax)}</Text>
            </View>
          )}
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tổng cộng</Text>
            <Text style={styles.totalValue}>{formatCurrency(bill.totalAmount)}</Text>
          </View>

          {bill.paidAmount > 0 && (
            <>
              <View style={styles.subtotalRow}>
                <Text style={styles.subtotalLabel}>Đã thanh toán</Text>
                <Text style={[styles.subtotalValue, { color: '#4caf50' }]}>
                  {formatCurrency(bill.paidAmount)}
                </Text>
              </View>
              <View style={styles.subtotalRow}>
                <Text style={styles.subtotalLabel}>Còn lại</Text>
                <Text style={[styles.subtotalValue, { color: '#ff9800', fontWeight: 'bold' }]}>
                  {formatCurrency(remainingAmount)}
                </Text>
              </View>
            </>
          )}
        </Card>

        {/* Payment History */}
        {bill.payments && bill.payments.length > 0 && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Lịch sử thanh toán</Text>
            {bill.payments.map((payment, index) => (
              <View key={index} style={styles.paymentRow}>
                <View>
                  <Text style={styles.paymentMethod}>{payment.method || payment.paymentMethod}</Text>
                  <Text style={styles.paymentDate}>
                    {new Date(payment.paidAt || payment.createdAt).toLocaleDateString('vi-VN')}
                  </Text>
                </View>
                <Text style={styles.paymentAmount}>{formatCurrency(payment.amount)}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Actions */}
        <View style={styles.actionsContainer}>
          {canProcessPayment && (
            <Button
              mode="contained"
              onPress={() => {
                setPaymentAmount(remainingAmount.toString());
                setPaymentModalVisible(true);
              }}
              style={styles.payButton}
              loading={processing}
              disabled={processing}
              color="#4caf50"
            >
              Thu tiền ({formatCurrency(remainingAmount)})
            </Button>
          )}
          
          <View style={styles.secondaryActions}>
            <Button
              mode="outlined"
              onPress={handlePrintBill}
              style={styles.secondaryButton}
            >
              In hóa đơn
            </Button>
            
            {canProcessPayment && (
              <Button
                mode="outlined"
                onPress={handleVoidBill}
                style={[styles.secondaryButton, { borderColor: '#f44336' }]}
                loading={processing}
                disabled={processing}
              >
                Vô hiệu
              </Button>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Payment Modal */}
      <Modal
        visible={paymentModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Xử lý thanh toán</Text>
            
            <Text style={styles.inputLabel}>Số tiền</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                keyboardType="numeric"
                placeholder="Nhập số tiền"
              />
              <Text style={styles.inputSuffix}>VNĐ</Text>
            </View>

            <Text style={styles.inputLabel}>Phương thức thanh toán</Text>
            <View style={styles.radioGroup}>
              <RadioOption
                label="Tiền mặt"
                value="CASH"
                selected={paymentMethod === 'CASH'}
                onSelect={setPaymentMethod}
              />
              <RadioOption
                label="Chuyển khoản"
                value="BANK_TRANSFER"
                selected={paymentMethod === 'BANK_TRANSFER'}
                onSelect={setPaymentMethod}
              />
              <RadioOption
                label="Thẻ tín dụng"
                value="CREDIT_CARD"
                selected={paymentMethod === 'CREDIT_CARD'}
                onSelect={setPaymentMethod}
              />
              <RadioOption
                label="Ví điện tử"
                value="E_WALLET"
                selected={paymentMethod === 'E_WALLET'}
                onSelect={setPaymentMethod}
              />
            </View>

            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => setPaymentModalVisible(false)}
                style={styles.modalButton}
              >
                Hủy
              </Button>
              <Button
                mode="contained"
                onPress={handleProcessPayment}
                style={styles.modalButton}
                loading={processing}
                disabled={processing}
              >
                Xác nhận
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    marginTop: 10,
  },
  headerCard: {
    margin: 15,
    borderRadius: 12,
    backgroundColor: '#1976d2',
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  billNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  billDate: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.8,
    marginTop: 4,
  },
  statusChip: {
    backgroundColor: '#fff',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  card: {
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  itemQuantity: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  noItemsText: {
    color: '#999',
    fontStyle: 'italic',
  },
  divider: {
    marginVertical: 15,
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  subtotalLabel: {
    fontSize: 14,
    color: '#666',
  },
  subtotalValue: {
    fontSize: 14,
    color: '#333',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#1976d2',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  paymentMethod: {
    fontSize: 14,
    color: '#333',
  },
  paymentDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  actionsContainer: {
    padding: 15,
    paddingBottom: 30,
  },
  payButton: {
    marginBottom: 15,
    paddingVertical: 5,
    backgroundColor: '#4caf50',
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  secondaryButton: {
    flex: 1,
    marginHorizontal: 5,
  },
  modalContainer: {
    backgroundColor: '#fff',
    padding: 20,
    marginHorizontal: 20,
    borderRadius: 12,
    maxWidth: 400,
    width: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  input: {
    marginBottom: 15,
  },
  modalLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  radioRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  modalButton: {
    marginLeft: 10,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    marginTop: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  textInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  inputSuffix: {
    paddingHorizontal: 12,
    color: '#666',
  },
  radioGroup: {
    marginTop: 8,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#1976d2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  radioCircleSelected: {
    borderColor: '#1976d2',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1976d2',
  },
  radioLabel: {
    fontSize: 14,
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 15,
  },
});

export default BillDetailScreen;
