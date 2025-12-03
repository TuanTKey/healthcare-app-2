import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import Card from '../../components/common/Card';
import api from '../../services/api';

const DashboardScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const [refreshing, setRefreshing] = React.useState(false);
  const [stats, setStats] = useState([
    { icon: 'event', label: 'Lịch hẹn', value: '0', color: '#4CAF50', screen: 'Appointments', params: { tab: 'pending' } },
    { icon: 'local-pharmacy', label: 'Đơn thuốc', value: '0', color: '#2196F3', screen: 'Prescriptions', params: {} },
    { icon: 'receipt', label: 'Hóa đơn', value: '0', color: '#FF9800', screen: 'Billing', params: {} },
    { icon: 'check-circle', label: 'Đã khám', value: '0', color: '#9C27B0', screen: 'Appointments', params: { tab: 'completed' } },
  ]);
  const [recentActivities, setRecentActivities] = useState([]);

  const quickActions = [
    { 
      title: 'Đặt lịch hẹn', 
      icon: 'add', 
      onPress: () => navigation.navigate('Appointments'),
      color: '#4CAF50'
    },
    { 
      title: 'Xem hồ sơ', 
      icon: 'folder-open', 
      onPress: () => navigation.navigate('Records'),
      color: '#2196F3'
    },
    { 
      title: 'Hồ sơ cá nhân', 
      icon: 'person', 
      onPress: () => navigation.navigate('PatientProfile'),
      color: '#FF5722'
    },
  ];

  // Fetch dashboard stats on mount and refresh
  useEffect(() => {
    fetchStats();
  }, [user?._id]);

  const fetchStats = async () => {
    try {
      if (!user?._id) return;

      console.log('📊 Fetching dashboard stats for user:', user._id);

      let appointmentCount = 0;
      let completedAppointmentCount = 0;
      let prescriptionCount = 0;
      let billCount = 0;
      let activities = [];

      // Fetch appointments - only pending (not COMPLETED or CANCELLED)
      try {
        const appointmentsRes = await api.get(`/appointments/patient/${user._id}`);
        console.log('📊 Appointments response:', appointmentsRes.data);
        
        let allAppointments = [];
        if (appointmentsRes.data?.data?.data && Array.isArray(appointmentsRes.data.data.data)) {
          allAppointments = appointmentsRes.data.data.data;
        } else if (appointmentsRes.data?.data?.appointments && Array.isArray(appointmentsRes.data.data.appointments)) {
          allAppointments = appointmentsRes.data.data.appointments;
        } else if (appointmentsRes.data?.data && Array.isArray(appointmentsRes.data.data)) {
          allAppointments = appointmentsRes.data.data;
        }
        
        // Filter out completed and cancelled appointments for pending count
        const pendingAppointments = allAppointments.filter(apt => 
          apt.status !== 'COMPLETED' && apt.status !== 'CANCELLED'
        );
        appointmentCount = pendingAppointments.length;
        
        // Count completed appointments
        const completedAppointments = allAppointments.filter(apt => apt.status === 'COMPLETED');
        completedAppointmentCount = completedAppointments.length;
        
        console.log('📅 Pending appointments:', appointmentCount);
        console.log('✅ Completed appointments:', completedAppointmentCount);

        // Add appointments to activities
        allAppointments.slice(0, 3).forEach(apt => {
          const doctorName = apt.doctorId?.personalInfo 
            ? `BS. ${apt.doctorId.personalInfo.lastName} ${apt.doctorId.personalInfo.firstName}`
            : 'Bác sĩ';
          activities.push({
            type: 'appointment',
            icon: 'event',
            color: apt.status === 'COMPLETED' ? '#9C27B0' : '#4CAF50',
            title: `Lịch hẹn với ${doctorName}`,
            subtitle: apt.reason || 'Khám bệnh',
            time: apt.appointmentDate,
            status: apt.status
          });
        });
      } catch (err) {
        console.warn('⚠️ Failed to fetch appointments:', err.message);
      }

      // Fetch prescriptions
      try {
        const prescriptionsRes = await api.get(`/prescriptions/patients/${user._id}/prescriptions`);
        console.log('💊 Prescriptions response:', prescriptionsRes.data);
        
        let prescriptions = [];
        if (prescriptionsRes.data?.data?.prescriptions && Array.isArray(prescriptionsRes.data.data.prescriptions)) {
          prescriptions = prescriptionsRes.data.data.prescriptions;
          prescriptionCount = prescriptions.length;
        } else if (prescriptionsRes.data?.data?.pagination?.total) {
          prescriptionCount = prescriptionsRes.data.data.pagination.total;
        } else if (prescriptionsRes.data?.data && Array.isArray(prescriptionsRes.data.data)) {
          prescriptions = prescriptionsRes.data.data;
          prescriptionCount = prescriptions.length;
        }
        console.log('💊 Prescriptions count:', prescriptionCount);

        // Add prescriptions to activities
        prescriptions.slice(0, 2).forEach(rx => {
          const doctorName = rx.doctorId?.personalInfo 
            ? `BS. ${rx.doctorId.personalInfo.lastName} ${rx.doctorId.personalInfo.firstName}`
            : 'Bác sĩ';
          activities.push({
            type: 'prescription',
            icon: 'local-pharmacy',
            color: '#2196F3',
            title: `Đơn thuốc từ ${doctorName}`,
            subtitle: `${rx.medications?.length || 0} loại thuốc`,
            time: rx.createdAt || rx.issueDate,
            status: rx.status
          });
        });
      } catch (err) {
        console.warn('⚠️ Failed to fetch prescriptions:', err.message);
      }

      // Fetch bills
      try {
        const billsRes = await api.get(`/bills/patients/${user._id}/bills`);
        console.log('💰 Bills response:', billsRes.data);
        
        let bills = [];
        if (billsRes.data?.data?.docs && Array.isArray(billsRes.data.data.docs)) {
          bills = billsRes.data.data.docs;
          billCount = bills.length;
        } else if (billsRes.data?.data?.totalDocs) {
          billCount = billsRes.data.data.totalDocs;
        } else if (billsRes.data?.data && Array.isArray(billsRes.data.data)) {
          bills = billsRes.data.data;
          billCount = bills.length;
        }
        console.log('💰 Bills count:', billCount);

        // Add bills to activities
        bills.slice(0, 2).forEach(bill => {
          const amount = bill.grandTotal || bill.totalAmount || 0;
          activities.push({
            type: 'bill',
            icon: 'receipt',
            color: bill.status === 'PAID' ? '#4CAF50' : '#FF9800',
            title: `Hóa đơn ${bill.billNumber || bill.billId}`,
            subtitle: `${amount.toLocaleString('vi-VN')}đ - ${bill.status === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}`,
            time: bill.createdAt || bill.issueDate,
            status: bill.status
          });
        });
      } catch (err) {
        console.warn('⚠️ Failed to fetch bills:', err.message);
      }

      // Sort activities by time (newest first)
      activities.sort((a, b) => new Date(b.time) - new Date(a.time));
      setRecentActivities(activities.slice(0, 5));

      // Update stats
      setStats(prevStats => [
        { ...prevStats[0], value: appointmentCount.toString() },
        { ...prevStats[1], value: prescriptionCount.toString() },
        { ...prevStats[2], value: billCount.toString() },
        { ...prevStats[3], value: completedAppointmentCount.toString() },
      ]);
    } catch (error) {
      console.error('Lỗi lấy thống kê:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Welcome Section */}
      <Card style={styles.welcomeCard}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.welcomeText}>
            Xin chào, {user?.personalInfo?.firstName}!
          </Text>
          <Text variant="bodyMedium" style={styles.subWelcomeText}>
            Chúc bạn một ngày tốt lành
          </Text>
        </Card.Content>
      </Card>

      {/* Stats Grid */}
      <View style={styles.statsContainer}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Thống kê
        </Text>
        <View style={styles.statsGrid}>
          {stats.map((stat, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.statCardWrapper}
              onPress={() => navigation.navigate(stat.screen, stat.params)}
              activeOpacity={0.7}
            >
              <Card style={styles.statCard}>
                <Card.Content style={styles.statContent}>
                  <View style={[styles.statIcon, { backgroundColor: stat.color }]}>
                    <MaterialIcons name={stat.icon} size={24} color="white" />
                  </View>
                  <Text variant="headlineSmall" style={styles.statValue}>
                    {stat.value}
                  </Text>
                  <Text variant="bodyMedium" style={styles.statLabel}>
                    {stat.label}
                  </Text>
                </Card.Content>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Thao tác nhanh
        </Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((action, index) => (
            <Card 
              key={index} 
              style={styles.actionCard}
              onPress={action.onPress}
            >
              <Card.Content style={styles.actionContent}>
                <View style={[styles.actionIcon, { backgroundColor: action.color }]}>
                  <MaterialIcons name={action.icon} size={28} color="white" />
                </View>
                <Text variant="bodyMedium" style={styles.actionTitle}>
                  {action.title}
                </Text>
              </Card.Content>
            </Card>
          ))}
        </View>
      </View>

      {/* Recent Activity */}
      <Card style={styles.activityCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Hoạt động gần đây
          </Text>
          {recentActivities.length === 0 ? (
            <View style={styles.emptyActivity}>
              <MaterialIcons name="history" size={40} color="#ccc" />
              <Text style={styles.emptyText}>Chưa có hoạt động nào</Text>
            </View>
          ) : (
            recentActivities.map((activity, index) => (
              <View key={index} style={styles.activityItem}>
                <MaterialIcons name={activity.icon} size={20} color={activity.color} />
                <View style={styles.activityText}>
                  <Text variant="bodyMedium">{activity.title}</Text>
                  <Text variant="bodySmall" style={styles.activitySubtitle}>
                    {activity.subtitle}
                  </Text>
                  <Text variant="bodySmall" style={styles.activityTime}>
                    {activity.time ? formatActivityTime(activity.time) : ''}
                  </Text>
                </View>
              </View>
            ))
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

// Helper function để format thời gian
const formatActivityTime = (dateString) => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return `Hôm nay, ${format(date, 'HH:mm', { locale: vi })}`;
    } else if (diffDays === 1) {
      return `Hôm qua, ${format(date, 'HH:mm', { locale: vi })}`;
    } else if (diffDays < 7) {
      return `${diffDays} ngày trước`;
    } else {
      return format(date, 'dd/MM/yyyy', { locale: vi });
    }
  } catch (e) {
    return '';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  welcomeCard: {
    margin: 16,
    backgroundColor: '#1976d2',
  },
  welcomeText: {
    color: 'white',
    fontWeight: 'bold',
  },
  subWelcomeText: {
    color: 'white',
    opacity: 0.8,
  },
  statsContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCardWrapper: {
    width: '48%',
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
  },
  statContent: {
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    textAlign: 'center',
    color: '#666',
  },
  actionsContainer: {
    padding: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '31%',
  },
  actionContent: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    textAlign: 'center',
    fontWeight: '500',
  },
  activityCard: {
    margin: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  activityText: {
    marginLeft: 12,
    flex: 1,
  },
  activityTime: {
    color: '#666',
  },
});

export default DashboardScreen;