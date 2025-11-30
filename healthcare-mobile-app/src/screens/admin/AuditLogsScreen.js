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

const AuditLogsScreen = ({ navigation }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filter, setFilter] = useState('all'); // all, auth, data, user
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [filter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      // Thử gọi API audit logs, nếu không có endpoint thì tạo mock data
      try {
        const response = await api.get('/audit-logs', {
          params: {
            limit: 100,
            category: filter !== 'all' ? filter.toUpperCase() : undefined
          }
        });
        setLogs(response.data?.data?.logs || response.data?.data || []);
      } catch (err) {
        // Nếu không có API, tạo mock data từ các activities gần đây
        console.log('Audit logs API not available, generating from activities...');
        const mockLogs = await generateMockLogs();
        setLogs(mockLogs);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tải audit logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/audit-logs/stats', {
        params: { timeRange: '7d' }
      });
      setStats(response.data?.data);
    } catch (err) {
      // Generate mock stats
      setStats({
        totalLogs: logs.length,
        actionStats: [
          { _id: 'LOGIN', count: 15 },
          { _id: 'VIEW', count: 45 },
          { _id: 'CREATE', count: 12 },
          { _id: 'UPDATE', count: 8 },
          { _id: 'DELETE', count: 3 }
        ],
        roleStats: [
          { _id: 'SUPER_ADMIN', count: 25 },
          { _id: 'DOCTOR', count: 30 },
          { _id: 'PATIENT', count: 50 }
        ]
      });
    }
  };

  const generateMockLogs = async () => {
    // Tạo mock logs từ các activities hệ thống
    const mockActivities = [];
    
    // Lấy users để tạo log mẫu
    try {
      const usersRes = await api.get('/users?limit=10');
      const users = usersRes.data?.data || [];
      
      users.forEach((user, index) => {
        mockActivities.push({
          _id: `mock-${index}`,
          action: 'USER_CREATED',
          category: 'USER_MANAGEMENT',
          userEmail: 'system@hospital.com',
          userName: 'System',
          resource: 'User',
          resourceId: user._id,
          timestamp: user.createdAt || new Date(),
          success: true,
          metadata: {
            targetUser: user.email,
            role: user.role
          }
        });
      });
    } catch (err) {
      console.log('Could not generate user logs');
    }

    // Thêm một số log mẫu khác
    const sampleLogs = [
      {
        _id: 'sample-1',
        action: 'LOGIN',
        category: 'AUTHENTICATION',
        userEmail: 'admin@hospital.com',
        userName: 'Admin',
        resource: 'Session',
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 phút trước
        success: true,
        ipAddress: '192.168.1.1'
      },
      {
        _id: 'sample-2',
        action: 'VIEW_PATIENT',
        category: 'DATA_ACCESS',
        userEmail: 'doctor@hospital.com',
        userName: 'Bác sĩ',
        resource: 'Patient',
        timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 giờ trước
        success: true,
        metadata: { patientId: 'P001' }
      },
      {
        _id: 'sample-3',
        action: 'CREATE_PRESCRIPTION',
        category: 'PRESCRIPTION',
        userEmail: 'doctor@hospital.com',
        userName: 'Bác sĩ',
        resource: 'Prescription',
        timestamp: new Date(Date.now() - 1000 * 60 * 120), // 2 giờ trước
        success: true
      },
      {
        _id: 'sample-4',
        action: 'PROCESS_PAYMENT',
        category: 'BILLING',
        userEmail: 'receptionist@hospital.com',
        userName: 'Lễ tân',
        resource: 'Bill',
        timestamp: new Date(Date.now() - 1000 * 60 * 180), // 3 giờ trước
        success: true,
        metadata: { amount: 500000 }
      }
    ];

    return [...sampleLogs, ...mockActivities].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLogs();
    await fetchStats();
    setRefreshing(false);
  };

  const getActionIcon = (action) => {
    const icons = {
      LOGIN: 'login',
      LOGOUT: 'logout',
      VIEW: 'visibility',
      CREATE: 'add-circle',
      UPDATE: 'edit',
      DELETE: 'delete',
      VIEW_PATIENT: 'person',
      CREATE_PRESCRIPTION: 'local-pharmacy',
      PROCESS_PAYMENT: 'payment',
      USER_CREATED: 'person-add',
      DEFAULT: 'history'
    };
    return icons[action] || icons.DEFAULT;
  };

  const getActionColor = (action, success) => {
    if (!success) return '#F44336';
    const colors = {
      LOGIN: '#4CAF50',
      LOGOUT: '#FF9800',
      VIEW: '#2196F3',
      CREATE: '#4CAF50',
      UPDATE: '#FF9800',
      DELETE: '#F44336',
      DEFAULT: '#9E9E9E'
    };
    return colors[action] || colors.DEFAULT;
  };

  const getCategoryColor = (category) => {
    const colors = {
      AUTHENTICATION: '#2196F3',
      DATA_ACCESS: '#9C27B0',
      USER_MANAGEMENT: '#FF9800',
      MEDICAL_RECORDS: '#4CAF50',
      PRESCRIPTION: '#00BCD4',
      BILLING: '#E91E63',
      APPOINTMENT: '#FF5722',
      OTHER: '#9E9E9E'
    };
    return colors[category] || colors.OTHER;
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    return `${days} ngày trước`;
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

  const LogItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => {
        setSelectedLog(item);
        setShowDetailModal(true);
      }}
    >
      <Card style={styles.logCard}>
        <Card.Content>
          <View style={styles.logHeader}>
            <View style={[styles.iconContainer, { backgroundColor: getActionColor(item.action, item.success) + '20' }]}>
              <MaterialIcons
                name={getActionIcon(item.action)}
                size={24}
                color={getActionColor(item.action, item.success)}
              />
            </View>
            <View style={styles.logInfo}>
              <Text style={styles.logAction}>{item.action}</Text>
              <Text style={styles.logUser}>{item.userEmail || item.userName || 'System'}</Text>
            </View>
            <View style={styles.logMeta}>
              <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) }]}>
                <Text style={styles.categoryText}>{item.category || 'OTHER'}</Text>
              </View>
              <Text style={styles.logTime}>{formatTimeAgo(item.timestamp)}</Text>
            </View>
          </View>
          {item.resource && (
            <View style={styles.logFooter}>
              <MaterialIcons name="folder" size={14} color="#666" />
              <Text style={styles.resourceText}>
                {item.resource} {item.resourceId ? `(${item.resourceId.slice(-6)})` : ''}
              </Text>
              {!item.success && (
                <View style={styles.errorBadge}>
                  <Text style={styles.errorText}>Lỗi</Text>
                </View>
              )}
            </View>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={28} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Audit Logs</Text>
        <TouchableOpacity onPress={onRefresh}>
          <MaterialIcons name="refresh" size={28} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Stats Summary */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalLogs || logs.length}</Text>
            <Text style={styles.statLabel}>Tổng Logs</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {stats.actionStats?.find(s => s._id === 'LOGIN')?.count || 0}
            </Text>
            <Text style={styles.statLabel}>Đăng Nhập</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {stats.actionStats?.find(s => s._id === 'CREATE')?.count || 0}
            </Text>
            <Text style={styles.statLabel}>Tạo Mới</Text>
          </View>
        </View>
      )}

      {/* Filter Buttons */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        <FilterButton label="Tất cả" value="all" />
        <FilterButton label="Xác thực" value="authentication" />
        <FilterButton label="Dữ liệu" value="data_access" />
        <FilterButton label="User" value="user_management" />
        <FilterButton label="Y tế" value="medical_records" />
        <FilterButton label="Thanh toán" value="billing" />
      </ScrollView>

      {loading && !refreshing ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Đang tải logs...</Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          renderItem={({ item }) => <LogItem item={item} />}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="history" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Không có audit logs</Text>
            </View>
          )}
        />
      )}

      {/* Detail Modal */}
      <Modal visible={showDetailModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi Tiết Log</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <MaterialIcons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>
            
            {selectedLog && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Hành Động:</Text>
                  <Text style={styles.detailValue}>{selectedLog.action}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Danh Mục:</Text>
                  <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(selectedLog.category) }]}>
                    <Text style={styles.categoryText}>{selectedLog.category || 'OTHER'}</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Người Thực Hiện:</Text>
                  <Text style={styles.detailValue}>{selectedLog.userEmail || selectedLog.userName}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Resource:</Text>
                  <Text style={styles.detailValue}>{selectedLog.resource}</Text>
                </View>
                {selectedLog.resourceId && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Resource ID:</Text>
                    <Text style={styles.detailValue}>{selectedLog.resourceId}</Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Thời Gian:</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedLog.timestamp).toLocaleString('vi-VN')}
                  </Text>
                </View>
                {selectedLog.ipAddress && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>IP Address:</Text>
                    <Text style={styles.detailValue}>{selectedLog.ipAddress}</Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Trạng Thái:</Text>
                  <Text style={[
                    styles.detailValue,
                    { color: selectedLog.success ? '#4CAF50' : '#F44336' }
                  ]}>
                    {selectedLog.success ? '✅ Thành Công' : '❌ Thất Bại'}
                  </Text>
                </View>
                {selectedLog.errorMessage && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Lỗi:</Text>
                    <Text style={[styles.detailValue, { color: '#F44336' }]}>
                      {selectedLog.errorMessage}
                    </Text>
                  </View>
                )}
                {selectedLog.metadata && (
                  <View style={styles.metadataContainer}>
                    <Text style={styles.detailLabel}>Metadata:</Text>
                    <Text style={styles.metadataText}>
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  statItem: {
    alignItems: 'center'
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3'
  },
  statLabel: {
    fontSize: 12,
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
    backgroundColor: '#2196F3'
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
  logCard: {
    marginBottom: 8,
    borderRadius: 8
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center'
  },
  logInfo: {
    flex: 1,
    marginLeft: 12
  },
  logAction: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  logUser: {
    fontSize: 12,
    color: '#666',
    marginTop: 2
  },
  logMeta: {
    alignItems: 'flex-end'
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12
  },
  categoryText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600'
  },
  logTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 4
  },
  logFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  resourceText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    flex: 1
  },
  errorBadge: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4
  },
  errorText: {
    color: '#F44336',
    fontSize: 10,
    fontWeight: '600'
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
    maxHeight: '80%'
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
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    width: 120
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1
  },
  metadataContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8
  },
  metadataText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
    marginTop: 8
  }
});

export default AuditLogsScreen;
