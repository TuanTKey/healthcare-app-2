import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, Text, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import api from '../../services/api';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Chip from '../../components/common/Chip';

const BillDetailScreen = ({ route, navigation }) => {
  const { billId } = route.params;
  
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadBill();
  }, []);

  const loadBill = async () => {
    try {
      setLoading(true);
      console.log('💰 Fetching bill details:', billId);
      
      const response = await api.get(`/bills/${billId}`);
      console.log('💰 Bill response:', JSON.stringify(response.data, null, 2));
      
      // Handle different response formats
      let billData = null;
      if (response.data?.data?.data) {
        billData = response.data.data.data;
      } else if (response.data?.data) {
        billData = response.data.data;
      } else if (response.data?.bill) {
        billData = response.data.bill;
      } else {
        billData = response.data;
      }
      
      console.log('💰 Extracted bill:', billData);
      setBill(billData);
    } catch (error) {
      console.error('❌ Lỗi tải chi tiết hoá đơn:', error.message);
      console.error('❌ Error details:', error.response?.data);
      Alert.alert('Lỗi', 'Không thể tải chi tiết hoá đơn');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBill();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PAID':
        return '#4CAF50';
      case 'PARTIAL':
        return '#FF9800';
      case 'ISSUED':
        return '#2196F3';
      case 'OVERDUE':
        return '#D32F2F';
      case 'WRITTEN_OFF':
        return '#9C27B0';
      default:
        return '#1976d2';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'PAID':
        return 'ĐÃ THANH TOÁN';
      case 'PARTIAL':
        return 'THANH TOÁN MỘT PHẦN';
      case 'ISSUED':
        return 'ĐÃ PHÁT HÀNH';
      case 'OVERDUE':
        return 'QUÁ HẠN';
      case 'WRITTEN_OFF':
        return 'GHI NỢ';
      default:
        return status;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Đang tải chi tiết...</Text>
      </View>
    );
  }

  if (!bill) {
    return (
      <View style={styles.centerContainer}>
        <MaterialIcons name="error-outline" size={48} color="#FF9800" />
        <Text style={styles.errorText}>Không thể tải chi tiết hoá đơn</Text>
        <Button mode="contained" style={styles.retryButton} onPress={loadBill}>
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
              <Text variant="headlineSmall" style={styles.billNumber}>
                {bill.billNumber || 'N/A'}
              </Text>
              <Text variant="bodySmall" style={styles.billType}>
                {bill.billType || 'Loại hoá đơn N/A'}
              </Text>
            </View>
            <Chip
              style={{ backgroundColor: getStatusColor(bill.status) }}
              textStyle={{ color: 'white' }}
              label={getStatusLabel(bill.status)}
            />
          </View>
          
          <View style={{height: 1, backgroundColor: '#ccc', marginVertical: 10}} />
          
          <View style={styles.patientSection}>
            <MaterialIcons name="person" size={18} color="#666" />
            <Text variant="bodySmall" style={styles.patientName}>
              {bill.patientId?.personalInfo?.firstName || 'Bệnh nhân N/A'}
            </Text>
          </View>

          <View style={styles.dateRow}>
            <View style={styles.dateItem}>
              <MaterialIcons name="event" size={16} color="#666" />
              <Text variant="bodySmall" style={styles.dateText}>
                {format(new Date(bill.issueDate), 'dd/MM/yyyy', { locale: vi })}
              </Text>
            </View>
            <MaterialIcons name="arrow-forward" size={16} color="#999" />
            <View style={styles.dateItem}>
              <MaterialIcons name="event-available" size={16} color="#666" />
              <Text variant="bodySmall" style={styles.dateText}>
                {format(new Date(bill.dueDate), 'dd/MM/yyyy', { locale: vi })}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Services / Items */}
      {bill.services && bill.services.length > 0 && (
        <Card style={styles.servicesCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              🛒 Dịch vụ ({bill.services.length})
            </Text>
            
            {bill.services.map((service, index) => (
              <View key={index} style={styles.serviceItem}>
                <View style={styles.serviceHeader}>
                  <Text variant="titleSmall" style={styles.serviceName}>
                    {service.serviceName || 'Dịch vụ N/A'}
                  </Text>
                  <Text variant="titleSmall" style={styles.servicePrice}>
                    {formatCurrency(service.total || 0)}
                  </Text>
                </View>
                
                {service.description && (
                  <Text variant="bodySmall" style={styles.serviceDesc}>
                    {service.description}
                  </Text>
                )}

                <View style={styles.serviceDetails}>
                  <Text variant="bodySmall" style={styles.detailLabel}>
                    Số lượng:
                  </Text>
                  <Text variant="bodySmall" style={styles.detailValue}>
                    {service.quantity || 1}
                  </Text>
                  <Text variant="bodySmall" style={styles.detailLabel}>
                    Đơn giá:
                  </Text>
                  <Text variant="bodySmall" style={styles.detailValue}>
                    {formatCurrency(service.unitPrice || 0)}
                  </Text>
                </View>

                {(service.discount || service.taxRate) && (
                  <View style={styles.adjustments}>
                    {service.discount > 0 && (
                      <Text variant="bodySmall" style={styles.discount}>
                        Giảm giá: -{formatCurrency(service.discount)}
                      </Text>
                    )}
                    {service.taxRate > 0 && (
                      <Text variant="bodySmall" style={styles.tax}>
                        Thuế {service.taxRate}%: +{formatCurrency((service.unitPrice * service.taxRate) / 100 || 0)}
                      </Text>
                    )}
                  </View>
                )}

                {index < bill.services.length - 1 && (
                  <View style={{height: 1, backgroundColor: '#ccc', marginVertical: 10}} />
                )}
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* Totals */}
      <Card style={styles.totalsCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            💹 Tổng cộng
          </Text>

          <View style={styles.totalRow}>
            <Text variant="bodyMedium" style={styles.totalLabel}>
              Tiền hàng:
            </Text>
            <Text variant="bodyMedium" style={styles.totalValue}>
              {formatCurrency(bill.subtotal || 0)}
            </Text>
          </View>

          {bill.totalDiscount > 0 && (
            <View style={styles.totalRow}>
              <Text variant="bodyMedium" style={styles.totalLabel}>
                Giảm giá:
              </Text>
              <Text variant="bodyMedium" style={[styles.totalValue, { color: '#4CAF50' }]}>
                -{formatCurrency(bill.totalDiscount || 0)}
              </Text>
            </View>
          )}

          {bill.totalTax > 0 && (
            <View style={styles.totalRow}>
              <Text variant="bodyMedium" style={styles.totalLabel}>
                Thuế:
              </Text>
              <Text variant="bodyMedium" style={styles.totalValue}>
                +{formatCurrency(bill.totalTax || 0)}
              </Text>
            </View>
          )}

          <View style={{height: 1, backgroundColor: '#ccc', marginVertical: 10}} />

          <View style={styles.grandTotal}>
            <Text variant="titleSmall" style={styles.totalLabel}>
              Tổng tiền:
            </Text>
            <Text variant="headlineSmall" style={styles.grandTotalValue}>
              {formatCurrency(bill.grandTotal || 0)}
            </Text>
          </View>

          <View style={{height: 1, backgroundColor: '#ccc', marginVertical: 10}} />

          <View style={styles.paymentStatus}>
            <View style={styles.paymentItem}>
              <Text variant="bodySmall" style={styles.paymentLabel}>
                Đã thanh toán:
              </Text>
              <Text variant="bodySmall" style={[styles.paymentValue, { color: '#4CAF50' }]}>
                {formatCurrency(bill.amountPaid || 0)}
              </Text>
            </View>

            <View style={styles.paymentItem}>
              <Text variant="bodySmall" style={styles.paymentLabel}>
                Còn nợ:
              </Text>
              <Text variant="bodySmall" style={[styles.paymentValue, { color: '#D32F2F' }]}>
                {formatCurrency(bill.balanceDue || 0)}
              </Text>
            </View>

            {bill.amountPaid > 0 && (
              <View style={styles.paymentProgress}>
                <Text variant="bodySmall" style={styles.progressLabel}>
                  Tiến độ thanh toán: {Math.round(((bill.amountPaid || 0) / (bill.grandTotal || 1)) * 100)}%
                </Text>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill,
                      { width: `${Math.round(((bill.amountPaid || 0) / (bill.grandTotal || 1)) * 100)}%` }
                    ]}
                  />
                </View>
              </View>
            )}
          </View>
        </Card.Content>
      </Card>

      {/* Payments History */}
      {bill.payments && bill.payments.length > 0 && (
        <Card style={styles.paymentsCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              📝 Lịch sử thanh toán ({bill.payments.length})
            </Text>
            
            {bill.payments.map((payment, index) => (
              <View key={index} style={styles.paymentHistoryItem}>
                <View style={styles.paymentHistoryHeader}>
                  <Text variant="bodySmall" style={styles.paymentDate}>
                    {format(new Date(payment.paymentDate), 'dd/MM/yyyy HH:mm', { locale: vi })}
                  </Text>
                  <Text variant="titleSmall" style={styles.paymentAmount}>
                    {formatCurrency(payment.amount || 0)}
                  </Text>
                </View>
                <View style={styles.paymentHistoryDetail}>
                  <Text variant="bodySmall" style={styles.paymentMethod}>
                    {payment.method || 'Phương thức N/A'} - {payment.status || 'Trạng thái N/A'}
                  </Text>
                </View>
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* Insurance Info */}
      {bill.insurance && (
        <Card style={styles.insuranceCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              🛡️ Bảo hiểm
            </Text>
            
            <View style={styles.insuranceDetail}>
              <Text variant="bodySmall" style={styles.insuranceLabel}>
                Nhà cung cấp:
              </Text>
              <Text variant="bodySmall" style={styles.insuranceValue}>
                {bill.insurance.provider || 'N/A'}
              </Text>
            </View>

            <View style={styles.insuranceDetail}>
              <Text variant="bodySmall" style={styles.insuranceLabel}>
                Số hợp đồng:
              </Text>
              <Text variant="bodySmall" style={styles.insuranceValue}>
                {bill.insurance.policyNumber || 'N/A'}
              </Text>
            </View>

            {bill.insurance.coverageAmount && (
              <View style={styles.insuranceDetail}>
                <Text variant="bodySmall" style={styles.insuranceLabel}>
                  Phạm vi bảo hiểm:
                </Text>
                <Text variant="bodySmall" style={styles.insuranceValue}>
                  {formatCurrency(bill.insurance.coverageAmount)}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Notes */}
      {bill.notes && (
        <Card style={styles.notesCard}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              📋 Ghi chú
            </Text>
            <Text variant="bodySmall" style={styles.notesText}>
              {bill.notes}
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
          onPress={() => console.log('In hoá đơn')}
        >
          In hoá đơn
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
  billNumber: {
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 4,
  },
  billType: {
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
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dateText: {
    marginLeft: 4,
    color: '#666',
    fontSize: 12,
  },
  servicesCard: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  serviceItem: {
    paddingVertical: 12,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  serviceName: {
    fontWeight: 'bold',
    color: '#1976d2',
    flex: 1,
  },
  servicePrice: {
    fontWeight: 'bold',
    color: '#333',
  },
  serviceDesc: {
    color: '#999',
    marginBottom: 8,
    marginTop: 4,
  },
  serviceDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  detailLabel: {
    color: '#666',
    width: '30%',
    fontWeight: '500',
  },
  detailValue: {
    color: '#333',
    width: '20%',
  },
  adjustments: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  discount: {
    color: '#4CAF50',
    marginTop: 4,
  },
  tax: {
    color: '#FF9800',
    marginTop: 2,
  },
  serviceDivider: {
    marginVertical: 12,
  },
  totalsCard: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  totalLabel: {
    color: '#666',
    fontWeight: '500',
  },
  totalValue: {
    color: '#333',
    fontWeight: '600',
  },
  totalsDivider: {
    marginVertical: 12,
  },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  grandTotalValue: {
    color: '#D32F2F',
    fontWeight: 'bold',
  },
  paymentStatus: {
    marginTop: 8,
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  paymentLabel: {
    color: '#666',
    fontWeight: '500',
  },
  paymentValue: {
    fontWeight: 'bold',
  },
  paymentProgress: {
    marginTop: 12,
  },
  progressLabel: {
    color: '#666',
    marginBottom: 6,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#eee',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  paymentsCard: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  paymentHistoryItem: {
    paddingVertical: 12,
  },
  paymentHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  paymentDate: {
    color: '#666',
  },
  paymentAmount: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  paymentHistoryDetail: {
    marginTop: 4,
  },
  paymentMethod: {
    color: '#999',
    fontSize: 11,
  },
  insuranceCard: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  insuranceDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  insuranceLabel: {
    color: '#666',
    fontWeight: '500',
  },
  insuranceValue: {
    color: '#333',
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

export default BillDetailScreen;
