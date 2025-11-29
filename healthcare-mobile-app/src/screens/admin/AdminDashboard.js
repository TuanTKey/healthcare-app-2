import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Text,
  ActivityIndicator
} from 'react-native';
import { useSelector } from 'react-redux';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import Card from '../../components/common/Card';

const AdminDashboard = () => {
  const navigation = useNavigation();
  const { user } = useSelector(state => state.auth);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAppointments: 0,
    totalPatients: 0,
    totalDoctors: 0,
    pendingRequests: 0
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [recentUsers, setRecentUsers] = useState([]);

  useEffect(() => {
    fetchStats();
    fetchRecentUsers();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), fetchRecentUsers()]);
    setRefreshing(false);
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Try để lấy users, nếu fail thì skip
      let users = [];
      let appointments = [];
      
      try {
        const usersRes = await api.get('/users');
        console.log('📊 Users response:', usersRes.data);
        // Parse users - handle different response formats
        if (usersRes.data?.data?.data && Array.isArray(usersRes.data.data.data)) {
          users = usersRes.data.data.data;
        } else if (Array.isArray(usersRes.data.data)) {
          users = usersRes.data.data;
        } else if (Array.isArray(usersRes.data)) {
          users = usersRes.data;
        }
      } catch (err) {
        console.warn('⚠️ Không thể lấy danh sách users (permission denied)');
      }

      try {
        const appointmentsRes = await api.get('/appointments');
        console.log('📊 Appointments response:', appointmentsRes.data);
        // Parse appointments - handle different response formats
        if (appointmentsRes.data?.data?.data && Array.isArray(appointmentsRes.data.data.data)) {
          appointments = appointmentsRes.data.data.data;
        } else if (appointmentsRes.data?.data?.appointments && Array.isArray(appointmentsRes.data.data.appointments)) {
          appointments = appointmentsRes.data.data.appointments;
        } else if (Array.isArray(appointmentsRes.data.data)) {
          appointments = appointmentsRes.data.data;
        } else if (Array.isArray(appointmentsRes.data)) {
          appointments = appointmentsRes.data;
        }
      } catch (err) {
        console.warn('⚠️ Không thể lấy danh sách appointments');
      }

      const patients = users.filter(u => u.role === 'PATIENT').length;
      const doctors = users.filter(u => u.role === 'DOCTOR').length;
      const pending = users.filter(u => u.status !== 'ACTIVE').length;

      setStats({
        totalUsers: users.length,
        totalAppointments: appointments.length,
        totalPatients: patients,
        totalDoctors: doctors,
        pendingRequests: pending
      });

      console.log('📊 Stats updated:', {
        totalUsers: users.length,
        totalPatients: patients,
        totalDoctors: doctors,
        totalAppointments: appointments.length
      });
    } catch (error) {
      console.error('Lỗi lấy thống kê:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentUsers = async () => {
    try {
      try {
        const response = await api.get('/users?limit=5');
        if (response.data.data) {
          setRecentUsers(response.data.data.slice(0, 5));
        }
      } catch (err) {
        console.warn('⚠️ Không thể lấy danh sách users (permission denied)');
        setRecentUsers([]);
      }
    } catch (error) {
      console.error('Lỗi lấy danh sách user:', error.message);
    }
  };

  const StatCard = ({ icon, title, value, color }) => (
    <Card style={[styles.statCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
      <Card.Content>
        <View style={styles.statHeader}>
          <MaterialIcons name={icon} size={32} color={color} />
          <View style={styles.statInfo}>
            <Text style={styles.statTitle}>{title}</Text>
            <Text style={styles.statValue}>{value}</Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const UserCard = ({ item }) => (
    <Card style={styles.userCard}>
      <Card.Content>
        <View style={styles.userHeader}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {item.personalInfo?.firstName} {item.personalInfo?.lastName}
            </Text>
            <Text style={styles.userEmail}>{item.email}</Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) }]}>
            <Text style={styles.roleText}>{item.role}</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.userFooter}>
          <Text style={styles.smallText}>
            Trạng thái: {item.status === 'ACTIVE' ? '✅ Hoạt động' : '⏳ Chờ phê duyệt'}
          </Text>
          <Text style={styles.smallText}>
            Ngày tạo: {new Date(item.createdAt).toLocaleDateString('vi-VN')}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );

  const getRoleColor = (role) => {
    const colors = {
      PATIENT: '#4CAF50',
      DOCTOR: '#2196F3',
      NURSE: '#FF9800',
      ADMIN: '#F44336',
      SUPER_ADMIN: '#1565C0',
      HOSPITAL_ADMIN: '#9C27B0',
      RECEPTIONIST: '#00BCD4'
    };
    return colors[role] || '#999';
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Admin Dashboard</Text>
          <Text style={styles.subtitle}>
            Xin chào, {user?.personalInfo?.firstName || user?.email}
          </Text>
        </View>

        {loading && <ActivityIndicator size="large" color="#1976d2" />}

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <StatCard 
            icon="people" 
            title="Tổng Users" 
            value={stats.totalUsers}
            color="#2196F3"
          />
          <StatCard 
            icon="person" 
            title="Bệnh Nhân" 
            value={stats.totalPatients}
            color="#4CAF50"
          />
          <StatCard 
            icon="medical-services" 
            title="Bác Sĩ" 
            value={stats.totalDoctors}
            color="#00BCD4"
          />
          <StatCard 
            icon="event" 
            title="Lịch Hẹn" 
            value={stats.totalAppointments}
            color="#FF9800"
          />
          <StatCard 
            icon="hourglass-empty" 
            title="Chờ Duyệt" 
            value={stats.pendingRequests}
            color="#F44336"
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Thao Tác Nhanh</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
              onPress={() => navigation.navigate('UserManagement')}
            >
              <MaterialIcons name="person-add" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Thêm User</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#FF9800' }]}
              onPress={() => navigation.navigate('AppointmentList')}
            >
              <MaterialIcons name="event-note" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Lịch Hẹn</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
              onPress={() => navigation.navigate('PatientMedicalRecords')}
            >
              <MaterialIcons name="folder" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Hồ Sơ</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
              onPress={() => navigation.navigate('PatientPrescriptions')}
            >
              <MaterialIcons name="local-pharmacy" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Đơn Thuốc</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#FF5722' }]}
              onPress={() => navigation.navigate('PatientBills')}
            >
              <MaterialIcons name="receipt" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Hoá Đơn</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
              onPress={() => navigation.navigate('Reports')}
            >
              <MaterialIcons name="assessment" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Báo Cáo</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#9C27B0' }]}
              onPress={() => navigation.navigate('AdminSettings')}
            >
              <MaterialIcons name="settings" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Cấu Hình</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Users */}
        <View style={styles.recentUsers}>
          <Text style={styles.sectionTitle}>Users Gần Đây</Text>
          {recentUsers.length > 0 ? (
            <FlatList
              data={recentUsers}
              renderItem={({ item }) => <UserCard item={item} />}
              keyExtractor={(item) => item._id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          ) : (
            <Text style={styles.emptyText}>Không có users nào</Text>
          )}
        </View>

        {/* System Info */}
        <Card style={styles.systemInfo}>
          <Text style={styles.infoTitle}>Thông Tin Hệ Thống</Text>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version:</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Environment:</Text>
            <Text style={styles.infoValue}>Production</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Sync:</Text>
            <Text style={styles.infoValue}>{new Date().toLocaleString('vi-VN')}</Text>
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statsContainer: {
    marginBottom: 24,
  },
  statCard: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  statContent: {
    padding: 12,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statInfo: {
    marginLeft: 12,
    flex: 1,
  },
  statTitle: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  quickActions: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    width: '48%',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#fff',
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  recentUsers: {
    marginBottom: 24,
  },
  userCard: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 12,
    color: '#666',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  roleText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 8,
  },
  userFooter: {
    marginTop: 8,
  },
  smallText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  separator: {
    height: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    marginTop: 20,
  },
  systemInfo: {
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
  },
});

export default AdminDashboard;
