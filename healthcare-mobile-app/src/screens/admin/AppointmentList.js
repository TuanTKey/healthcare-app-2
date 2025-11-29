import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Text,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../services/api';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';

const AppointmentList = ({ navigation }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      console.log('📋 Admin fetching all appointments...');
      const response = await api.get('/appointments');
      console.log('📋 Full API Response:', response.data);
      
      // API response structure: { data: { data: [...], pagination: {...} }, message, success }
      let appointmentsList = [];
      
      // Try different parsing paths
      if (response.data?.data?.data && Array.isArray(response.data.data.data)) {
        appointmentsList = response.data.data.data;
        console.log('📋 Found at response.data.data.data');
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        appointmentsList = response.data.data;
        console.log('📋 Found at response.data.data');
      } else if (Array.isArray(response.data)) {
        appointmentsList = response.data;
        console.log('📋 Found at response.data');
      }
      
      console.log('📋 Parsed appointments count:', appointmentsList.length);
      if (appointmentsList.length > 0) {
        console.log('📋 First appointment:', appointmentsList[0]);
      }
      setAppointments(appointmentsList);
    } catch (error) {
      console.error('⚠️ Không thể tải lịch hẹn:', error.message);
      Alert.alert('Lỗi', 'Không thể tải danh sách lịch hẹn');
      setAppointments([]);
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
    switch (status) {
      case 'SCHEDULED':
        return '#FFC107';
      case 'CONFIRMED':
        return '#4CAF50';
      case 'IN_PROGRESS':
        return '#2196F3';
      case 'COMPLETED':
        return '#8BC34A';
      case 'CANCELLED':
        return '#F44336';
      case 'NO_SHOW':
        return '#FF9800';
      default:
        return '#999';
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      SCHEDULED: '⏳ Đang chờ',
      CONFIRMED: '✅ Xác nhận',
      IN_PROGRESS: '🏥 Đang khám',
      COMPLETED: '✔️ Hoàn thành',
      CANCELLED: '❌ Hủy',
      NO_SHOW: '⚠️ Không đến'
    };
    return labels[status] || status;
  };

  const handleCancelAppointment = async (appointmentId) => {
    Alert.alert('Hủy Lịch Hẹn', 'Bạn có chắc chắn muốn hủy lịch hẹn này?', [
      { text: 'Không', onPress: () => {} },
      {
        text: 'Có',
        onPress: async () => {
          try {
            await api.post(`/appointments/${appointmentId}/cancel`, {
              reason: 'Hủy bởi admin'
            });
            Alert.alert('Thành công', 'Hủy lịch hẹn thành công');
            fetchAppointments();
          } catch (error) {
            Alert.alert('Lỗi', 'Không thể hủy lịch hẹn');
          }
        }
      }
    ]);
  };

  const AppointmentItem = ({ item }) => {
    try {
      return (
        <Card style={styles.appointmentCard}>
          <Card.Content>
            <View style={styles.appointmentHeader}>
              <View style={styles.appointmentInfo}>
                <Text style={styles.appointmentTime}>
                  {new Date(item.appointmentDate).toLocaleDateString('vi-VN')} {new Date(item.appointmentDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Text style={styles.appointmentReason}>{item.reason || 'Khám tổng quát'}</Text>
                <View style={styles.detailsRow}>
                  <Text style={styles.detail}>
                    👤 {item.patientId?.personalInfo?.firstName || item.patientId?.email || 'N/A'} {item.patientId?.personalInfo?.lastName || ''}
                  </Text>
                  {item.doctorId && (
                    <Text style={styles.detail}>
                      🏥 {item.doctorId?.personalInfo?.firstName || item.doctorId?.email || 'N/A'} {item.doctorId?.personalInfo?.lastName || ''}
                    </Text>
                  )}
                </View>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(item.status) }
                ]}
              >
                <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
              </View>
            </View>

            {(item.status === 'SCHEDULED' || item.status === 'CONFIRMED') && (
              <View style={styles.actionButtons}>
                <Button
                  mode="text"
                  onPress={() => handleCancelAppointment(item._id)}
                  style={styles.cancelButton}
                >
                  Hủy
                </Button>
              </View>
            )}
          </Card.Content>
        </Card>
      );
    } catch (error) {
      console.error('Error rendering appointment item:', error);
      return (
        <Card style={styles.appointmentCard}>
          <Card.Content>
            <Text>Lỗi hiển thị lịch hẹn: {error.message}</Text>
          </Card.Content>
        </Card>
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={28} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Lịch Hẹn ({appointments.length})</Text>
        <View style={{ width: 28 }} />
      </View>

      {console.log('📋 Rendering AppointmentList - appointments:', appointments.length, 'loading:', loading, 'refreshing:', refreshing)}

      {loading && !refreshing ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text>Đang tải...</Text>
        </View>
      ) : (
        <FlatList
          data={appointments}
          renderItem={({ item }) => <AppointmentItem item={item} />}
          keyExtractor={(item) => item._id || Math.random().toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={() => (
            <View style={styles.centerContent}>
              <MaterialIcons name="event-busy" size={48} color="#ccc" />
              <Text style={styles.emptyText}>Không có lịch hẹn</Text>
            </View>
          )}
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
    fontWeight: 'bold'
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  listContent: {
    padding: 12
  },
  appointmentCard: {
    marginBottom: 12,
    borderRadius: 8
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  appointmentInfo: {
    flex: 1
  },
  appointmentTime: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  appointmentReason: {
    fontSize: 14,
    color: '#666',
    marginTop: 4
  },
  detailsRow: {
    marginTop: 8,
    gap: 8
  },
  detail: {
    fontSize: 12,
    color: '#999'
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  actionButtons: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  cancelButton: {
    marginLeft: 8
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12
  }
});

export default AppointmentList;
