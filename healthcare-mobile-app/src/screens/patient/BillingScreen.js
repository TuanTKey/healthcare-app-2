import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Text, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';

const BillingScreen = () => {
  const { user } = useSelector(state => state.auth);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const mockBills = [
    {
      id: '1',
      billNumber: 'HD-2024-001',
      date: '2024-01-15',
      services: [
        { name: 'Khám bệnh', amount: 200000 },
        { name: 'Xét nghiệm máu', amount: 150000 },
        { name: 'Thuốc', amount: 300000 }
      ],
      totalAmount: 650000,
      paidAmount: 650000,
      status: 'paid',
      paymentMethod: 'Tiền mặt'
    },
    {
      id: '2',
      billNumber: 'HD-2024-002',
      date: '2024-01-20',
      services: [
        { name: 'Khám bệnh', amount: 200000 },
        { name: 'Chụp X-Quang', amount: 250000 }
      ],
      totalAmount: 450000,
      paidAmount: 0,
      status: 'pending',
      paymentMethod: null
    }
  ];

  useEffect(() => {
    loadBills();
  }, []);

  const loadBills = async () => {
    setLoading(true);
    setTimeout(() => {
      setBills(mockBills);
      setLoading(false);
    }, 1000);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBills();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return '#4caf50';
      case 'pending': return '#ff9800';
      case 'cancelled': return '#f44336';
      default: return '#999';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'paid': return 'ĐÃ THANH TOÁN';
      case 'pending': return 'CHỜ THANH TOÁN';
      case 'cancelled': return 'ĐÃ HỦY';
      default: return status;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
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
        <Text variant="headlineSmall" style={styles.title}>
          Hóa đơn & Thanh toán
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Lịch sử thanh toán và hóa đơn
        </Text>
      </View>

      {/* Summary Card */}
      <Card style={styles.summaryCard}>
        <Card.Content>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text variant="titleMedium" style={styles.summaryNumber}>
                {bills.length}
              </Text>
              <Text variant="bodySmall" style={styles.summaryLabel}>
                Tổng hóa đơn
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text variant="titleMedium" style={[styles.summaryNumber, styles.paidAmount]}>
                {formatCurrency(bills.filter(b => b.status === 'paid').reduce((sum, bill) => sum + bill.totalAmount, 0))}
              </Text>
              <Text variant="bodySmall" style={styles.summaryLabel}>
                Đã thanh toán
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text variant="titleMedium" style={[styles.summaryNumber, styles.pendingAmount]}>
                {formatCurrency(bills.filter(b => b.status === 'pending').reduce((sum, bill) => sum + bill.totalAmount, 0))}
              </Text>
              <Text variant="bodySmall" style={styles.summaryLabel}>
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
            <Text variant="titleMedium" style={styles.emptyText}>
              Chưa có hóa đơn
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              Các hóa đơn sẽ xuất hiện ở đây
            </Text>
          </Card.Content>
        </Card>
      ) : (
        bills.map((bill) => (
          <Card key={bill.id} style={styles.billCard}>
            <Card.Content>
              <View style={styles.billHeader}>
                <View>
                  <Text variant="titleMedium" style={styles.billNumber}>
                    {bill.billNumber}
                  </Text>
                  <Text variant="bodySmall" style={styles.billDate}>
                    {format(new Date(bill.date), 'dd/MM/yyyy')}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(bill.status) }]}>
                  <Text style={styles.statusText}>
                    {getStatusText(bill.status)}
                  </Text>
                </View>
              </View>

              <View style={{height: 1, backgroundColor: '#ccc', marginVertical: 10}} />

              {/* Services List */}
              <View style={styles.servicesSection}>
                {bill.services.map((service, index) => (
                  <View key={index} style={styles.serviceItem}>
                    <Text variant="bodyMedium" style={styles.serviceName}>
                      {service.name}
                    </Text>
                    <Text variant="bodyMedium" style={styles.serviceAmount}>
                      {formatCurrency(service.amount)}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={{height: 1, backgroundColor: '#ccc', marginVertical: 10}} />

              {/* Total Section */}
              <View style={styles.totalSection}>
                <Text variant="titleMedium" style={styles.totalLabel}>
                  Tổng cộng:
                </Text>
                <Text variant="titleMedium" style={styles.totalAmount}>
                  {formatCurrency(bill.totalAmount)}
                </Text>
              </View>

              {/* Payment Info */}
              {bill.status === 'paid' && (
                <View style={styles.paymentInfo}>
                  <Text variant="bodySmall" style={styles.paymentMethod}>
                    Phương thức: {bill.paymentMethod}
                  </Text>
                  <Text variant="bodySmall" style={styles.paidAmount}>
                    Đã thanh toán: {formatCurrency(bill.paidAmount)}
                  </Text>
                </View>
              )}

              {/* Action Button */}
              {bill.status === 'pending' && (
                <Button 
                  mode="contained" 
                  style={styles.payButton}
                  onPress={() => console.log('Pay bill', bill.id)}
                >
                  Thanh toán ngay
                </Button>
              )}

              {bill.status === 'paid' && (
                <Button 
                  mode="outlined" 
                  style={styles.downloadButton}
                  onPress={() => console.log('Download bill', bill.id)}
                >
                  Tải hóa đơn
                </Button>
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
  },
  paidAmount: {
    color: '#4caf50',
  },
  pendingAmount: {
    color: '#ff9800',
  },
  summaryLabel: {
    color: '#666',
    marginTop: 4,
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
  },
  emptySubtext: {
    marginTop: 8,
    color: '#999',
    textAlign: 'center',
  },
  billCard: {
    margin: 16,
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
  },
  billDate: {
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    marginVertical: 12,
  },
  servicesSection: {
    marginBottom: 12,
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceName: {
    flex: 1,
    color: '#333',
  },
  serviceAmount: {
    fontWeight: '500',
    color: '#333',
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalLabel: {
    fontWeight: '600',
  },
  totalAmount: {
    fontWeight: 'bold',
    color: '#1976d2',
  },
  paymentInfo: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  paymentMethod: {
    color: '#666',
    marginBottom: 4,
  },
  paidAmount: {
    color: '#4caf50',
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