import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Text, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useSelector } from 'react-redux';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import api from '../../services/api';

const BillingScreen = ({ navigation }) => {
  const { user } = useSelector(state => state.auth);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadBills();
  }, []);

  const loadBills = async () => {
    try {
      setLoading(true);
      
      // Lấy hoá đơn của bệnh nhân hiện tại
      const patientId = user?._id || user?.id;
      
      if (!patientId) {
        console.log('No patient ID found');
        setBills([]);
        return;
      }

      console.log('💰 Loading bills for patient:', patientId);
      
      // Thử lấy từ endpoint bills trước
      const response = await api.get('/bills', {
        params: { patientId, limit: 50 }
      });
      
      console.log('💰 Bills response:', JSON.stringify(response.data, null, 2));
      
      // Handle nested response structure
      let billsData = [];
      if (response.data?.data?.data) {
        billsData = response.data.data.data;
      } else if (Array.isArray(response.data?.data)) {
        billsData = response.data.data;
      } else if (response.data?.data?.docs) {
        billsData = response.data.data.docs;
      }
      
      // Filter bills cho patient này nếu API trả về tất cả
      if (patientId) {
        billsData = billsData.filter(bill => 
          bill.patientId === patientId || 
          bill.patientId?._id === patientId ||
          bill.patientId?.id === patientId
        );
      }
      
      setBills(billsData);
    } catch (error) {
      console.error('❌ Error loading bills:', error.response?.data || error.message);
      if (error.response?.status !== 404) {
        Alert.alert('Lỗi', 'Không thể tải danh sách hoá đơn');
      }
      setBills([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBills();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    const statusUpper = status?.toUpperCase();
    switch (statusUpper) {
      case 'PAID': return '#4caf50';
      case 'ISSUED':
      case 'PENDING': return '#ff9800';
      case 'PARTIAL': return '#2196f3';
      case 'VOIDED':
      case 'CANCELLED': return '#f44336';
      case 'OVERDUE': return '#e91e63';
      case 'DRAFT': return '#9e9e9e';
      default: return '#999';
    }
  };

  const getStatusText = (status) => {
    const statusUpper = status?.toUpperCase();
    switch (statusUpper) {
      case 'PAID': return 'ĐÃ THANH TOÁN';
      case 'ISSUED':
      case 'PENDING': return 'CHỜ THANH TOÁN';
      case 'PARTIAL': return 'THANH TOÁN MỘT PHẦN';
      case 'VOIDED':
      case 'CANCELLED': return 'ĐÃ HỦY';
      case 'OVERDUE': return 'QUÁ HẠN';
      case 'DRAFT': return 'NHÁP';
      default: return status || 'N/A';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount || 0);
  };

  // Helper để lấy tổng tiền từ bill
  const getBillTotal = (bill) => {
    return bill.grandTotal || bill.finalAmount || bill.totalAmount || 0;
  };

  // Helper để lấy số tiền đã thanh toán
  const getPaidAmount = (bill) => {
    return bill.amountPaid || bill.paidAmount || 0;
  };

  // Helper để lấy danh sách services
  const getServices = (bill) => {
    if (bill.services && bill.services.length > 0) {
      return bill.services.map(s => ({
        name: s.serviceName || s.name,
        amount: s.total || (s.quantity * s.unitPrice) || s.amount || 0
      }));
    }
    if (bill.items && bill.items.length > 0) {
      return bill.items.map(i => ({
        name: i.name || i.description,
        amount: i.total || (i.quantity * i.unitPrice) || 0
      }));
    }
    return [];
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Đang tải hóa đơn...</Text>
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
        <Text style={styles.title}>
          Hóa đơn & Thanh toán
        </Text>
        <Text style={styles.subtitle}>
          Lịch sử thanh toán và hóa đơn của bạn
        </Text>
      </View>

      {/* Summary Card */}
      <Card style={styles.summaryCard}>
        <Card.Content>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>
                {bills.length}
              </Text>
              <Text style={styles.summaryLabel}>
                Tổng hóa đơn
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, styles.paidAmountText]}>
                {formatCurrency(bills.filter(b => b.status?.toUpperCase() === 'PAID').reduce((sum, bill) => sum + getBillTotal(bill), 0))}
              </Text>
              <Text style={styles.summaryLabel}>
                Đã thanh toán
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, styles.pendingAmountText]}>
                {formatCurrency(bills.filter(b => ['PENDING', 'ISSUED', 'PARTIAL'].includes(b.status?.toUpperCase())).reduce((sum, bill) => sum + (getBillTotal(bill) - getPaidAmount(bill)), 0))}
              </Text>
              <Text style={styles.summaryLabel}>
                Chờ thanh toán
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {bills.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content style={styles.emptyContent}>
            <MaterialIcons name="receipt" size={48} color="#ccc" />
            <Text style={styles.emptyText}>
              Chưa có hóa đơn
            </Text>
            <Text style={styles.emptySubtext}>
              Các hóa đơn sẽ xuất hiện ở đây sau khi bạn khám bệnh hoặc mua thuốc
            </Text>
          </Card.Content>
        </Card>
      ) : (
        bills.map((bill) => {
          const services = getServices(bill);
          const total = getBillTotal(bill);
          const paid = getPaidAmount(bill);
          const remaining = total - paid;
          
          return (
            <TouchableOpacity 
              key={bill._id || bill.id} 
              style={styles.billCard}
              onPress={() => {
                if (bill._id) {
                  navigation?.navigate('BillDetail', { billId: bill._id });
                }
              }}
            >
              <Card>
                <Card.Content>
                  <View style={styles.billHeader}>
                    <View>
                      <Text style={styles.billNumber}>
                        {bill.billNumber || 'N/A'}
                      </Text>
                      <Text style={styles.billDate}>
                        {bill.issueDate || bill.createdAt 
                          ? format(new Date(bill.issueDate || bill.createdAt), 'dd/MM/yyyy', { locale: vi })
                          : 'N/A'
                        }
                      </Text>
                      {bill.billType && (
                        <Text style={styles.billType}>
                          {bill.billType === 'PHARMACY' ? '💊 Thuốc' : 
                           bill.billType === 'CONSULTATION' ? '🩺 Khám bệnh' :
                           bill.billType === 'LABORATORY' ? '🧪 Xét nghiệm' : bill.billType}
                        </Text>
                      )}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(bill.status) }]}>
                      <Text style={styles.statusText}>
                        {getStatusText(bill.status)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.dividerLine} />

                  {/* Services List */}
                  {services.length > 0 && (
                    <View style={styles.servicesSection}>
                      {services.slice(0, 3).map((service, index) => (
                        <View key={index} style={styles.serviceItem}>
                          <Text style={styles.serviceName} numberOfLines={1}>
                            {service.name}
                          </Text>
                          <Text style={styles.serviceAmount}>
                            {formatCurrency(service.amount)}
                          </Text>
                        </View>
                      ))}
                      {services.length > 3 && (
                        <Text style={styles.moreServices}>
                          +{services.length - 3} dịch vụ khác...
                        </Text>
                      )}
                    </View>
                  )}

                  <View style={styles.dividerLine} />

                  {/* Total Section */}
                  <View style={styles.totalSection}>
                    <Text style={styles.totalLabel}>
                      Tổng cộng:
                    </Text>
                    <Text style={styles.totalAmount}>
                      {formatCurrency(total)}
                    </Text>
                  </View>

                  {/* Payment Progress */}
                  {paid > 0 && paid < total && (
                    <View style={styles.paymentProgress}>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${(paid / total) * 100}%` }]} />
                      </View>
                      <Text style={styles.progressText}>
                        Đã thanh toán: {formatCurrency(paid)} / Còn lại: {formatCurrency(remaining)}
                      </Text>
                    </View>
                  )}

                  {/* Action Button */}
                  {['PENDING', 'ISSUED', 'PARTIAL'].includes(bill.status?.toUpperCase()) && (
                    <View style={styles.actionRow}>
                      <Text style={styles.remainingText}>
                        Cần thanh toán: {formatCurrency(remaining)}
                      </Text>
                    </View>
                  )}

                  {bill.status?.toUpperCase() === 'PAID' && (
                    <View style={styles.paidInfo}>
                      <MaterialIcons name="check-circle" size={16} color="#4caf50" />
                      <Text style={styles.paidInfoText}>Đã thanh toán đầy đủ</Text>
                    </View>
                  )}
                </Card.Content>
              </Card>
            </TouchableOpacity>
          );
        })
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
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  summaryCard: {
    margin: 16,
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryNumber: {
    fontWeight: 'bold',
    color: '#333',
    fontSize: 14,
  },
  paidAmountText: {
    color: '#4caf50',
  },
  pendingAmountText: {
    color: '#ff9800',
  },
  summaryLabel: {
    color: '#666',
    marginTop: 4,
    fontSize: 12,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e0e0e0',
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
    fontSize: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    marginTop: 8,
    color: '#999',
    textAlign: 'center',
    fontSize: 14,
    paddingHorizontal: 20,
  },
  billCard: {
    marginHorizontal: 16,
    marginTop: 8,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  billNumber: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#1976d2',
  },
  billDate: {
    color: '#666',
    marginTop: 2,
    fontSize: 13,
  },
  billType: {
    color: '#666',
    marginTop: 4,
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 10,
  },
  servicesSection: {
    marginBottom: 8,
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  serviceName: {
    flex: 1,
    color: '#333',
    fontSize: 14,
  },
  serviceAmount: {
    fontWeight: '500',
    color: '#333',
    fontSize: 14,
  },
  moreServices: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: {
    fontWeight: '600',
    fontSize: 15,
    color: '#333',
  },
  totalAmount: {
    fontWeight: 'bold',
    color: '#1976d2',
    fontSize: 16,
  },
  paymentProgress: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4caf50',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  actionRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  remainingText: {
    color: '#ff9800',
    fontWeight: '600',
    fontSize: 14,
  },
  paidInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  paidInfoText: {
    color: '#4caf50',
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '500',
  },
  payButton: {
    marginTop: 8,
  },
  downloadButton: {
    marginTop: 8,
  },
});

export default BillingScreen;