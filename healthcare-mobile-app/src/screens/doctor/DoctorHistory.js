import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  RefreshControl,
  TextInput
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../services/api';

const DoctorHistory = ({ navigation }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchCompletedAppointments();
  }, []);

  const fetchCompletedAppointments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/appointments?limit=100');
      
      let data = [];
      if (response.data?.data?.data) {
        data = response.data.data.data;
      } else if (Array.isArray(response.data?.data)) {
        data = response.data.data;
      }

      // Chỉ lấy lịch đã hoàn thành
      const completed = data.filter(apt => apt.status === 'COMPLETED');
      
      // Sắp xếp theo ngày mới nhất
      completed.sort((a, b) => 
        new Date(b.appointmentDate || b.scheduledTime || b.date) - 
        new Date(a.appointmentDate || a.scheduledTime || a.date)
      );

      setAppointments(completed);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCompletedAppointments();
    setRefreshing(false);
  };

  const getPatientName = (item) => {
    if (item.patientId?.personalInfo) {
      const info = item.patientId.personalInfo;
      return `${info.firstName || ''} ${info.lastName || ''}`.trim() || 'Bệnh nhân';
    }
    if (item.patient?.userId?.personalInfo) {
      const info = item.patient.userId.personalInfo;
      return `${info.firstName || ''} ${info.lastName || ''}`.trim() || 'Bệnh nhân';
    }
    return item.patientId?.email || 'Bệnh nhân';
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const HistoryCard = ({ item }) => {
    const appointmentDate = item.appointmentDate || item.scheduledTime || item.date;
    
    return (
      <TouchableOpacity
        style={styles.historyCard}
        onPress={() => navigation.navigate('DoctorAppointmentDetail', { appointment: item })}
      >
        <View style={styles.cardLeft}>
          <View style={styles.dateContainer}>
            <MaterialIcons name="event" size={20} color="#4CAF50" />
            <Text style={styles.dateText}>{formatDate(appointmentDate)}</Text>
          </View>
          <View style={styles.timeContainer}>
            <MaterialIcons name="access-time" size={16} color="#666" />
            <Text style={styles.timeText}>{formatTime(appointmentDate)}</Text>
          </View>
        </View>

        <View style={styles.cardCenter}>
          <Text style={styles.patientName}>{getPatientName(item)}</Text>
          <Text style={styles.reason} numberOfLines={1}>
            {item.reason || item.type || 'Khám bệnh'}
          </Text>
          {item.diagnosis && (
            <Text style={styles.diagnosis} numberOfLines={1}>
              Chẩn đoán: {item.diagnosis}
            </Text>
          )}
        </View>

        <View style={styles.cardRight}>
          <View style={styles.statusBadge}>
            <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
            <Text style={styles.statusText}>Hoàn thành</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#ccc" />
        </View>
      </TouchableOpacity>
    );
  };

  const filteredAppointments = appointments.filter(apt => {
    if (!searchText) return true;
    const patientName = getPatientName(apt).toLowerCase();
    const reason = (apt.reason || '').toLowerCase();
    const search = searchText.toLowerCase();
    return patientName.includes(search) || reason.includes(search);
  });

  // Nhóm theo ngày
  const groupByDate = (data) => {
    const groups = {};
    data.forEach(apt => {
      const date = new Date(apt.appointmentDate || apt.scheduledTime || apt.date);
      const dateKey = date.toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = {
          title: formatDate(apt.appointmentDate || apt.scheduledTime || apt.date),
          data: []
        };
      }
      groups[dateKey].data.push(apt);
    });
    return Object.values(groups);
  };

  const groupedData = groupByDate(filteredAppointments);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#00796B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lịch Sử Khám</Text>
        <TouchableOpacity onPress={onRefresh}>
          <MaterialIcons name="refresh" size={24} color="#00796B" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{appointments.length}</Text>
          <Text style={styles.statLabel}>Tổng lượt khám</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo tên bệnh nhân, lý do khám..."
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <MaterialIcons name="close" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00796B" />
        </View>
      ) : (
        <FlatList
          data={filteredAppointments}
          renderItem={({ item }) => <HistoryCard item={item} />}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={['#00796B']} 
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="history" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Chưa có lịch sử khám</Text>
              <Text style={styles.emptySubText}>
                Các lịch khám đã hoàn thành sẽ hiển thị ở đây
              </Text>
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 32
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50'
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
    marginTop: 4
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    elevation: 2
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 15
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  listContent: {
    padding: 16
  },
  historyCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50'
  },
  cardLeft: {
    marginRight: 12
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginLeft: 4
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  timeText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4
  },
  cardCenter: {
    flex: 1
  },
  patientName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333'
  },
  reason: {
    fontSize: 13,
    color: '#666',
    marginTop: 2
  },
  diagnosis: {
    fontSize: 12,
    color: '#00796B',
    marginTop: 2,
    fontStyle: 'italic'
  },
  cardRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between'
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 4
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16
  },
  emptySubText: {
    fontSize: 13,
    color: '#bbb',
    marginTop: 4,
    textAlign: 'center'
  }
});

export default DoctorHistory;
