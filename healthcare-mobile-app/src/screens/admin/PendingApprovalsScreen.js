import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import api from '../../services/api';

const ROLE_CONFIG = {
  PATIENT: { label: 'Bệnh nhân', icon: 'person', color: '#4caf50' },
  DOCTOR: { label: 'Bác sĩ', icon: 'medical-services', color: '#2196f3' },
  NURSE: { label: 'Y tá', icon: 'healing', color: '#9c27b0' },
  RECEPTIONIST: { label: 'Lễ tân', icon: 'support-agent', color: '#ff9800' },
  PHARMACIST: { label: 'Dược sĩ', icon: 'medication', color: '#00bcd4' },
  LAB_TECHNICIAN: { label: 'KTV Xét nghiệm', icon: 'biotech', color: '#795548' },
  BILLING_STAFF: { label: 'NV Kế toán', icon: 'receipt', color: '#607d8b' },
  DEPARTMENT_HEAD: { label: 'Trưởng khoa', icon: 'admin-panel-settings', color: '#e91e63' },
  HOSPITAL_ADMIN: { label: 'Quản trị BV', icon: 'business', color: '#673ab7' }
};

const PendingApprovalsScreen = () => {
  const navigation = useNavigation();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      // Fetch users with status INACTIVE or PENDING
      const response = await api.get('/users?limit=1000');
      
      let users = [];
      if (response.data?.data?.users) {
        users = response.data.data.users;
      } else if (Array.isArray(response.data?.data)) {
        users = response.data.data;
      }

      // Filter pending/inactive users that need approval
      const pending = users.filter(u => 
        (u.status === 'INACTIVE' || u.status === 'PENDING' || !u.isEmailVerified) &&
        !u.isDeleted
      );

      setPendingUsers(pending);
    } catch (error) {
      console.error('Error fetching pending users:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách chờ duyệt');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPendingUsers();
    setRefreshing(false);
  };

  const handleApprove = async (userId) => {
    Alert.alert(
      'Xác nhận phê duyệt',
      'Bạn có chắc muốn phê duyệt tài khoản này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Phê duyệt',
          onPress: async () => {
            try {
              setActionLoading(userId);
              await api.put(`/users/${userId}`, { 
                status: 'ACTIVE',
                isEmailVerified: true 
              });
              Alert.alert('Thành công', 'Đã phê duyệt tài khoản');
              fetchPendingUsers();
            } catch (error) {
              console.error('Approve error:', error);
              Alert.alert('Lỗi', 'Không thể phê duyệt tài khoản');
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  };

  const handleReject = async (userId) => {
    Alert.alert(
      'Xác nhận từ chối',
      'Bạn có chắc muốn từ chối tài khoản này? Tài khoản sẽ bị xóa.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Từ chối',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(userId);
              await api.delete(`/users/${userId}`);
              Alert.alert('Thành công', 'Đã từ chối và xóa tài khoản');
              fetchPendingUsers();
            } catch (error) {
              console.error('Reject error:', error);
              Alert.alert('Lỗi', 'Không thể từ chối tài khoản');
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  };

  const PendingCard = ({ item }) => {
    const roleConfig = ROLE_CONFIG[item.role] || { label: item.role, icon: 'person', color: '#666' };
    const fullName = item.personalInfo?.firstName && item.personalInfo?.lastName
      ? `${item.personalInfo.lastName} ${item.personalInfo.firstName}`
      : item.email?.split('@')[0];
    const createdDate = item.createdAt ? format(new Date(item.createdAt), 'dd/MM/yyyy HH:mm') : 'N/A';
    const isLoading = actionLoading === item._id;

    return (
      <View style={styles.pendingCard}>
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: roleConfig.color + '20' }]}>
            <MaterialIcons name={roleConfig.icon} size={28} color={roleConfig.color} />
          </View>
          
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{fullName}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
            <View style={styles.metaRow}>
              <View style={[styles.roleBadge, { backgroundColor: roleConfig.color + '15' }]}>
                <Text style={[styles.roleBadgeText, { color: roleConfig.color }]}>
                  {roleConfig.label}
                </Text>
              </View>
              <Text style={styles.dateText}>Đăng ký: {createdDate}</Text>
            </View>
          </View>
        </View>

        {/* Status Info */}
        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            <MaterialIcons 
              name={item.status === 'ACTIVE' ? 'check-circle' : 'pending'} 
              size={18} 
              color={item.status === 'ACTIVE' ? '#4caf50' : '#ff9800'} 
            />
            <Text style={styles.statusLabel}>
              Trạng thái: {item.status === 'ACTIVE' ? 'Hoạt động' : 'Chờ kích hoạt'}
            </Text>
          </View>
          <View style={styles.statusItem}>
            <MaterialIcons 
              name={item.isEmailVerified ? 'verified' : 'error-outline'} 
              size={18} 
              color={item.isEmailVerified ? '#4caf50' : '#f44336'} 
            />
            <Text style={styles.statusLabel}>
              Email: {item.isEmailVerified ? 'Đã xác thực' : 'Chưa xác thực'}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.rejectButton, isLoading && styles.buttonDisabled]}
            onPress={() => handleReject(item._id)}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#f44336" />
            ) : (
              <>
                <MaterialIcons name="close" size={18} color="#f44336" />
                <Text style={styles.rejectButtonText}>Từ chối</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.approveButton, isLoading && styles.buttonDisabled]}
            onPress={() => handleApprove(item._id)}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="check" size={18} color="#fff" />
                <Text style={styles.approveButtonText}>Phê duyệt</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Phê Duyệt Tài Khoản</Text>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{pendingUsers.length}</Text>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1a237e" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {pendingUsers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="verified-user" size={80} color="#4caf50" />
              <Text style={styles.emptyTitle}>Không có yêu cầu nào</Text>
              <Text style={styles.emptyText}>
                Tất cả tài khoản đã được phê duyệt
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>
                {pendingUsers.length} tài khoản chờ phê duyệt
              </Text>
              {pendingUsers.map(item => (
                <PendingCard key={item._id} item={item} />
              ))}
            </>
          )}
          <View style={styles.bottomSpacing} />
        </ScrollView>
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
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  backButton: {
    padding: 8
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8
  },
  headerBadge: {
    backgroundColor: '#f44336',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  headerBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600'
  },
  content: {
    flex: 1,
    padding: 16
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    color: '#666'
  },
  sectionTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16
  },
  pendingCard: {
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
    alignItems: 'center'
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14
  },
  userInfo: {
    flex: 1
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  userEmail: {
    fontSize: 13,
    color: '#666',
    marginTop: 2
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 10
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '500'
  },
  dateText: {
    fontSize: 11,
    color: '#999'
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 16
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f44336',
    marginRight: 8
  },
  rejectButtonText: {
    color: '#f44336',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#4caf50',
    marginLeft: 8
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6
  },
  buttonDisabled: {
    opacity: 0.6
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 80
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 20
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8
  },
  bottomSpacing: {
    height: 30
  }
});

export default PendingApprovalsScreen;
