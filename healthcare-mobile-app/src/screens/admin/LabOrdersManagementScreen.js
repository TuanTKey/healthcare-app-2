import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  FlatList,
  RefreshControl,
  Modal,
  Text,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

const LabOrdersManagementScreen = ({ navigation }) => {
  const [labOrders, setLabOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filter, setFilter] = useState('all'); // all, pending, in_progress, completed
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchLabOrders();
  }, [filter]);

  const fetchLabOrders = async () => {
    try {
      setLoading(true);
      let endpoint = '/laboratory/pending';
      
      if (filter === 'completed') {
        endpoint = '/laboratory/completed';
      }
      
      try {
        const response = await api.get(endpoint, {
          params: { limit: 100 }
        });
        const orders = response.data?.data?.docs || response.data?.data || [];
        
        // Filter based on status
        let filteredOrders = orders;
        if (filter === 'pending') {
          filteredOrders = orders.filter(o => o.status === 'PENDING' || o.status === 'ORDERED');
        } else if (filter === 'in_progress') {
          filteredOrders = orders.filter(o => o.status === 'IN_PROGRESS' || o.status === 'SAMPLE_COLLECTED');
        }
        
        setLabOrders(filteredOrders);
      } catch (err) {
        console.warn('Lab orders API error:', err.message);
        // Generate mock data
        setLabOrders(generateMockLabOrders());
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tải danh sách xét nghiệm');
    } finally {
      setLoading(false);
    }
  };

  const generateMockLabOrders = () => {
    return [
      {
        _id: 'mock-1',
        orderNumber: 'LAB-2024-001',
        patient: { personalInfo: { firstName: 'Nguyễn', lastName: 'Văn A' }, email: 'patient1@test.com' },
        doctor: { personalInfo: { firstName: 'Bác sĩ', lastName: 'Trần' } },
        status: 'PENDING',
        priority: 'NORMAL',
        tests: [
          { testName: 'Xét nghiệm máu tổng quát', status: 'PENDING' },
          { testName: 'Xét nghiệm nước tiểu', status: 'PENDING' }
        ],
        createdAt: new Date(Date.now() - 1000 * 60 * 30)
      },
      {
        _id: 'mock-2',
        orderNumber: 'LAB-2024-002',
        patient: { personalInfo: { firstName: 'Trần', lastName: 'Thị B' }, email: 'patient2@test.com' },
        doctor: { personalInfo: { firstName: 'Bác sĩ', lastName: 'Lê' } },
        status: 'IN_PROGRESS',
        priority: 'URGENT',
        tests: [
          { testName: 'CT Scan', status: 'IN_PROGRESS' },
          { testName: 'X-Ray phổi', status: 'COMPLETED' }
        ],
        createdAt: new Date(Date.now() - 1000 * 60 * 120)
      },
      {
        _id: 'mock-3',
        orderNumber: 'LAB-2024-003',
        patient: { personalInfo: { firstName: 'Lê', lastName: 'Văn C' }, email: 'patient3@test.com' },
        doctor: { personalInfo: { firstName: 'Bác sĩ', lastName: 'Phạm' } },
        status: 'COMPLETED',
        priority: 'NORMAL',
        tests: [
          { testName: 'Siêu âm bụng', status: 'COMPLETED' }
        ],
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24)
      }
    ];
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLabOrders();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    const colors = {
      PENDING: '#FF9800',
      ORDERED: '#FF9800',
      SAMPLE_COLLECTED: '#2196F3',
      IN_PROGRESS: '#2196F3',
      COMPLETED: '#4CAF50',
      CANCELLED: '#F44336',
      APPROVED: '#4CAF50'
    };
    return colors[status] || '#9E9E9E';
  };

  const getStatusText = (status) => {
    const texts = {
      PENDING: 'Chờ xử lý',
      ORDERED: 'Đã chỉ định',
      SAMPLE_COLLECTED: 'Đã lấy mẫu',
      IN_PROGRESS: 'Đang thực hiện',
      COMPLETED: 'Hoàn thành',
      CANCELLED: 'Đã hủy',
      APPROVED: 'Đã duyệt'
    };
    return texts[status] || status;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      URGENT: '#F44336',
      HIGH: '#FF9800',
      NORMAL: '#4CAF50',
      LOW: '#9E9E9E'
    };
    return colors[priority] || '#9E9E9E';
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      setActionLoading(true);
      await api.put(`/laboratory/orders/${orderId}`, { status: newStatus });
      Alert.alert('Thành công', 'Cập nhật trạng thái thành công');
      fetchLabOrders();
      setShowDetailModal(false);
    } catch (error) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể cập nhật trạng thái');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelOrder = (orderId) => {
    Alert.alert(
      'Xác nhận',
      'Bạn có chắc chắn muốn hủy chỉ định xét nghiệm này?',
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Hủy',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await api.put(`/laboratory/orders/${orderId}/cancel`, {
                reason: 'Hủy bởi Admin'
              });
              Alert.alert('Thành công', 'Đã hủy chỉ định xét nghiệm');
              fetchLabOrders();
              setShowDetailModal(false);
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể hủy chỉ định');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const FilterButton = ({ label, value }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filter === value && styles.filterButtonActive
      ]}
      onPress={() => setFilter(value)}
    >
      <Text
        style={[
          styles.filterButtonText,
          filter === value && styles.filterButtonTextActive
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const LabOrderItem = ({ item }) => {
    const patientName = item.patient?.personalInfo 
      ? `${item.patient.personalInfo.firstName} ${item.patient.personalInfo.lastName}`
      : item.patient?.email || 'N/A';
    
    const doctorName = item.doctor?.personalInfo
      ? `${item.doctor.personalInfo.firstName} ${item.doctor.personalInfo.lastName}`
      : 'N/A';

    return (
      <TouchableOpacity
        onPress={() => {
          setSelectedOrder(item);
          setShowDetailModal(true);
        }}
      >
        <Card style={styles.orderCard}>
          <Card.Content>
            <View style={styles.orderHeader}>
              <View style={styles.orderInfo}>
                <Text style={styles.orderNumber}>{item.orderNumber || `#${item._id.slice(-6)}`}</Text>
                <Text style={styles.patientName}>{patientName}</Text>
              </View>
              <View style={styles.orderMeta}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                  <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
                </View>
                {item.priority && item.priority !== 'NORMAL' && (
                  <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
                    <Text style={styles.priorityText}>{item.priority}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.testsContainer}>
              <MaterialIcons name="science" size={16} color="#666" />
              <Text style={styles.testsText}>
                {item.tests?.length || 0} xét nghiệm
              </Text>
            </View>

            <View style={styles.orderFooter}>
              <View style={styles.doctorInfo}>
                <MaterialIcons name="medical-services" size={14} color="#666" />
                <Text style={styles.doctorName}>{doctorName}</Text>
              </View>
              <Text style={styles.orderDate}>
                {new Date(item.createdAt).toLocaleDateString('vi-VN')}
              </Text>
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={28} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Quản Lý Xét Nghiệm</Text>
        <TouchableOpacity onPress={onRefresh}>
          <MaterialIcons name="refresh" size={28} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={[styles.statItem, { backgroundColor: '#FFF3E0' }]}>
          <Text style={[styles.statValue, { color: '#FF9800' }]}>
            {labOrders.filter(o => o.status === 'PENDING' || o.status === 'ORDERED').length}
          </Text>
          <Text style={styles.statLabel}>Chờ xử lý</Text>
        </View>
        <View style={[styles.statItem, { backgroundColor: '#E3F2FD' }]}>
          <Text style={[styles.statValue, { color: '#2196F3' }]}>
            {labOrders.filter(o => o.status === 'IN_PROGRESS' || o.status === 'SAMPLE_COLLECTED').length}
          </Text>
          <Text style={styles.statLabel}>Đang thực hiện</Text>
        </View>
        <View style={[styles.statItem, { backgroundColor: '#E8F5E9' }]}>
          <Text style={[styles.statValue, { color: '#4CAF50' }]}>
            {labOrders.filter(o => o.status === 'COMPLETED').length}
          </Text>
          <Text style={styles.statLabel}>Hoàn thành</Text>
        </View>
      </View>

      {/* Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        <FilterButton label="Tất cả" value="all" />
        <FilterButton label="Chờ xử lý" value="pending" />
        <FilterButton label="Đang thực hiện" value="in_progress" />
        <FilterButton label="Hoàn thành" value="completed" />
      </ScrollView>

      {loading && !refreshing ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      ) : (
        <FlatList
          data={labOrders}
          renderItem={({ item }) => <LabOrderItem item={item} />}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="science" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Không có chỉ định xét nghiệm</Text>
            </View>
          )}
        />
      )}

      {/* Detail Modal */}
      <Modal visible={showDetailModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi Tiết Xét Nghiệm</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <MaterialIcons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedOrder && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Thông Tin Chung</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Mã chỉ định:</Text>
                    <Text style={styles.detailValue}>
                      {selectedOrder.orderNumber || `#${selectedOrder._id.slice(-6)}`}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Trạng thái:</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedOrder.status) }]}>
                      <Text style={styles.statusText}>{getStatusText(selectedOrder.status)}</Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Độ ưu tiên:</Text>
                    <Text style={[styles.detailValue, { color: getPriorityColor(selectedOrder.priority) }]}>
                      {selectedOrder.priority || 'NORMAL'}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Bệnh Nhân</Text>
                  <Text style={styles.detailValue}>
                    {selectedOrder.patient?.personalInfo
                      ? `${selectedOrder.patient.personalInfo.firstName} ${selectedOrder.patient.personalInfo.lastName}`
                      : selectedOrder.patient?.email || 'N/A'}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Danh Sách Xét Nghiệm</Text>
                  {selectedOrder.tests?.map((test, index) => (
                    <View key={index} style={styles.testItem}>
                      <View style={styles.testInfo}>
                        <MaterialIcons name="science" size={18} color="#2196F3" />
                        <Text style={styles.testName}>{test.testName || test.name || `Test ${index + 1}`}</Text>
                      </View>
                      <View style={[styles.testStatusBadge, { backgroundColor: getStatusColor(test.status) }]}>
                        <Text style={styles.testStatusText}>{getStatusText(test.status)}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Actions */}
                <View style={styles.actionsContainer}>
                  {selectedOrder.status === 'PENDING' && (
                    <>
                      <Button
                        mode="contained"
                        onPress={() => handleUpdateStatus(selectedOrder._id, 'IN_PROGRESS')}
                        style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
                        loading={actionLoading}
                      >
                        Bắt Đầu Thực Hiện
                      </Button>
                      <Button
                        mode="outlined"
                        onPress={() => handleCancelOrder(selectedOrder._id)}
                        style={styles.cancelButton}
                        loading={actionLoading}
                      >
                        Hủy Chỉ Định
                      </Button>
                    </>
                  )}
                  {selectedOrder.status === 'IN_PROGRESS' && (
                    <Button
                      mode="contained"
                      onPress={() => handleUpdateStatus(selectedOrder._id, 'COMPLETED')}
                      style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
                      loading={actionLoading}
                    >
                      Hoàn Thành
                    </Button>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Loading Overlay */}
      {actionLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
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
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginTop: 10
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 8
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold'
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 4
  },
  filterButtonActive: {
    backgroundColor: '#9C27B0'
  },
  filterButtonText: {
    fontSize: 13,
    color: '#666'
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: '600'
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    color: '#666'
  },
  listContent: {
    padding: 12
  },
  orderCard: {
    marginBottom: 12,
    borderRadius: 12
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  orderInfo: {
    flex: 1
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  patientName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2
  },
  orderMeta: {
    alignItems: 'flex-end'
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600'
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4
  },
  priorityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold'
  },
  testsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  testsText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#666'
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8
  },
  doctorInfo: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  doctorName: {
    marginLeft: 6,
    fontSize: 12,
    color: '#666'
  },
  orderDate: {
    fontSize: 12,
    color: '#999'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
    marginTop: 12
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  modalBody: {
    padding: 16
  },
  detailSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  detailLabel: {
    fontSize: 13,
    color: '#666',
    width: 100
  },
  detailValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
    flex: 1
  },
  testItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  testInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  testName: {
    marginLeft: 8,
    fontSize: 13,
    color: '#333'
  },
  testStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8
  },
  testStatusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600'
  },
  actionsContainer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },
  actionButton: {
    marginBottom: 10
  },
  cancelButton: {
    borderColor: '#F44336'
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  }
});

export default LabOrdersManagementScreen;
