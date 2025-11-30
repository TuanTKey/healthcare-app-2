import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Text,
  ActivityIndicator,
  Dimensions,
  StatusBar
} from 'react-native';
import { useSelector } from 'react-redux';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const AdminDashboard = () => {
  const navigation = useNavigation();
  const { user } = useSelector(state => state.auth);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAppointments: 0,
    totalPatients: 0,
    totalDoctors: 0,
    totalNurses: 0,
    pendingRequests: 0,
    todayAppointments: 0,
    revenue: 0
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      let appointments = [];
      let bills = [];
      let totalAppointmentsCount = 0;
      let userStats = null;
      
      // 📊 Gọi API thống kê users (chính xác từ database)
      try {
        const statsRes = await api.get('/users/stats/overview');
        console.log('📊 User Stats API Response:', JSON.stringify(statsRes.data, null, 2));
        
        if (statsRes.data?.data) {
          userStats = statsRes.data.data;
        }
      } catch (err) {
        console.warn('Could not fetch user stats:', err.message);
        // Fallback: fetch users list if stats API fails
        try {
          const usersRes = await api.get('/users?limit=1000');
          if (usersRes.data?.pagination?.total) {
            userStats = {
              summary: { totalUsers: usersRes.data.pagination.total },
              byRole: []
            };
          }
        } catch (e) {
          console.warn('Fallback users fetch also failed:', e.message);
        }
      }

      try {
        // Get appointments - use stats endpoint or specific params for SUPER_ADMIN
        const appointmentsRes = await api.get('/appointments/stats/overview');
        console.log('📊 Appointments Stats Response:', JSON.stringify(appointmentsRes.data, null, 2));
        
        // Extract total from stats
        if (appointmentsRes.data?.data?.total) {
          totalAppointmentsCount = appointmentsRes.data.data.total;
        } else if (appointmentsRes.data?.data?.totalAppointments) {
          totalAppointmentsCount = appointmentsRes.data.data.totalAppointments;
        }
        
        console.log('📊 Appointments total from stats:', totalAppointmentsCount);
      } catch (err) {
        console.warn('Could not fetch appointments stats, trying list:', err.message);
        // Fallback to list endpoint
        try {
          const appointmentsRes = await api.get('/appointments?status=all');
          if (appointmentsRes.data?.data?.pagination?.total) {
            totalAppointmentsCount = appointmentsRes.data.data.pagination.total;
          } else if (appointmentsRes.data?.pagination?.total) {
            totalAppointmentsCount = appointmentsRes.data.pagination.total;
          } else if (Array.isArray(appointmentsRes.data?.data)) {
            appointments = appointmentsRes.data.data;
            totalAppointmentsCount = appointments.length;
          }
        } catch (e) {
          console.warn('Could not fetch appointments list:', e.message);
        }
      }

      try {
        // Correct billing endpoint is /bills not /billing
        const billsRes = await api.get('/bills');
        console.log('📊 Bills API Response:', JSON.stringify(billsRes.data, null, 2));
        
        if (billsRes.data?.data?.docs) {
          bills = billsRes.data.data.docs;
        } else if (Array.isArray(billsRes.data?.data)) {
          bills = billsRes.data.data;
        } else if (Array.isArray(billsRes.data)) {
          bills = billsRes.data;
        }
      } catch (err) {
        console.warn('Could not fetch bills:', err.message);
      }

      const today = new Date().toDateString();
      const todayAppts = appointments.filter(a => 
        new Date(a.scheduledTime || a.date).toDateString() === today
      ).length;

      const totalRevenue = bills
        .filter(b => b.status === 'PAID')
        .reduce((sum, b) => sum + (b.finalAmount || b.amount || 0), 0);

      // 📊 Parse user stats từ API thống kê
      let totalUsers = 0;
      let patients = 0;
      let doctors = 0;
      let nurses = 0;
      let pending = 0;
      
      if (userStats) {
        // Sử dụng summary nếu có
        if (userStats.summary) {
          totalUsers = userStats.summary.totalUsers || 0;
        }
        
        // Parse byRole array để lấy count theo từng role
        if (userStats.byRole && Array.isArray(userStats.byRole)) {
          for (const roleData of userStats.byRole) {
            if (roleData._id === 'PATIENT') {
              patients = roleData.total || roleData.count || 0;
            } else if (roleData._id === 'DOCTOR') {
              doctors = roleData.total || roleData.count || 0;
            } else if (roleData._id === 'NURSE') {
              nurses = roleData.total || roleData.count || 0;
            }
          }
        }
        
        // Calculate pending if available
        pending = (userStats.summary?.totalUsers || 0) - (userStats.summary?.activeUsers || 0);
      }

      console.log('📊 Final Stats:', {
        totalUsers,
        totalPatients: patients,
        totalDoctors: doctors,
        totalNurses: nurses,
        totalAppointments: totalAppointmentsCount,
        pendingRequests: pending,
        todayAppointments: todayAppts,
        revenue: totalRevenue
      });

      setStats({
        totalUsers,
        totalAppointments: totalAppointmentsCount,
        totalPatients: patients,
        totalDoctors: doctors,
        totalNurses: nurses,
        pendingRequests: pending < 0 ? 0 : pending,
        todayAppointments: todayAppts,
        revenue: totalRevenue
      });
    } catch (error) {
      console.error('Error fetching data:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (amount >= 1000000000) return (amount / 1000000000).toFixed(1) + 'B';
    if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
    if (amount >= 1000) return (amount / 1000).toFixed(0) + 'K';
    return amount.toString();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  const StatCard = ({ icon, title, value, color }) => (
    <TouchableOpacity style={[styles.statCard, { backgroundColor: color }]} activeOpacity={0.8}>
      <View style={styles.statCardContent}>
        <View style={styles.statCardIcon}>
          <MaterialIcons name={icon} size={28} color="rgba(255,255,255,0.9)" />
        </View>
        <Text style={styles.statCardValue}>{value}</Text>
        <Text style={styles.statCardTitle}>{title}</Text>
      </View>
    </TouchableOpacity>
  );

  const QuickAction = ({ icon, title, color, onPress, badge }) => (
    <TouchableOpacity 
      style={styles.quickAction} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: color + '15' }]}>
        <MaterialIcons name={icon} size={26} color={color} />
        {badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.quickActionText}>{title}</Text>
    </TouchableOpacity>
  );

  const MenuSection = ({ title, children }) => (
    <View style={styles.menuSection}>
      <Text style={styles.menuSectionTitle}>{title}</Text>
      <View style={styles.menuGrid}>
        {children}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a237e" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>
              {user?.personalInfo?.firstName || user?.email?.split('@')[0] || 'Admin'}
            </Text>
            <View style={styles.roleBadge}>
              <MaterialIcons name="verified" size={14} color="#fff" />
              <Text style={styles.roleText}>Super Admin</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.headerRight}
            onPress={() => navigation.navigate('Profile')}
          >
            <View style={styles.avatarContainer}>
              <MaterialIcons name="person" size={28} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Today Summary */}
        <View style={styles.todaySummary}>
          <View style={styles.todayItem}>
            <MaterialIcons name="event-available" size={20} color="rgba(255,255,255,0.8)" />
            <Text style={styles.todayValue}>{stats.todayAppointments}</Text>
            <Text style={styles.todayLabel}>Hẹn hôm nay</Text>
          </View>
          <View style={styles.todayDivider} />
          <View style={styles.todayItem}>
            <MaterialIcons name="pending-actions" size={20} color="rgba(255,255,255,0.8)" />
            <Text style={styles.todayValue}>{stats.pendingRequests}</Text>
            <Text style={styles.todayLabel}>Chờ duyệt</Text>
          </View>
          <View style={styles.todayDivider} />
          <View style={styles.todayItem}>
            <MaterialIcons name="account-balance-wallet" size={20} color="rgba(255,255,255,0.8)" />
            <Text style={styles.todayValue}>{formatCurrency(stats.revenue)}₫</Text>
            <Text style={styles.todayLabel}>Doanh thu</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#1a237e']}
            tintColor="#1a237e"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1a237e" />
          </View>
        )}

        {/* Stats Overview */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Tổng Quan Hệ Thống</Text>
          <View style={styles.statsGrid}>
            <StatCard 
              icon="people" 
              title="Tổng Users" 
              value={stats.totalUsers}
              color="#667eea"
            />
            <StatCard 
              icon="person-outline" 
              title="Bệnh Nhân" 
              value={stats.totalPatients}
              color="#11998e"
            />
            <StatCard 
              icon="medical-services" 
              title="Bác Sĩ" 
              value={stats.totalDoctors}
              color="#ee0979"
            />
            <StatCard 
              icon="event" 
              title="Lịch Hẹn" 
              value={stats.totalAppointments}
              color="#4facfe"
            />
          </View>
        </View>

        {/* Quick Actions - User Management */}
        <MenuSection title="Quản Lý Người Dùng">
          <QuickAction 
            icon="people" 
            title="Users" 
            color="#667eea"
            onPress={() => navigation.navigate('UserManagement')}
          />
          <QuickAction 
            icon="person-add" 
            title="Thêm User" 
            color="#11998e"
            onPress={() => navigation.navigate('UserManagement')}
          />
          <QuickAction 
            icon="badge" 
            title="Nhân Viên" 
            color="#ee0979"
            onPress={() => navigation.navigate('UserManagement')}
          />
          <QuickAction 
            icon="verified-user" 
            title="Phê Duyệt" 
            color="#f5576c"
            badge={stats.pendingRequests}
            onPress={() => navigation.navigate('UserManagement')}
          />
        </MenuSection>

        {/* Quick Actions - Medical */}
        <MenuSection title="Quản Lý Y Tế">
          <QuickAction 
            icon="calendar-today" 
            title="Lịch Hẹn" 
            color="#4facfe"
            badge={stats.todayAppointments}
            onPress={() => navigation.navigate('AppointmentManagement')}
          />
          <QuickAction 
            icon="folder-shared" 
            title="Hồ Sơ" 
            color="#43e97b"
            onPress={() => navigation.navigate('PatientMedicalRecords')}
          />
          <QuickAction 
            icon="medication" 
            title="Đơn Thuốc" 
            color="#fa709a"
            onPress={() => navigation.navigate('PatientPrescriptions')}
          />
          <QuickAction 
            icon="biotech" 
            title="Xét Nghiệm" 
            color="#a18cd1"
            onPress={() => navigation.navigate('LabOrdersManagement')}
          />
        </MenuSection>

        {/* Quick Actions - Finance & Reports */}
        <MenuSection title="Tài Chính & Báo Cáo">
          <QuickAction 
            icon="receipt-long" 
            title="Hoá Đơn" 
            color="#f093fb"
            onPress={() => navigation.navigate('PatientBills')}
          />
          <QuickAction 
            icon="trending-up" 
            title="Doanh Thu" 
            color="#4facfe"
            onPress={() => navigation.navigate('RevenueStats')}
          />
          <QuickAction 
            icon="bar-chart" 
            title="Thống Kê" 
            color="#667eea"
            onPress={() => navigation.navigate('SystemStats')}
          />
          <QuickAction 
            icon="summarize" 
            title="Báo Cáo" 
            color="#11998e"
            onPress={() => navigation.navigate('Reports')}
          />
        </MenuSection>

        {/* Quick Actions - System */}
        <MenuSection title="Quản Trị Hệ Thống">
          <QuickAction 
            icon="monitor-heart" 
            title="Sức Khỏe" 
            color="#43e97b"
            onPress={() => navigation.navigate('SystemHealth')}
          />
          <QuickAction 
            icon="history" 
            title="Audit Log" 
            color="#764ba2"
            onPress={() => navigation.navigate('AuditLogs')}
          />
          <QuickAction 
            icon="settings" 
            title="Cấu Hình" 
            color="#546e7a"
            onPress={() => navigation.navigate('AdminSettings')}
          />
          <QuickAction 
            icon="security" 
            title="Bảo Mật" 
            color="#ee0979"
            onPress={() => navigation.navigate('AdminSettings')}
          />
        </MenuSection>

        {/* System Status Card */}
        <View style={styles.systemStatusCard}>
          <View style={styles.systemStatusHeader}>
            <View style={styles.systemStatusIcon}>
              <MaterialIcons name="cloud-done" size={24} color="#43e97b" />
            </View>
            <View style={styles.systemStatusInfo}>
              <Text style={styles.systemStatusTitle}>Hệ Thống Hoạt Động Bình Thường</Text>
              <Text style={styles.systemStatusSubtitle}>
                Cập nhật lần cuối: {new Date().toLocaleTimeString('vi-VN')}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.systemStatusAction}
              onPress={() => navigation.navigate('SystemHealth')}
            >
              <MaterialIcons name="chevron-right" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <View style={styles.systemStatusStats}>
            <View style={styles.systemStat}>
              <Text style={styles.systemStatValue}>v1.0.0</Text>
              <Text style={styles.systemStatLabel}>Version</Text>
            </View>
            <View style={styles.systemStat}>
              <Text style={styles.systemStatValue}>Production</Text>
              <Text style={styles.systemStatLabel}>Environment</Text>
            </View>
            <View style={styles.systemStat}>
              <Text style={[styles.systemStatValue, { color: '#43e97b' }]}>●</Text>
              <Text style={styles.systemStatLabel}>Online</Text>
            </View>
          </View>
        </View>

        {/* Footer Spacing */}
        <View style={styles.footerSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  header: {
    backgroundColor: '#1a237e',
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  headerLeft: {
    flex: 1
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '400'
  },
  userName: {
    fontSize: 26,
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 4
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 8
  },
  roleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4
  },
  headerRight: {
    alignItems: 'center'
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  todaySummary: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
    marginTop: 20
  },
  todayItem: {
    flex: 1,
    alignItems: 'center'
  },
  todayValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 6
  },
  todayLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2
  },
  todayDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 8
  },
  content: {
    flex: 1,
    marginTop: -20
  },
  scrollContent: {
    paddingTop: 30,
    paddingHorizontal: 16
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center'
  },
  statsSection: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a237e',
    marginBottom: 16
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  statCard: {
    width: CARD_WIDTH,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8
  },
  statCardContent: {
    padding: 16,
    minHeight: 120
  },
  statCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  statCardValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff'
  },
  statCardTitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    fontWeight: '500'
  },
  menuSection: {
    marginBottom: 24
  },
  menuSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4
  },
  quickAction: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 16
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  quickActionText: {
    fontSize: 11,
    color: '#333',
    fontWeight: '500',
    textAlign: 'center'
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#f5576c',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold'
  },
  systemStatusCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f5f7fa',
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4
  },
  systemStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  systemStatusIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  systemStatusInfo: {
    flex: 1,
    marginLeft: 12
  },
  systemStatusTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  systemStatusSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2
  },
  systemStatusAction: {
    padding: 4
  },
  systemStatusStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)'
  },
  systemStat: {
    alignItems: 'center'
  },
  systemStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  systemStatLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2
  },
  footerSpacing: {
    height: 30
  }
});

export default AdminDashboard;
