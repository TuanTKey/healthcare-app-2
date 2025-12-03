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

const DoctorDashboard = () => {
  const navigation = useNavigation();
  const { user } = useSelector(state => state.auth);
  const [stats, setStats] = useState({
    todayAppointments: 0,
    pendingAppointments: 0,
    totalPatients: 0,
    completedToday: 0,
    pendingLabOrders: 0,
    pendingPrescriptions: 0
  });
  const [todaySchedule, setTodaySchedule] = useState([]);
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
      let todayAppts = 0;
      let pendingAppts = 0;
      let completedAppts = 0;

      // Lấy lịch hẹn của bác sĩ
      try {
        const appointmentsRes = await api.get('/appointments?limit=100');
        console.log('📊 Doctor Appointments Response:', JSON.stringify(appointmentsRes.data));
        
        if (appointmentsRes.data?.data?.data) {
          appointments = appointmentsRes.data.data.data;
        } else if (Array.isArray(appointmentsRes.data?.data)) {
          appointments = appointmentsRes.data.data;
        }

        const today = new Date().toDateString();
        
        // Đếm thống kê
        let todayTotal = 0;      // Tổng lịch hôm nay (không tính đã hủy)
        let todayCompleted = 0;  // Đã hoàn thành hôm nay
        let todayPending = 0;    // Chờ khám hôm nay (chưa hoàn thành)
        
        appointments.forEach(apt => {
          const aptDate = new Date(apt.scheduledTime || apt.appointmentDate || apt.date).toDateString();
          
          if (aptDate === today && apt.status !== 'CANCELLED') {
            todayTotal++;
            if (apt.status === 'COMPLETED') {
              todayCompleted++;
            } else {
              todayPending++;
            }
          }
          
          // Đếm tổng chờ khám (tất cả ngày)
          if (['PENDING', 'SCHEDULED', 'CONFIRMED'].includes(apt.status)) {
            pendingAppts++;
          }
        });
        
        // "Hẹn hôm nay" = chỉ đếm lịch chờ khám (chưa hoàn thành)
        todayAppts = todayPending;
        completedAppts = todayCompleted;

        // Lấy lịch hôm nay - chỉ hiển thị lịch chờ khám (chưa hoàn thành, chưa hủy)
        const todayAppointments = appointments
          .filter(apt => {
            const aptDate = new Date(apt.scheduledTime || apt.appointmentDate || apt.date).toDateString();
            const shouldShow = aptDate === today && !['COMPLETED', 'CANCELLED'].includes(apt.status);
            console.log(`📅 Appointment ${apt.appointmentId}: date=${aptDate}, today=${today}, status=${apt.status}, show=${shouldShow}`);
            return shouldShow;
          })
          .sort((a, b) => 
            new Date(a.scheduledTime || a.appointmentDate || a.date) - 
            new Date(b.scheduledTime || b.appointmentDate || b.date)
          )
          .slice(0, 5);
        
        console.log(`📋 Today schedule count: ${todayAppointments.length}`);
        setTodaySchedule(todayAppointments);

      } catch (err) {
        console.warn('Could not fetch appointments:', err.message);
      }

      // Lấy số lượng bệnh nhân - chỉ đếm bệnh nhân có đầy đủ thông tin
      let totalPatients = 0;
      try {
        const patientsRes = await api.get('/patients?limit=1000');
        console.log('📊 Patients Response:', JSON.stringify(patientsRes.data));
        
        let patientsData = [];
        if (patientsRes.data?.data?.patients) {
          patientsData = patientsRes.data.data.patients;
        } else if (Array.isArray(patientsRes.data?.data)) {
          patientsData = patientsRes.data.data;
        }
        
        // Lọc chỉ đếm bệnh nhân có đầy đủ thông tin và không bị xoá
        const validPatients = patientsData.filter(patient => {
          // Kiểm tra không bị xoá
          if (patient.isDeleted || patient.userId?.isDeleted) {
            return false;
          }
          
          // Lấy thông tin cá nhân từ các cấu trúc khác nhau
          const userInfo = patient.userId?.personalInfo || patient.personalInfo || patient.user?.personalInfo || {};
          const firstName = userInfo.firstName || patient.firstName || '';
          const lastName = userInfo.lastName || patient.lastName || '';
          const dateOfBirth = userInfo.dateOfBirth || patient.dateOfBirth;
          
          // Chỉ đếm bệnh nhân có đầy đủ họ tên và ngày sinh
          const hasName = firstName.trim() && lastName.trim();
          const hasAge = !!dateOfBirth;
          
          return hasName && hasAge;
        });
        
        totalPatients = validPatients.length;
        console.log('📋 Valid patients count:', totalPatients, '/', patientsData.length);
      } catch (err) {
        console.warn('Could not fetch patients count:', err.message);
      }

      setStats({
        todayAppointments: todayAppts,
        pendingAppointments: pendingAppts,
        totalPatients,
        completedToday: completedAppts,
        pendingLabOrders: 0,
        pendingPrescriptions: 0
      });

    } catch (error) {
      console.error('Error fetching data:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  const StatCard = ({ icon, title, value, color, onPress }) => (
    <TouchableOpacity 
      style={[styles.statCard, { backgroundColor: color }]} 
      activeOpacity={0.8}
      onPress={onPress}
    >
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

  const AppointmentItem = ({ appointment }) => {
    const time = new Date(appointment.scheduledTime || appointment.appointmentDate || appointment.date);
    const statusColors = {
      'PENDING': '#FF9800',
      'SCHEDULED': '#FF9800',
      'CONFIRMED': '#2196F3',
      'IN_PROGRESS': '#9C27B0',
      'COMPLETED': '#4CAF50',
      'CANCELLED': '#F44336'
    };
    
    const statusTexts = {
      'PENDING': 'Chờ xác nhận',
      'SCHEDULED': 'Đã lên lịch',
      'CONFIRMED': 'Đã xác nhận',
      'IN_PROGRESS': 'Đang khám',
      'COMPLETED': 'Hoàn thành',
      'CANCELLED': 'Đã hủy'
    };
    
    // Lấy tên bệnh nhân
    const getPatientName = () => {
      if (appointment.patientId?.personalInfo) {
        const info = appointment.patientId.personalInfo;
        return `${info.firstName || ''} ${info.lastName || ''}`.trim();
      }
      if (appointment.patient?.userId?.personalInfo) {
        const info = appointment.patient.userId.personalInfo;
        return `${info.firstName || ''} ${info.lastName || ''}`.trim();
      }
      return 'Bệnh nhân';
    };

    return (
      <TouchableOpacity 
        style={styles.appointmentItem}
        onPress={() => navigation.navigate('DoctorAppointmentDetail', { appointment })}
      >
        <View style={styles.appointmentTime}>
          <Text style={styles.appointmentTimeText}>
            {time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <View style={styles.appointmentInfo}>
          <Text style={styles.patientName}>{getPatientName()}</Text>
          <Text style={styles.appointmentType}>{appointment.reason || appointment.type || 'Khám bệnh'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColors[appointment.status] || '#999' }]}>
          <Text style={styles.statusText}>{statusTexts[appointment.status] || appointment.status}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#00796B" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>
              BS. {user?.personalInfo?.lastName || user?.personalInfo?.firstName || 'Bác sĩ'}
            </Text>
            <View style={styles.roleBadge}>
              <MaterialIcons name="medical-services" size={14} color="#fff" />
              <Text style={styles.roleText}>
                {user?.professionalInfo?.specialization || 'Bác sĩ'}
              </Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.headerRight}
            onPress={() => navigation.navigate('DoctorProfile')}
          >
            <View style={styles.avatarContainer}>
              <MaterialIcons name="person" size={28} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Today Summary */}
        <View style={styles.todaySummary}>
          <View style={styles.todayItem}>
            <MaterialIcons name="event" size={20} color="rgba(255,255,255,0.8)" />
            <Text style={styles.todayValue}>{stats.todayAppointments}</Text>
            <Text style={styles.todayLabel}>Hẹn hôm nay</Text>
          </View>
          <View style={styles.todayDivider} />
          <View style={styles.todayItem}>
            <MaterialIcons name="check-circle" size={20} color="rgba(255,255,255,0.8)" />
            <Text style={styles.todayValue}>{stats.completedToday}</Text>
            <Text style={styles.todayLabel}>Đã khám</Text>
          </View>
          <View style={styles.todayDivider} />
          <View style={styles.todayItem}>
            <MaterialIcons name="pending" size={20} color="rgba(255,255,255,0.8)" />
            <Text style={styles.todayValue}>{stats.pendingAppointments}</Text>
            <Text style={styles.todayLabel}>Chờ khám</Text>
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
            colors={['#00796B']}
            tintColor="#00796B"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00796B" />
          </View>
        )}

        {/* Stats Overview */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Tổng Quan</Text>
          <View style={styles.statsGrid}>
            <StatCard 
              icon="event-available" 
              title="Lịch Hôm Nay" 
              value={stats.todayAppointments}
              color="#00796B"
              onPress={() => navigation.navigate('DoctorAppointments')}
            />
            <StatCard 
              icon="people" 
              title="Bệnh Nhân" 
              value={stats.totalPatients}
              color="#1976D2"
              onPress={() => navigation.navigate('DoctorPatients')}
            />
            <StatCard 
              icon="pending-actions" 
              title="Chờ Khám" 
              value={stats.pendingAppointments}
              color="#FF9800"
              onPress={() => navigation.navigate('DoctorAppointments')}
            />
            <StatCard 
              icon="assignment-turned-in" 
              title="Hoàn Thành" 
              value={stats.completedToday}
              color="#4CAF50"
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Thao Tác Nhanh</Text>
          <View style={styles.menuGrid}>
            <QuickAction 
              icon="event" 
              title="Lịch Hẹn" 
              color="#00796B"
              badge={stats.todayAppointments}
              onPress={() => navigation.navigate('DoctorAppointments')}
            />
            <QuickAction 
              icon="people" 
              title="Bệnh Nhân" 
              color="#1976D2"
              onPress={() => navigation.navigate('DoctorPatients')}
            />
            <QuickAction 
              icon="folder-shared" 
              title="Hồ Sơ Bệnh" 
              color="#9C27B0"
              onPress={() => navigation.navigate('DoctorMedicalRecords')}
            />
            <QuickAction 
              icon="medication" 
              title="Kê Đơn" 
              color="#E91E63"
              onPress={() => navigation.navigate('DoctorPrescriptions')}
            />
            <QuickAction 
              icon="biotech" 
              title="Xét Nghiệm" 
              color="#FF5722"
              onPress={() => navigation.navigate('DoctorLabOrders')}
            />
            <QuickAction 
              icon="note-add" 
              title="Tạo Hồ Sơ" 
              color="#607D8B"
              onPress={() => navigation.navigate('CreateMedicalRecord')}
            />
            <QuickAction 
              icon="history" 
              title="Lịch Sử" 
              color="#795548"
              onPress={() => navigation.navigate('DoctorHistory')}
            />
            <QuickAction 
              icon="settings" 
              title="Cài Đặt" 
              color="#455A64"
              onPress={() => navigation.navigate('DoctorSettings')}
            />
          </View>
        </View>

        {/* Today's Schedule */}
        <View style={styles.scheduleSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Lịch Khám Hôm Nay</Text>
            <TouchableOpacity onPress={() => navigation.navigate('DoctorAppointments')}>
              <Text style={styles.seeAllText}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>
          
          {todaySchedule.length > 0 ? (
            <View style={styles.scheduleList}>
              {todaySchedule.map((apt, index) => (
                <AppointmentItem key={apt._id || index} appointment={apt} />
              ))}
            </View>
          ) : (
            <View style={styles.emptySchedule}>
              <MaterialIcons name="event-busy" size={48} color="#ccc" />
              <Text style={styles.emptyText}>Không có lịch hẹn hôm nay</Text>
            </View>
          )}
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
    backgroundColor: '#f5f5f5'
  },
  header: {
    backgroundColor: '#00796B',
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
    fontSize: 24,
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
    color: '#00796B',
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
    minHeight: 110
  },
  statCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10
  },
  statCardValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff'
  },
  statCardTitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    fontWeight: '500'
  },
  menuSection: {
    marginBottom: 24
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
    backgroundColor: '#F44336',
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
  scheduleSection: {
    marginBottom: 24
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  seeAllText: {
    fontSize: 14,
    color: '#00796B',
    fontWeight: '600'
  },
  scheduleList: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4
  },
  appointmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  appointmentTime: {
    width: 60,
    alignItems: 'center'
  },
  appointmentTimeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#00796B'
  },
  appointmentInfo: {
    flex: 1,
    marginLeft: 12
  },
  patientName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333'
  },
  appointmentType: {
    fontSize: 13,
    color: '#666',
    marginTop: 2
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
  emptySchedule: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    elevation: 2
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12
  },
  footerSpacing: {
    height: 30
  }
});

export default DoctorDashboard;
