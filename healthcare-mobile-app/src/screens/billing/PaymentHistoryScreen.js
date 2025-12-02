import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Card from '../../components/common/Card';
import Chip from '../../components/common/Chip';
import api from '../../services/api';

const PaymentHistoryScreen = ({ navigation }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchPaymentHistory = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/bills');
      console.log('💳 PaymentHistory response:', JSON.stringify(response.data, null, 2));
      
      // Handle nested response: { data: { data: { data: [...], pagination: {...} } } }
      let allBills = [];
      if (Array.isArray(response.data?.data?.data)) {
        allBills = response.data.data.data;
      } else if (Array.isArray(response.data?.data?.bills)) {
        allBills = response.data.data.bills;
      } else if (Array.isArray(response.data?.data)) {
        allBills = response.data.data;
      } else if (Array.isArray(response.data)) {
        allBills = response.data;
      }
      
      console.log('💳 Bills extracted for payments:', allBills.length, 'items');
      
      // Extract all payments from bills
      const allPayments = [];
      allBills.forEach(bill => {
        if (bill.payments && Array.isArray(bill.payments) && bill.payments.length > 0) {
          bill.payments.forEach(payment => {
            allPayments.push({
              ...payment,
              bill: {
                _id: bill._id,
                billNumber: bill.billNumber,
                patient: bill.patientId, // API returns patientId populated
                grandTotal: bill.grandTotal,
              },
            });
          });
        }
      });

      // Sort by date (newest first)
      allPayments.sort((a, b) => 
        new Date(b.paymentDate || b.paidAt || b.createdAt) - new Date(a.paymentDate || a.paidAt || a.createdAt)
      );

      console.log('💳 Total payments found:', allPayments.length);
      setPayments(allPayments);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPaymentHistory();
  }, [fetchPaymentHistory]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPaymentHistory();
    setRefreshing(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount || 0);
  };

  const getPaymentMethodLabel = (method) => {
    switch (method) {
      case 'CASH': return 'Tiền mặt';
      case 'BANK_TRANSFER': return 'Chuyển khoản';
      case 'CREDIT_CARD': return 'Thẻ tín dụng';
      case 'E_WALLET': return 'Ví điện tử';
      case 'INSURANCE': return 'Bảo hiểm';
      default: return method || 'Không xác định';
    }
  };

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'CASH': return 'payments';
      case 'BANK_TRANSFER': return 'account-balance';
      case 'CREDIT_CARD': return 'credit-card';
      case 'E_WALLET': return 'account-balance-wallet';
      case 'INSURANCE': return 'health-and-safety';
      default: return 'payment';
    }
  };

  const getPaymentMethodColor = (method) => {
    switch (method) {
      case 'CASH': return '#4caf50';
      case 'BANK_TRANSFER': return '#2196f3';
      case 'CREDIT_CARD': return '#9c27b0';
      case 'E_WALLET': return '#ff9800';
      case 'INSURANCE': return '#00bcd4';
      default: return '#757575';
    }
  };

  const filteredPayments = payments.filter(payment => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (payment.bill?.billNumber && payment.bill.billNumber.toLowerCase().includes(query)) ||
      (payment.bill?.patient?.personalInfo?.firstName && 
        payment.bill.patient.personalInfo.firstName.toLowerCase().includes(query)) ||
      (payment.bill?.patient?.personalInfo?.lastName && 
        payment.bill.patient.personalInfo.lastName.toLowerCase().includes(query))
    );
  });

  const renderPaymentItem = ({ item }) => (
    <Card style={styles.paymentCard}>
      <View style={styles.paymentHeader}>
        <View style={[styles.methodIcon, { backgroundColor: getPaymentMethodColor(item.method || item.paymentMethod) + '20' }]}>
          <MaterialIcons 
            name={getPaymentMethodIcon(item.method || item.paymentMethod)} 
            size={24} 
            color={getPaymentMethodColor(item.method || item.paymentMethod)} 
          />
        </View>
        <View style={styles.paymentInfo}>
          <Text style={styles.paymentAmount}>{formatCurrency(item.amount)}</Text>
          <Chip
            style={[styles.methodChip, { backgroundColor: getPaymentMethodColor(item.method || item.paymentMethod) + '20' }]}
            textStyle={{ color: getPaymentMethodColor(item.method || item.paymentMethod), fontSize: 11 }}
            label={getPaymentMethodLabel(item.method || item.paymentMethod)}
          />
        </View>
      </View>

      <View style={styles.billInfo}>
        <Text style={styles.billNumber}>
          HĐ: #{item.bill?.billNumber || item.bill?._id?.slice(-8)}
        </Text>
        <Text style={styles.patientName}>
          {item.bill?.patient?.personalInfo?.firstName || ''} {item.bill?.patient?.personalInfo?.lastName || 'Không xác định'}
        </Text>
      </View>

      <View style={styles.paymentFooter}>
        <View style={styles.dateContainer}>
          <MaterialIcons name="access-time" size={14} color="#999" />
          <Text style={styles.paymentDate}>
            {new Date(item.paymentDate || item.paidAt || item.createdAt).toLocaleDateString('vi-VN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        {item.receivedBy && (
          <Text style={styles.receivedBy}>Thu bởi: {item.receivedBy}</Text>
        )}
      </View>
    </Card>
  );

  // Calculate today's total
  const today = new Date().toDateString();
  const todayPayments = payments.filter(p => 
    new Date(p.paymentDate || p.paidAt || p.createdAt).toDateString() === today
  );
  const todayTotal = todayPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976d2" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo mã HĐ, tên bệnh nhân..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Today Summary */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryContent}>
          <MaterialIcons name="today" size={24} color="#fff" />
          <View style={styles.summaryText}>
            <Text style={styles.summaryLabel}>Thu hôm nay</Text>
            <Text style={styles.summaryValue}>{formatCurrency(todayTotal)}</Text>
          </View>
        </View>
        <Text style={styles.summaryCount}>{todayPayments.length} giao dịch</Text>
      </View>

      {/* Payment List */}
      <FlatList
        data={filteredPayments}
        renderItem={renderPaymentItem}
        keyExtractor={(item, index) => `${item._id || item.paymentId || index}-${item.paymentDate || item.createdAt}`}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="history" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Chưa có lịch sử thanh toán</Text>
          </View>
        }
      />
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
  searchContainer: {
    padding: 10,
    backgroundColor: '#fff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#4caf50',
    padding: 15,
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 12,
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryText: {
    marginLeft: 12,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  summaryCount: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
  },
  listContainer: {
    padding: 15,
    paddingTop: 10,
  },
  paymentCard: {
    marginBottom: 10,
    borderRadius: 12,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentInfo: {
    marginLeft: 12,
    flex: 1,
  },
  paymentAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  methodChip: {
    alignSelf: 'flex-start',
    marginTop: 4,
    height: 24,
  },
  billInfo: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  billNumber: {
    fontSize: 13,
    color: '#1976d2',
    fontWeight: '500',
  },
  patientName: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  paymentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentDate: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  receivedBy: {
    fontSize: 12,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
  },
});

export default PaymentHistoryScreen;
