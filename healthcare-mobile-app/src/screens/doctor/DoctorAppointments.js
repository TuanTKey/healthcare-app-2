import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../services/api';

const DoctorAppointments = ({ navigation }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, today, pending, completed
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchAppointments();
  }, [filter]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/appointments?limit=100');
      
      let data = [];
      if (response.data?.data?.data) {
        data = response.data.data.data;
      } else if (Array.isArray(response.data?.data)) {
        data = response.data.data;
      }

      // Apply filter
      const today = new Date().toDateString();
      let filtered = data;

      if (filter === 'today') {
        filtered = data.filter(apt => 
          new Date(apt.scheduledTime || apt.date).toDateString() === today
        );
      } else if (filter === 'pending') {
        filtered = data.filter(apt => 
          apt.status === 'PENDING' || apt.status === 'CONFIRMED'
        );
      } else if (filter === 'completed') {
        filtered = data.filter(apt => apt.status === 'COMPLETED');
      }

      // Sort by date
      filtered.sort((a, b) => 
        new Date(b.scheduledTime || b.date) - new Date(a.scheduledTime || a.date)
      );

      setAppointments(filtered);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAppointments();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    const colors = {
      'PENDING': '#FF9800',
      'CONFIRMED': '#2196F3',
      'IN_PROGRESS': '#9C27B0',
      'COMPLETED': '#4CAF50',
      'CANCELLED': '#F44336',
      'NO_SHOW': '#607D8B'
    };
    return colors[status] || '#999';
  };

  const getStatusText = (status) => {
    const texts = {
      'PENDING': 'Chờ xác nhận',
      'CONFIRMED': 'Đã xác nhận',
      'IN_PROGRESS': 'Đang khám',
      'COMPLETED': 'Hoàn thành',
      'CANCELLED': 'Đã hủy',
      'NO_SHOW': 'Vắng mặt'
    };
    return texts[status] || status;
  };

  const updateAppointmentStatus = async (appointmentId, newStatus) => {
    try {
      await api.put(`/appointments/${appointmentId}`, { status: newStatus });
      fetchAppointments();
    } catch (error) {
      console.error('Error updating appointment:', error);
    }
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

  const AppointmentCard = ({ item }) => {
    const date = new Date(item.scheduledTime || item.appointmentDate || item.date);
    
    // 🔧 FIX: Lấy tên bệnh nhân từ đúng cấu trúc dữ liệu
    const getPatientName = () => {
      // Cấu trúc 1: patientId.personalInfo (từ populate)
      if (item.patientId?.personalInfo) {
        const info = item.patientId.personalInfo;
        return `${info.firstName || ''} ${info.lastName || ''}`.trim() || 'Bệnh nhân';
      }
      // Cấu trúc 2: patient.userId.personalInfo
      if (item.patient?.userId?.personalInfo) {
        const info = item.patient.userId.personalInfo;
        return `${info.firstName || ''} ${info.lastName || ''}`.trim() || 'Bệnh nhân';
      }
      // Cấu trúc 3: patient.personalInfo
      if (item.patient?.personalInfo) {
        const info = item.patient.personalInfo;
        return `${info.firstName || ''} ${info.lastName || ''}`.trim() || 'Bệnh nhân';
      }
      // Fallback: email hoặc tên mặc định
      return item.patientId?.email || item.patient?.email || 'Bệnh nhân';
    };
    
    const patientName = getPatientName();

    return (
      <TouchableOpacity
        style={styles.appointmentCard}
        onPress={() => navigation.navigate('DoctorAppointmentDetail', { appointment: item })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.dateContainer}>
            <Text style={styles.dateDay}>{date.getDate()}</Text>
            <Text style={styles.dateMonth}>
              Thg {date.getMonth() + 1}
            </Text>
          </View>
          <View style={styles.appointmentInfo}>
            <Text style={styles.patientName}>{patientName}</Text>
            <View style={styles.timeRow}>
              <MaterialIcons name="access-time" size={14} color="#666" />
              <Text style={styles.timeText}>
                {date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <Text style={styles.appointmentType}>{item.type || 'Khám tổng quát'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>

        {item.reason && (
          <View style={styles.reasonContainer}>
            <MaterialIcons name="description" size={16} color="#666" />
            <Text style={styles.reasonText} numberOfLines={2}>{item.reason}</Text>
          </View>
        )}

        {/* Quick Actions */}
        {(item.status === 'PENDING' || item.status === 'CONFIRMED') && (
          <View style={styles.actionButtons}>
            {item.status === 'PENDING' && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.confirmBtn]}
                onPress={() => updateAppointmentStatus(item._id, 'CONFIRMED')}
              >
                <MaterialIcons name="check" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>Xác nhận</Text>
              </TouchableOpacity>
            )}
            {item.status === 'CONFIRMED' && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.startBtn]}
                onPress={() => updateAppointmentStatus(item._id, 'IN_PROGRESS')}
              >
                <MaterialIcons name="play-arrow" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>Bắt đầu khám</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionBtn, styles.cancelBtn]}
              onPress={() => updateAppointmentStatus(item._id, 'CANCELLED')}
            >
              <MaterialIcons name="close" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Hủy</Text>
            </TouchableOpacity>
          </View>
        )}

        {item.status === 'IN_PROGRESS' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.completeBtn]}
              onPress={() => updateAppointmentStatus(item._id, 'COMPLETED')}
            >
              <MaterialIcons name="done-all" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Hoàn thành khám</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#00796B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lịch Hẹn Khám</Text>
        <TouchableOpacity onPress={onRefresh}>
          <MaterialIcons name="refresh" size={24} color="#00796B" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm bệnh nhân..."
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <FilterButton label="Tất cả" value="all" />
        <FilterButton label="Hôm nay" value="today" />
        <FilterButton label="Chờ khám" value="pending" />
        <FilterButton label="Hoàn thành" value="completed" />
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00796B" />
        </View>
      ) : (
        <FlatList
          data={appointments.filter(apt => {
            if (!searchText) return true;
            // Lấy tên từ các cấu trúc khác nhau
            const firstName = apt.patientId?.personalInfo?.firstName || 
                             apt.patient?.userId?.personalInfo?.firstName || 
                             apt.patient?.personalInfo?.firstName || '';
            const lastName = apt.patientId?.personalInfo?.lastName || 
                            apt.patient?.userId?.personalInfo?.lastName || 
                            apt.patient?.personalInfo?.lastName || '';
            const email = apt.patientId?.email || apt.patient?.email || '';
            const name = `${firstName} ${lastName} ${email}`.toLowerCase();
            return name.includes(searchText.toLowerCase());
          })}
          renderItem={({ item }) => <AppointmentCard item={item} />}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00796B']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="event-busy" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Không có lịch hẹn</Text>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    elevation: 2
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  filterButtonActive: {
    backgroundColor: '#00796B',
    borderColor: '#00796B'
  },
  filterText: {
    fontSize: 13,
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
  appointmentCard: {
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
  dateContainer: {
    width: 50,
    height: 50,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  dateDay: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00796B'
  },
  dateMonth: {
    fontSize: 10,
    color: '#00796B'
  },
  appointmentInfo: {
    flex: 1,
    marginLeft: 12
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  timeText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4
  },
  appointmentType: {
    fontSize: 12,
    color: '#999',
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
  reasonContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  reasonText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    marginLeft: 8
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4
  },
  confirmBtn: {
    backgroundColor: '#2196F3'
  },
  startBtn: {
    backgroundColor: '#9C27B0'
  },
  completeBtn: {
    backgroundColor: '#4CAF50',
    flex: 1,
    justifyContent: 'center'
  },
  cancelBtn: {
    backgroundColor: '#F44336'
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

export default DoctorAppointments;
