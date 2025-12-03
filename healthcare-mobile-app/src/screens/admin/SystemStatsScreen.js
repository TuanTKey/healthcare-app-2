import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Text,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../services/api';
import Card from '../../components/common/Card';

const { width } = Dimensions.get('window');

const SystemStatsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    users: { total: 0, byRole: {} },
    appointments: { total: 0, byStatus: {} },
    bills: { total: 0, totalRevenue: 0, byStatus: {} },
    labOrders: { total: 0, pending: 0, completed: 0 }
  });

  useEffect(() => {
    fetchAllStats();
  }, []);

  const fetchAllStats = async () => {
    try {
      setLoading(true);
      
      // Fetch users stats
      let usersData = { total: 0, byRole: {} };
      try {
        const usersRes = await api.get('/users?limit=1000');
        const users = usersRes.data?.data || [];
        usersData.total = users.length;
        usersData.byRole = users.reduce((acc, user) => {
          acc[user.role] = (acc[user.role] || 0) + 1;
          return acc;
        }, {});
        usersData.active = users.filter(u => u.status === 'ACTIVE' || u.isActive).length;
        usersData.inactive = users.filter(u => u.status !== 'ACTIVE' && !u.isActive).length;
      } catch (err) {
        console.warn('Could not fetch users stats');
      }

      // Fetch appointments stats
      let appointmentsData = { total: 0, byStatus: {} };
      try {
        const appointmentsRes = await api.get('/appointments?page=1&limit=1000');
        // Extract appointments array from response
        let appointments = [];
        if (Array.isArray(appointmentsRes.data?.data?.data)) {
          appointments = appointmentsRes.data.data.data;
        } else if (Array.isArray(appointmentsRes.data?.data?.appointments)) {
          appointments = appointmentsRes.data.data.appointments;
        } else if (Array.isArray(appointmentsRes.data?.data)) {
          appointments = appointmentsRes.data.data;
        }
        
        // Get total from pagination or array length
        if (appointmentsRes.data?.data?.pagination?.total) {
          appointmentsData.total = appointmentsRes.data.data.pagination.total;
        } else {
          appointmentsData.total = appointments.length;
        }
        
        appointmentsData.byStatus = appointments.reduce((acc, apt) => {
          acc[apt.status] = (acc[apt.status] || 0) + 1;
          return acc;
        }, {});
        
        // Use appointmentDate (correct field from schema)
        appointmentsData.today = appointments.filter(apt => {
          const today = new Date().toDateString();
          return new Date(apt.appointmentDate || apt.scheduledTime || apt.date).toDateString() === today;
        }).length;
      } catch (err) {
        console.warn('Could not fetch appointments stats');
      }

      // Fetch bills stats
      let billsData = { total: 0, totalRevenue: 0, byStatus: {} };
      try {
        const billsRes = await api.get('/bills?page=1&limit=1000');
        
        console.log('📊 Bills API Response:', JSON.stringify(billsRes.data, null, 2));
        
        // Extract bills from response - structure is { success, data: { data: [], pagination: {} } }
        let bills = [];
        if (Array.isArray(billsRes.data?.data?.data)) {
          bills = billsRes.data.data.data;
        } else if (Array.isArray(billsRes.data?.data?.docs)) {
          bills = billsRes.data.data.docs;
        } else if (Array.isArray(billsRes.data?.data)) {
          bills = billsRes.data.data;
        }
        
        console.log('📊 Extracted bills:', bills.length, 'items');
        
        billsData.total = bills.length;
        // Use grandTotal (correct field from bill schema)
        billsData.totalRevenue = bills
          .filter(b => b.status === 'PAID')
          .reduce((sum, bill) => sum + (bill.grandTotal || bill.totalAmount || 0), 0);
        billsData.byStatus = bills.reduce((acc, bill) => {
          acc[bill.status] = (acc[bill.status] || 0) + 1;
          return acc;
        }, {});
        billsData.paid = bills.filter(b => b.status === 'PAID').length;
        // Use correct status names: ISSUED, PARTIAL instead of PENDING
        billsData.pending = bills.filter(b => b.status === 'ISSUED' || b.status === 'PARTIAL' || b.status === 'DRAFT').length;
        
        console.log('📊 Bills stats - total:', billsData.total, 'revenue:', billsData.totalRevenue);
      } catch (err) {
        console.warn('Could not fetch bills stats:', err.message);
      }

      // Fetch lab orders stats
      let labOrdersData = { total: 0, pending: 0, completed: 0 };
      try {
        const labRes = await api.get('/laboratory/pending');
        labOrdersData.pending = labRes.data?.data?.totalDocs || 0;
      } catch (err) {
        console.warn('Could not fetch lab orders stats');
      }

      setStats({
        users: usersData,
        appointments: appointmentsData,
        bills: billsData,
        labOrders: labOrdersData
      });
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tải thống kê: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllStats();
    setRefreshing(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const StatBox = ({ icon, title, value, color, subtitle }) => (
    <View style={[styles.statBox, { borderLeftColor: color }]}>
      <MaterialIcons name={icon} size={28} color={color} />
      <View style={styles.statBoxContent}>
        <Text style={styles.statBoxValue}>{value}</Text>
        <Text style={styles.statBoxTitle}>{title}</Text>
        {subtitle && <Text style={styles.statBoxSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );

  const RoleBreakdown = ({ data }) => {
    const roles = Object.entries(data).map(([role, count]) => ({ role, count }));
    const colors = {
      PATIENT: '#4CAF50',
      DOCTOR: '#2196F3',
      NURSE: '#FF9800',
      RECEPTIONIST: '#00BCD4',
      ADMIN: '#9C27B0',
      HOSPITAL_ADMIN: '#E91E63',
      SUPER_ADMIN: '#F44336',
      DEPARTMENT_HEAD: '#795548'
    };

    return (
      <View style={styles.breakdownContainer}>
        {roles.map(({ role, count }) => (
          <View key={role} style={styles.breakdownItem}>
            <View style={[styles.breakdownDot, { backgroundColor: colors[role] || '#999' }]} />
            <Text style={styles.breakdownLabel}>{role}</Text>
            <Text style={styles.breakdownCount}>{count}</Text>
          </View>
        ))}
      </View>
    );
  };

  const StatusBreakdown = ({ data, colors }) => {
    const statuses = Object.entries(data).map(([status, count]) => ({ status, count }));

    return (
      <View style={styles.breakdownContainer}>
        {statuses.map(({ status, count }) => (
          <View key={status} style={styles.breakdownItem}>
            <View style={[styles.breakdownDot, { backgroundColor: colors[status] || '#999' }]} />
            <Text style={styles.breakdownLabel}>{status}</Text>
            <Text style={styles.breakdownCount}>{count}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={28} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Thống Kê Hệ Thống</Text>
        <TouchableOpacity onPress={onRefresh}>
          <MaterialIcons name="refresh" size={28} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Đang tải thống kê...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Quick Stats Row */}
          <View style={styles.quickStatsRow}>
            <StatBox 
              icon="people" 
              title="Tổng Users" 
              value={stats.users.total}
              color="#2196F3"
            />
            <StatBox 
              icon="event" 
              title="Lịch Hẹn" 
              value={stats.appointments.total}
              color="#FF9800"
              subtitle={`Hôm nay: ${stats.appointments.today || 0}`}
            />
          </View>
          <View style={styles.quickStatsRow}>
            <StatBox 
              icon="receipt" 
              title="Hoá Đơn" 
              value={stats.bills.total}
              color="#4CAF50"
              subtitle={`Đã TT: ${stats.bills.paid || 0}`}
            />
            <StatBox 
              icon="science" 
              title="XN Chờ" 
              value={stats.labOrders.pending}
              color="#9C27B0"
            />
          </View>

          {/* Revenue Card */}
          <Card style={styles.revenueCard}>
            <Card.Content>
              <View style={styles.revenueHeader}>
                <MaterialIcons name="attach-money" size={32} color="#4CAF50" />
                <View style={styles.revenueInfo}>
                  <Text style={styles.revenueLabel}>Tổng Doanh Thu</Text>
                  <Text style={styles.revenueAmount}>
                    {formatCurrency(stats.bills.totalRevenue)}
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>

          {/* Users Breakdown */}
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>
                <MaterialIcons name="people" size={20} color="#2196F3" /> Phân Loại Users
              </Text>
              <RoleBreakdown data={stats.users.byRole} />
              <View style={styles.userStatusRow}>
                <View style={styles.statusItem}>
                  <MaterialIcons name="check-circle" size={18} color="#4CAF50" />
                  <Text style={styles.statusText}>Hoạt động: {stats.users.active || 0}</Text>
                </View>
                <View style={styles.statusItem}>
                  <MaterialIcons name="cancel" size={18} color="#F44336" />
                  <Text style={styles.statusText}>Không hoạt động: {stats.users.inactive || 0}</Text>
                </View>
              </View>
            </Card.Content>
          </Card>

          {/* Appointments Breakdown */}
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>
                <MaterialIcons name="event" size={20} color="#FF9800" /> Trạng Thái Lịch Hẹn
              </Text>
              <StatusBreakdown 
                data={stats.appointments.byStatus}
                colors={{
                  SCHEDULED: '#2196F3',
                  CONFIRMED: '#4CAF50',
                  COMPLETED: '#9C27B0',
                  CANCELLED: '#F44336',
                  PENDING: '#FF9800',
                  NO_SHOW: '#795548'
                }}
              />
            </Card.Content>
          </Card>

          {/* Bills Breakdown */}
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>
                <MaterialIcons name="receipt" size={20} color="#4CAF50" /> Trạng Thái Hoá Đơn
              </Text>
              <StatusBreakdown 
                data={stats.bills.byStatus}
                colors={{
                  PAID: '#4CAF50',
                  ISSUED: '#FF9800',
                  PARTIAL: '#2196F3',
                  DRAFT: '#9E9E9E',
                  OVERDUE: '#E91E63',
                  WRITTEN_OFF: '#795548'
                }}
              />
              <View style={styles.billsSummary}>
                <Text style={styles.summaryText}>
                  Chờ thanh toán: <Text style={styles.summaryValue}>{stats.bills.pending || 0}</Text>
                </Text>
                <Text style={styles.summaryText}>
                  Đã thanh toán: <Text style={styles.summaryValue}>{stats.bills.paid || 0}</Text>
                </Text>
              </View>
            </Card.Content>
          </Card>

          {/* Quick Actions */}
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>
                <MaterialIcons name="flash-on" size={20} color="#FF5722" /> Thao Tác Nhanh
              </Text>
              <View style={styles.quickActionsGrid}>
                <TouchableOpacity 
                  style={[styles.quickActionBtn, { backgroundColor: '#2196F3' }]}
                  onPress={() => navigation.navigate('UserManagement')}
                >
                  <MaterialIcons name="person-add" size={24} color="#fff" />
                  <Text style={styles.quickActionText}>Quản Lý Users</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.quickActionBtn, { backgroundColor: '#FF9800' }]}
                  onPress={() => navigation.navigate('AppointmentManagement')}
                >
                  <MaterialIcons name="event-note" size={24} color="#fff" />
                  <Text style={styles.quickActionText}>Quản Lý Hẹn</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.quickActionBtn, { backgroundColor: '#4CAF50' }]}
                  onPress={() => navigation.navigate('RevenueStats')}
                >
                  <MaterialIcons name="trending-up" size={24} color="#fff" />
                  <Text style={styles.quickActionText}>Doanh Thu</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.quickActionBtn, { backgroundColor: '#9C27B0' }]}
                  onPress={() => navigation.navigate('AuditLogs')}
                >
                  <MaterialIcons name="history" size={24} color="#fff" />
                  <Text style={styles.quickActionText}>Audit Logs</Text>
                </TouchableOpacity>
              </View>
            </Card.Content>
          </Card>

          {/* Last Updated */}
          <Text style={styles.lastUpdated}>
            Cập nhật lần cuối: {new Date().toLocaleString('vi-VN')}
          </Text>
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 14
  },
  scrollContent: {
    padding: 16
  },
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  statBoxContent: {
    marginLeft: 12,
    flex: 1
  },
  statBoxValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333'
  },
  statBoxTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2
  },
  statBoxSubtitle: {
    fontSize: 10,
    color: '#999',
    marginTop: 2
  },
  revenueCard: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#E8F5E9'
  },
  revenueHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  revenueInfo: {
    marginLeft: 16
  },
  revenueLabel: {
    fontSize: 14,
    color: '#666'
  },
  revenueAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32'
  },
  sectionCard: {
    marginBottom: 16,
    borderRadius: 12
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12
  },
  breakdownContainer: {
    marginTop: 8
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  breakdownDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8
  },
  breakdownLabel: {
    flex: 1,
    fontSize: 14,
    color: '#666'
  },
  breakdownCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  userStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statusText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#666'
  },
  billsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },
  summaryText: {
    fontSize: 13,
    color: '#666'
  },
  summaryValue: {
    fontWeight: 'bold',
    color: '#333'
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  quickActionBtn: {
    width: '48%',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8
  },
  quickActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center'
  },
  lastUpdated: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    marginTop: 8,
    marginBottom: 20
  }
});

export default SystemStatsScreen;
