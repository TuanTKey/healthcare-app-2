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

const AllBillsScreen = ({ navigation, route }) => {
  const initialFilter = route.params?.filter || 'all';
  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialFilter);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [sortBy, setSortBy] = useState('newest');

  const fetchBills = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/bills');
      console.log('📋 AllBills response:', JSON.stringify(response.data, null, 2));
      
      // Handle nested response: { data: { data: { data: [...], pagination: {...} } } }
      let billsData = [];
      if (Array.isArray(response.data?.data?.data)) {
        billsData = response.data.data.data;
      } else if (Array.isArray(response.data?.data?.bills)) {
        billsData = response.data.data.bills;
      } else if (Array.isArray(response.data?.data)) {
        billsData = response.data.data;
      } else if (Array.isArray(response.data)) {
        billsData = response.data;
      }
      
      console.log('📋 Bills extracted:', billsData.length, 'items');
      setBills(billsData);
    } catch (error) {
      console.error('Error fetching bills:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách hóa đơn');
      setBills([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  useEffect(() => {
    let result = [...bills];

    // Filter by status - sử dụng đúng status từ API
    if (statusFilter === 'pending') {
      result = result.filter(b => b.status === 'ISSUED' || b.status === 'PARTIAL');
    } else if (statusFilter === 'paid') {
      result = result.filter(b => b.status === 'PAID');
    } else if (statusFilter === 'cancelled') {
      result = result.filter(b => b.status === 'CANCELLED' || b.status === 'WRITTEN_OFF');
    }

    // Search - sử dụng patientId thay vì patient
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(b => 
        (b.billNumber && b.billNumber.toLowerCase().includes(query)) ||
        (b.patientId?.personalInfo?.firstName && b.patientId.personalInfo.firstName.toLowerCase().includes(query)) ||
        (b.patientId?.personalInfo?.lastName && b.patientId.personalInfo.lastName.toLowerCase().includes(query))
      );
    }

    // Sort - sử dụng grandTotal thay vì totalAmount
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'highest':
          return (b.grandTotal || 0) - (a.grandTotal || 0);
        case 'lowest':
          return (a.grandTotal || 0) - (b.grandTotal || 0);
        default:
          return 0;
      }
    });

    setFilteredBills(result);
  }, [bills, statusFilter, searchQuery, sortBy]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBills();
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
      case 'PAID': return '#4caf50';
      case 'PENDING': return '#ff9800';
      case 'ISSUED': return '#ff9800';
      case 'PARTIAL': return '#2196f3';
      case 'PARTIALLY_PAID': return '#2196f3';
      case 'OVERDUE': return '#f44336';
      case 'CANCELLED': return '#f44336';
      case 'WRITTEN_OFF': return '#9e9e9e';
      case 'VOIDED': return '#9e9e9e';
      default: return '#757575';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'PAID': return 'Đã thanh toán';
      case 'PENDING': return 'Chờ thanh toán';
      case 'ISSUED': return 'Chờ thanh toán';
      case 'PARTIAL': return 'Thanh toán một phần';
      case 'PARTIALLY_PAID': return 'Thanh toán một phần';
      case 'OVERDUE': return 'Quá hạn';
      case 'CANCELLED': return 'Đã hủy';
      case 'WRITTEN_OFF': return 'Đã xóa';
      case 'VOIDED': return 'Đã vô hiệu';
      default: return status;
    }
  };

  const renderBillItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('BillDetail', { billId: item._id })}
    >
      <Card style={styles.billCard}>
        <View style={styles.billHeader}>
          <View>
            <Text style={styles.billNumber}>#{item.billNumber || item._id?.slice(-8)}</Text>
            <Text style={styles.billDate}>
              {new Date(item.createdAt).toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
          <Chip
            style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) + '20' }]}
            textStyle={[styles.statusText, { color: getStatusColor(item.status) }]}
            label={getStatusLabel(item.status)}
          />
        </View>

        <View style={styles.patientInfo}>
          <MaterialIcons name="person" size={18} color="#666" />
          <Text style={styles.patientName}>
            {item.patientId?.personalInfo?.firstName} {item.patientId?.personalInfo?.lastName}
          </Text>
        </View>

        {item.services && item.services.length > 0 && (
          <View style={styles.itemsPreview}>
            <Text style={styles.itemsLabel}>
              {item.services.length} dịch vụ/thuốc
            </Text>
          </View>
        )}

        <View style={styles.billFooter}>
          <View>
            <Text style={styles.amountLabel}>Tổng tiền</Text>
            <Text style={styles.totalAmount}>{formatCurrency(item.grandTotal || item.totalAmount)}</Text>
          </View>
          {(item.status === 'PARTIAL' || item.status === 'PARTIALLY_PAID') && (
            <View>
              <Text style={styles.amountLabel}>Còn lại</Text>
              <Text style={styles.remainingAmount}>
                {formatCurrency(item.balanceDue || (item.grandTotal || 0) - (item.amountPaid || 0))}
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('BillDetail', { billId: item._id })}
          >
            <MaterialIcons name="arrow-forward" size={24} color="#1976d2" />
          </TouchableOpacity>
        </View>
      </Card>
    </TouchableOpacity>
  );

  const FilterButton = ({ label, value, isActive }) => (
    <TouchableOpacity
      style={[styles.filterButton, isActive && styles.filterButtonActive]}
      onPress={() => setStatusFilter(value)}
    >
      <Text style={[styles.filterButtonText, isActive && styles.filterButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const SortOption = ({ label, value }) => (
    <TouchableOpacity
      style={styles.sortOption}
      onPress={() => {
        setSortBy(value);
        setSortMenuVisible(false);
      }}
    >
      {sortBy === value && <MaterialIcons name="check" size={18} color="#1976d2" />}
      <Text style={[styles.sortOptionText, sortBy === value && { color: '#1976d2' }]}>
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
      {/* Search Bar */}
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
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setSortMenuVisible(!sortMenuVisible)}
        >
          <MaterialIcons name="sort" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Sort Menu */}
      {sortMenuVisible && (
        <View style={styles.sortMenu}>
          <SortOption label="Mới nhất" value="newest" />
          <SortOption label="Cũ nhất" value="oldest" />
          <SortOption label="Giá cao nhất" value="highest" />
          <SortOption label="Giá thấp nhất" value="lowest" />
        </View>
      )}

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <FilterButton label="Tất cả" value="all" isActive={statusFilter === 'all'} />
        <FilterButton label="Chờ TT" value="pending" isActive={statusFilter === 'pending'} />
        <FilterButton label="Đã TT" value="paid" isActive={statusFilter === 'paid'} />
        <FilterButton label="Đã hủy" value="cancelled" isActive={statusFilter === 'cancelled'} />
      </View>

      {/* Results Count */}
      <View style={styles.resultCount}>
        <Text style={styles.resultText}>
          {filteredBills.length} hóa đơn
        </Text>
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
            <MaterialIcons name="receipt-long" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Không có hóa đơn nào</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
  },
  searchBar: {
    flex: 1,
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
  sortButton: {
    padding: 10,
    marginLeft: 8,
  },
  sortMenu: {
    position: 'absolute',
    top: 64,
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 1000,
    minWidth: 150,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sortOptionText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
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
  resultCount: {
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  resultText: {
    color: '#666',
    fontSize: 13,
  },
  listContainer: {
    padding: 10,
    paddingBottom: 20,
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
  billDate: {
    fontSize: 12,
    color: '#999',
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
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  patientName: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  itemsPreview: {
    marginBottom: 10,
  },
  itemsLabel: {
    fontSize: 13,
    color: '#666',
  },
  billFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 12,
    color: '#999',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  remainingAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff9800',
  },
  actionButton: {
    padding: 8,
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

export default AllBillsScreen;
