import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Text,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Card from '../../components/common/Card';
import Chip from '../../components/common/Chip';
import api from '../../services/api';

const ProcessPaymentScreen = ({ navigation }) => {
  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('pending');

  const fetchPendingBills = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/bills');
      const allBills = response.data?.data?.bills || response.data?.data || [];
      
      // Filter only pending and partially paid bills
      const pendingBills = allBills.filter(
        b => b.status === 'PENDING' || b.status === 'PARTIALLY_PAID'
      );
      
      setBills(pendingBills);
    } catch (error) {
      console.error('Error fetching bills:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách hóa đơn');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingBills();
  }, [fetchPendingBills]);

  useEffect(() => {
    let result = [...bills];

    // Filter by status
    if (filter === 'pending') {
      result = result.filter(b => b.status === 'PENDING');
    } else if (filter === 'partial') {
      result = result.filter(b => b.status === 'PARTIALLY_PAID');
    }

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(b => 
        (b.billNumber && b.billNumber.toLowerCase().includes(query)) ||
        (b.patient?.personalInfo?.firstName && b.patient.personalInfo.firstName.toLowerCase().includes(query)) ||
        (b.patient?.personalInfo?.lastName && b.patient.personalInfo.lastName.toLowerCase().includes(query))
      );
    }

    // Sort by oldest first (urgent)
    result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    setFilteredBills(result);
  }, [bills, filter, searchQuery]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPendingBills();
    setRefreshing(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount || 0);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return '#ff9800';
      case 'PARTIALLY_PAID': return '#2196f3';
      default: return '#757575';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'PENDING': return 'Chờ thanh toán';
      case 'PARTIALLY_PAID': return 'Thanh toán một phần';
      default: return status;
    }
  };

  const getDaysWaiting = (createdAt) => {
    const days = Math.floor((new Date() - new Date(createdAt)) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Hôm nay';
    if (days === 1) return '1 ngày trước';
    return `${days} ngày trước`;
  };

  const renderBillItem = ({ item }) => {
    const remainingAmount = (item.totalAmount || 0) - (item.paidAmount || 0);
    
    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('BillDetail', { billId: item._id })}
      >
        <Card style={styles.billCard}>
          <View style={styles.billHeader}>
            <View>
              <Text style={styles.billNumber}>#{item.billNumber || item._id?.slice(-8)}</Text>
              <Text style={styles.waitingDays}>{getDaysWaiting(item.createdAt)}</Text>
            </View>
            <Chip
              style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) + '20' }]}
              textStyle={[styles.statusText, { color: getStatusColor(item.status) }]}
              label={getStatusLabel(item.status)}
            />
          </View>

          <View style={styles.patientInfo}>
            <MaterialIcons name="person" size={20} color="#666" />
            <Text style={styles.patientName}>
              {item.patient?.personalInfo?.firstName} {item.patient?.personalInfo?.lastName}
            </Text>
          </View>

          <View style={styles.amountContainer}>
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Tổng tiền:</Text>
              <Text style={styles.totalAmount}>{formatCurrency(item.totalAmount)}</Text>
            </View>
            {item.paidAmount > 0 && (
              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>Đã trả:</Text>
                <Text style={styles.paidAmount}>{formatCurrency(item.paidAmount)}</Text>
              </View>
            )}
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Còn lại:</Text>
              <Text style={styles.remainingAmount}>{formatCurrency(remainingAmount)}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.payButton}
            onPress={() => navigation.navigate('BillDetail', { billId: item._id })}
          >
            <MaterialIcons name="payment" size={20} color="#fff" />
            <Text style={styles.payButtonText}>Thu tiền</Text>
          </TouchableOpacity>
        </Card>
      </TouchableOpacity>
    );
  };

  const FilterButton = ({ label, value, isActive }) => (
    <TouchableOpacity
      style={[styles.filterButton, isActive && styles.filterButtonActive]}
      onPress={() => setFilter(value)}
    >
      <Text style={[styles.filterButtonText, isActive && styles.filterButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

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

      {/* Filter */}
      <View style={styles.filterContainer}>
        <FilterButton label="Tất cả" value="all" isActive={filter === 'all'} />
        <FilterButton label="Chờ TT" value="pending" isActive={filter === 'pending'} />
        <FilterButton label="TT một phần" value="partial" isActive={filter === 'partial'} />
      </View>

      {/* Summary */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{filteredBills.length}</Text>
          <Text style={styles.summaryLabel}>Hóa đơn</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {formatCurrency(
              filteredBills.reduce((sum, b) => sum + ((b.totalAmount || 0) - (b.paidAmount || 0)), 0)
            )}
          </Text>
          <Text style={styles.summaryLabel}>Cần thu</Text>
        </View>
      </View>

      {/* Bills List */}
      <FlatList
        data={filteredBills}
        renderItem={renderBillItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="check-circle" size={64} color="#4caf50" />
            <Text style={styles.emptyText}>Không có hóa đơn cần thu</Text>
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingBottom: 10,
    backgroundColor: '#fff',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#1976d2',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  summaryContainer: {
    flexDirection: 'row',
    backgroundColor: '#1976d2',
    padding: 15,
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 12,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    marginTop: 4,
  },
  listContainer: {
    padding: 15,
    paddingTop: 10,
  },
  billCard: {
    marginBottom: 10,
    borderRadius: 12,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  billNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  waitingDays: {
    fontSize: 12,
    color: '#ff9800',
    marginTop: 2,
  },
  statusChip: {
    height: 28,
  },
  statusText: {
    fontSize: 11,
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  patientName: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  amountContainer: {
    marginBottom: 15,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  amountLabel: {
    fontSize: 13,
    color: '#666',
  },
  totalAmount: {
    fontSize: 14,
    color: '#333',
  },
  paidAmount: {
    fontSize: 14,
    color: '#4caf50',
  },
  remainingAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff9800',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4caf50',
    padding: 12,
    borderRadius: 8,
  },
  payButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#4caf50',
    marginTop: 10,
  },
});

export default ProcessPaymentScreen;
