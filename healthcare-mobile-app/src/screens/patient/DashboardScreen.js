import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { MaterialIcons } from '@expo/vector-icons';
import Card from '../../components/common/Card';
import api from '../../services/api';

const DashboardScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const [refreshing, setRefreshing] = React.useState(false);
  const [stats, setStats] = useState([
    { icon: 'event', label: 'Lịch hẹn', value: '0', color: '#4CAF50', screen: 'Appointments' },
    { icon: 'local-pharmacy', label: 'Đơn thuốc', value: '0', color: '#2196F3', screen: 'Prescriptions' },
    { icon: 'receipt', label: 'Hóa đơn', value: '0', color: '#FF9800', screen: 'Billing' },
    { icon: 'folder', label: 'Hồ sơ', value: '0', color: '#9C27B0', screen: 'Records' },
  ]);

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
      let recordCount = 0;
      let prescriptionCount = 0;
      let billCount = 0;

      // Fetch appointments
      try {
        const appointmentsRes = await api.get(`/appointments/patient/${user._id}`);
        console.log('📊 Appointments response:', appointmentsRes.data);
        
        if (appointmentsRes.data?.data?.data && Array.isArray(appointmentsRes.data.data.data)) {
          appointmentCount = appointmentsRes.data.data.data.length;
        } else if (appointmentsRes.data?.data?.appointments && Array.isArray(appointmentsRes.data.data.appointments)) {
          appointmentCount = appointmentsRes.data.data.appointments.length;
        } else if (appointmentsRes.data?.data && Array.isArray(appointmentsRes.data.data)) {
          appointmentCount = appointmentsRes.data.data.length;
        }
        console.log('📅 Appointments count:', appointmentCount);
      } catch (err) {
        console.warn('⚠️ Failed to fetch appointments:', err.message);
      }

      // Fetch medical records
      try {
        const recordsRes = await api.get(`/medical-records/patient/${user._id}/records`);
        console.log('📋 Medical records response:', recordsRes.data);
        
        if (recordsRes.data?.data?.medicalRecords && Array.isArray(recordsRes.data.data.medicalRecords)) {
          recordCount = recordsRes.data.data.medicalRecords.length;
        } else if (recordsRes.data?.data?.data && Array.isArray(recordsRes.data.data.data)) {
          recordCount = recordsRes.data.data.data.length;
        } else if (recordsRes.data?.data && Array.isArray(recordsRes.data.data)) {
          recordCount = recordsRes.data.data.length;
        } else if (Array.isArray(recordsRes.data)) {
          recordCount = recordsRes.data.length;
        }
        console.log('📄 Medical records count:', recordCount);
      } catch (err) {
        console.warn('⚠️ Failed to fetch medical records:', err.message);
      }

      // Fetch prescriptions
      try {
        const prescriptionsRes = await api.get(`/prescriptions/patients/${user._id}/prescriptions`);
        console.log('💊 Prescriptions response:', prescriptionsRes.data);
        
        if (prescriptionsRes.data?.data?.data && Array.isArray(prescriptionsRes.data.data.data)) {
          prescriptionCount = prescriptionsRes.data.data.data.length;
        } else if (prescriptionsRes.data?.data && Array.isArray(prescriptionsRes.data.data)) {
          prescriptionCount = prescriptionsRes.data.data.length;
        } else if (Array.isArray(prescriptionsRes.data?.data)) {
          prescriptionCount = prescriptionsRes.data.data.length;
        }
        console.log('💊 Prescriptions count:', prescriptionCount);
      } catch (err) {
        console.warn('⚠️ Failed to fetch prescriptions:', err.message);
      }

      // Fetch bills
      try {
        const billsRes = await api.get(`/bills/patients/${user._id}/bills`);
        console.log('💰 Bills response:', billsRes.data);
        
        if (billsRes.data?.data?.data && Array.isArray(billsRes.data.data.data)) {
          billCount = billsRes.data.data.data.length;
        } else if (billsRes.data?.data && Array.isArray(billsRes.data.data)) {
          billCount = billsRes.data.data.length;
        } else if (Array.isArray(billsRes.data?.data)) {
          billCount = billsRes.data.data.length;
        }
        console.log('💰 Bills count:', billCount);
      } catch (err) {
        console.warn('⚠️ Failed to fetch bills:', err.message);
      }

      // Update stats
      setStats(prevStats => [
        { ...prevStats[0], value: appointmentCount.toString(), screen: 'Appointments' },
        { ...prevStats[1], value: prescriptionCount.toString(), screen: 'Prescriptions' },
        { ...prevStats[2], value: billCount.toString(), screen: 'Billing' },
        { ...prevStats[3], value: recordCount.toString(), screen: 'Records' },
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
              onPress={() => navigation.navigate(stat.screen)}
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
          <View style={styles.activityItem}>
            <MaterialIcons name="event" size={20} color="#4CAF50" />
            <View style={styles.activityText}>
              <Text variant="bodyMedium">Lịch hẹn với BS. Nguyễn Văn A</Text>
              <Text variant="bodySmall" style={styles.activityTime}>
                Hôm nay, 14:30
              </Text>
            </View>
          </View>
          <View style={styles.activityItem}>
            <MaterialIcons name="local-pharmacy" size={20} color="#2196F3" />
            <View style={styles.activityText}>
              <Text variant="bodyMedium">Đơn thuốc mới</Text>
              <Text variant="bodySmall" style={styles.activityTime}>
                2 ngày trước
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
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