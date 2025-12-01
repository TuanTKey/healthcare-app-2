import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  RefreshControl,
  TextInput
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../services/api';

const DoctorLabOrders = ({ navigation }) => {
  const [labOrders, setLabOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchLabOrders();
  }, []);

  const fetchLabOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/lab-orders?limit=100');
      
      let data = [];
      if (response.data?.data?.labOrders) {
        data = response.data.data.labOrders;
      } else if (Array.isArray(response.data?.data)) {
        data = response.data.data;
      }

      // Sort by date (newest first)
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setLabOrders(data);
    } catch (error) {
      console.error('Error fetching lab orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLabOrders();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    const colors = {
      'PENDING': '#FF9800',
      'SAMPLE_COLLECTED': '#9C27B0',
      'IN_PROGRESS': '#2196F3',
      'COMPLETED': '#4CAF50',
      'CANCELLED': '#F44336'
    };
    return colors[status] || '#999';
  };

  const getStatusText = (status) => {
    const texts = {
      'PENDING': 'Chờ lấy mẫu',
      'SAMPLE_COLLECTED': 'Đã lấy mẫu',
      'IN_PROGRESS': 'Đang xử lý',
      'COMPLETED': 'Có kết quả',
      'CANCELLED': 'Đã hủy'
    };
    return texts[status] || status;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'URGENT': '#F44336',
      'HIGH': '#FF9800',
      'NORMAL': '#4CAF50',
      'LOW': '#9E9E9E'
    };
    return colors[priority] || '#999';
  };

  const FilterButton = ({ label, value }) => (
    <TouchableOpacity
      style={[styles.filterButton, filter === value && styles.filterButtonActive]}
      onPress={() => setFilter(value)}
    >
      <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const LabOrderCard = ({ item }) => {
    const date = new Date(item.orderDate || item.createdAt);
    const patientName = item.patient?.userId?.personalInfo 
      ? `${item.patient.userId.personalInfo.firstName} ${item.patient.userId.personalInfo.lastName}`
      : 'Bệnh nhân';
    const testCount = item.tests?.length || 0;

    return (
      <TouchableOpacity
        style={styles.labOrderCard}
        onPress={() => navigation.navigate('DoctorLabOrderDetail', { labOrderId: item._id })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="biotech" size={24} color="#FF5722" />
          </View>
          <View style={styles.labOrderInfo}>
            <Text style={styles.patientName}>{patientName}</Text>
            <Text style={styles.orderCode}>
              Mã: {item.orderNumber || item._id?.slice(-8)}
            </Text>
            <View style={styles.dateRow}>
              <MaterialIcons name="event" size={14} color="#666" />
              <Text style={styles.dateText}>
                {date.toLocaleDateString('vi-VN')}
              </Text>
            </View>
          </View>
          <View style={styles.badgeContainer}>
            {item.priority && item.priority !== 'NORMAL' && (
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
                <Text style={styles.priorityText}>{item.priority}</Text>
              </View>
            )}
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
            </View>
          </View>
        </View>

        {/* Tests Preview */}
        <View style={styles.testsContainer}>
          <Text style={styles.testsLabel}>
            <MaterialIcons name="science" size={14} color="#666" /> {testCount} xét nghiệm
          </Text>
          {item.tests?.slice(0, 3).map((test, index) => (
            <View key={index} style={styles.testItem}>
              <MaterialIcons 
                name={test.status === 'COMPLETED' ? 'check-circle' : 'radio-button-unchecked'} 
                size={16} 
                color={test.status === 'COMPLETED' ? '#4CAF50' : '#ccc'} 
              />
              <Text style={styles.testName} numberOfLines={1}>
                {test.testName || test.test?.name}
              </Text>
            </View>
          ))}
          {testCount > 3 && (
            <Text style={styles.moreText}>+{testCount - 3} xét nghiệm khác...</Text>
          )}
        </View>

        {item.clinicalNotes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Ghi chú lâm sàng:</Text>
            <Text style={styles.notesText} numberOfLines={2}>{item.clinicalNotes}</Text>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.cardFooter}>
          <TouchableOpacity style={styles.footerAction}>
            <MaterialIcons name="visibility" size={18} color="#00796B" />
            <Text style={styles.footerActionText}>Xem chi tiết</Text>
          </TouchableOpacity>
          {item.status === 'COMPLETED' && (
            <TouchableOpacity style={styles.footerAction}>
              <MaterialIcons name="assessment" size={18} color="#1976D2" />
              <Text style={styles.footerActionText}>Xem kết quả</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const filteredLabOrders = labOrders.filter(order => {
    if (filter === 'all') return true;
    if (filter === 'pending') return order.status === 'PENDING' || order.status === 'SAMPLE_COLLECTED';
    if (filter === 'processing') return order.status === 'IN_PROGRESS';
    if (filter === 'completed') return order.status === 'COMPLETED';
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#00796B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Phiếu Xét Nghiệm</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CreateLabOrder')}>
          <MaterialIcons name="add" size={24} color="#00796B" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{labOrders.length}</Text>
          <Text style={styles.statLabel}>Tổng số</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#FF9800' }]}>
            {labOrders.filter(o => o.status === 'PENDING').length}
          </Text>
          <Text style={styles.statLabel}>Chờ lấy mẫu</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#4CAF50' }]}>
            {labOrders.filter(o => o.status === 'COMPLETED').length}
          </Text>
          <Text style={styles.statLabel}>Có kết quả</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <FilterButton label="Tất cả" value="all" />
        <FilterButton label="Chờ xử lý" value="pending" />
        <FilterButton label="Đang làm" value="processing" />
        <FilterButton label="Có KQ" value="completed" />
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00796B" />
        </View>
      ) : (
        <FlatList
          data={filteredLabOrders}
          renderItem={({ item }) => <LabOrderCard item={item} />}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00796B']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="biotech" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Không có phiếu xét nghiệm</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2
  },
  statItem: {
    flex: 1,
    alignItems: 'center'
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00796B'
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4
  },
  statDivider: {
    width: 1,
    backgroundColor: '#eee'
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  filterButtonActive: {
    backgroundColor: '#FF5722',
    borderColor: '#FF5722'
  },
  filterText: {
    fontSize: 12,
    color: '#666'
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  listContent: {
    padding: 16
  },
  labOrderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FBE9E7',
    alignItems: 'center',
    justifyContent: 'center'
  },
  labOrderInfo: {
    flex: 1,
    marginLeft: 12
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  orderCode: {
    fontSize: 12,
    color: '#666',
    marginTop: 2
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  dateText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4
  },
  badgeContainer: {
    alignItems: 'flex-end'
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 4
  },
  priorityText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: 'bold'
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold'
  },
  testsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  testsLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8
  },
  testItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  testName: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1
  },
  moreText: {
    fontSize: 12,
    color: '#FF5722',
    fontStyle: 'italic',
    marginTop: 4
  },
  notesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  notesLabel: {
    fontSize: 12,
    color: '#999'
  },
  notesText: {
    fontSize: 13,
    color: '#666',
    marginTop: 4
  },
  cardFooter: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    justifyContent: 'flex-end'
  },
  footerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  footerActionText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16
  }
});

export default DoctorLabOrders;
