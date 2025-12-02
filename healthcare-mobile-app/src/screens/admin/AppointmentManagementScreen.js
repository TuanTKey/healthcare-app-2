import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  FlatList,
  RefreshControl,
  Modal,
  Text,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

const AppointmentManagementScreen = ({ navigation }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    today: 0
  });

  useEffect(() => {
    fetchAppointments();
  }, [filter]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      console.log('📋 [ADMIN] Fetching all appointments...');
      
      const response = await api.get('/appointments', {
        params: { page: 1, limit: 100 }
      });
      
      console.log('📋 [ADMIN] Appointments response:', response.data);
      
      // Parse response - API trả về { data: appointments[], pagination: {} }
      let allAppointments = [];
      if (response.data?.data?.data && Array.isArray(response.data.data.data)) {
        allAppointments = response.data.data.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        allAppointments = response.data.data;
      } else if (response.data?.data?.appointments && Array.isArray(response.data.data.appointments)) {
        allAppointments = response.data.data.appointments;
      }
      
      console.log('📋 [ADMIN] Parsed appointments count:', allAppointments.length);
      
      // Calculate stats
      const today = new Date().toDateString();
      setStats({
        total: allAppointments.length,
        pending: allAppointments.filter(a => a.status === 'PENDING' || a.status === 'SCHEDULED').length,
        confirmed: allAppointments.filter(a => a.status === 'CONFIRMED').length,
        completed: allAppointments.filter(a => a.status === 'COMPLETED').length,
        cancelled: allAppointments.filter(a => a.status === 'CANCELLED').length,
        today: allAppointments.filter(a => 
          new Date(a.appointmentDate || a.scheduledTime || a.date).toDateString() === today
        ).length
      });

      // Filter appointments
      if (filter !== 'all') {
        if (filter === 'today') {
          allAppointments = allAppointments.filter(a => 
            new Date(a.appointmentDate || a.scheduledTime || a.date).toDateString() === today
          );
        } else {
          allAppointments = allAppointments.filter(a => 
            a.status?.toUpperCase() === filter.toUpperCase()
          );
        }
      }

      // Sort by date (newest first)
      allAppointments.sort((a, b) => 
        new Date(b.appointmentDate || b.scheduledTime || b.date) - new Date(a.appointmentDate || a.scheduledTime || a.date)
      );

      setAppointments(allAppointments);
    } catch (error) {
      console.error('❌ [ADMIN] Error fetching appointments:', error.message, error.response?.data);
      Alert.alert('Lỗi', 'Không thể tải danh sách lịch hẹn');
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
      PENDING: '#FF9800',
      SCHEDULED: '#FF9800',
      CONFIRMED: '#4CAF50',
      COMPLETED: '#2196F3',
      CANCELLED: '#F44336',
      NO_SHOW: '#9E9E9E',
      IN_PROGRESS: '#9C27B0'
    };
    return colors[status?.toUpperCase()] || '#9E9E9E';
  };

  const getStatusText = (status) => {
    const texts = {
      PENDING: 'Chờ duyệt',
      SCHEDULED: 'Đã lên lịch',
      CONFIRMED: 'Đã xác nhận',
      COMPLETED: 'Hoàn thành',
      CANCELLED: 'Đã hủy',
      NO_SHOW: 'Không đến',
      IN_PROGRESS: 'Đang khám'
    };
    return texts[status?.toUpperCase()] || status;
  };

  const handleConfirmAppointment = async (appointmentId) => {
    try {
      setActionLoading(true);
      console.log('📋 [ADMIN] Confirming appointment:', appointmentId);
      await api.put(`/appointments/${appointmentId}`, { status: 'CONFIRMED' });
      Alert.alert('Thành công', 'Đã xác nhận lịch hẹn');
      fetchAppointments();
      setShowDetailModal(false);
    } catch (error) {
      console.error('❌ [ADMIN] Confirm error:', error.response?.data);
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể xác nhận lịch hẹn');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteAppointment = async (appointmentId) => {
    try {
      setActionLoading(true);
      console.log('📋 [ADMIN] Completing appointment:', appointmentId);
      await api.put(`/appointments/${appointmentId}`, { status: 'COMPLETED' });
      Alert.alert('Thành công', 'Đã hoàn thành lịch hẹn');
      fetchAppointments();
      setShowDetailModal(false);
    } catch (error) {
      console.error('❌ [ADMIN] Complete error:', error.response?.data);
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể cập nhật lịch hẹn');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelAppointment = (appointmentId) => {
    Alert.alert(
      'Xác nhận hủy',
      'Bạn có chắc chắn muốn hủy lịch hẹn này?',
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Hủy lịch hẹn',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              console.log('📋 [ADMIN] Cancelling appointment:', appointmentId);
              await api.put(`/appointments/${appointmentId}`, { 
                status: 'CANCELLED',
                cancellationReason: 'Hủy bởi Admin'
              });
              Alert.alert('Thành công', 'Đã hủy lịch hẹn');
              fetchAppointments();
              setShowDetailModal(false);
            } catch (error) {
              console.error('❌ [ADMIN] Cancel error:', error.response?.data);
              Alert.alert('Lỗi', 'Không thể hủy lịch hẹn');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleMarkNoShow = async (appointmentId) => {
    try {
      setActionLoading(true);
      console.log('📋 [ADMIN] Marking no-show:', appointmentId);
      await api.put(`/appointments/${appointmentId}`, { status: 'NO_SHOW' });
      Alert.alert('Thành công', 'Đã đánh dấu không đến');
      fetchAppointments();
      setShowDetailModal(false);
    } catch (error) {
      console.error('❌ [ADMIN] No-show error:', error.response?.data);
      Alert.alert('Lỗi', 'Không thể cập nhật lịch hẹn');
    } finally {
      setActionLoading(false);
    }
  };

  const FilterButton = ({ label, value, count }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filter === value && styles.filterButtonActive
      ]}
      onPress={() => setFilter(value)}
    >
      <Text
        style={[
          styles.filterButtonText,
          filter === value && styles.filterButtonTextActive
        ]}
      >
        {label} {count !== undefined && `(${count})`}
      </Text>
    </TouchableOpacity>
  );

  const AppointmentItem = ({ item }) => {
    const patientName = item.patientId?.personalInfo 
      ? `${item.patientId.personalInfo.firstName} ${item.patientId.personalInfo.lastName}`
      : item.patientId?.email || item.patient?.email || 'N/A';
    
    const doctorName = item.doctorId?.personalInfo
      ? `${item.doctorId.personalInfo.firstName} ${item.doctorId.personalInfo.lastName}`
      : item.doctorId?.email || item.doctor?.email || 'N/A';

    const appointmentDate = new Date(item.appointmentDate || item.scheduledTime || item.date);
    const isToday = appointmentDate.toDateString() === new Date().toDateString();

    return (
      <TouchableOpacity
        onPress={() => {
          setSelectedAppointment(item);
          setShowDetailModal(true);
        }}
      >
        <Card style={[styles.appointmentCard, isToday && styles.todayCard]}>
          <Card.Content>
            {isToday && (
              <View style={styles.todayBadge}>
                <MaterialIcons name="today" size={14} color="#fff" />
                <Text style={styles.todayText}>Hôm nay</Text>
              </View>
            )}
            
            <View style={styles.appointmentHeader}>
              <View style={styles.appointmentInfo}>
                <Text style={styles.patientName}>{patientName}</Text>
                <View style={styles.doctorRow}>
                  <MaterialIcons name="medical-services" size={14} color="#666" />
                  <Text style={styles.doctorName}>{doctorName}</Text>
                </View>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
              </View>
            </View>

            <View style={styles.appointmentDetails}>
              <View style={styles.detailItem}>
                <MaterialIcons name="event" size={16} color="#666" />
                <Text style={styles.detailText}>
                  {appointmentDate.toLocaleDateString('vi-VN')}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <MaterialIcons name="access-time" size={16} color="#666" />
                <Text style={styles.detailText}>
                  {appointmentDate.toLocaleTimeString('vi-VN', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </Text>
              </View>
              {item.type && (
                <View style={styles.detailItem}>
                  <MaterialIcons name="category" size={16} color="#666" />
                  <Text style={styles.detailText}>{item.type}</Text>
                </View>
              )}
            </View>

            {item.reason && (
              <View style={styles.reasonContainer}>
                <Text style={styles.reasonLabel}>Lý do:</Text>
                <Text style={styles.reasonText} numberOfLines={2}>{item.reason}</Text>
              </View>
            )}
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={28} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Quản Lý Lịch Hẹn</Text>
        <TouchableOpacity onPress={onRefresh}>
          <MaterialIcons name="refresh" size={28} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
        <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
          <Text style={[styles.statValue, { color: '#2196F3' }]}>{stats.total}</Text>
          <Text style={styles.statLabel}>Tổng</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FFF8E1' }]}>
          <Text style={[styles.statValue, { color: '#FF9800' }]}>{stats.today}</Text>
          <Text style={styles.statLabel}>Hôm nay</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
          <Text style={[styles.statValue, { color: '#FF9800' }]}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Chờ duyệt</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
          <Text style={[styles.statValue, { color: '#4CAF50' }]}>{stats.confirmed}</Text>
          <Text style={styles.statLabel}>Đã xác nhận</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FFEBEE' }]}>
          <Text style={[styles.statValue, { color: '#F44336' }]}>{stats.cancelled}</Text>
          <Text style={styles.statLabel}>Đã hủy</Text>
        </View>
      </ScrollView>

      {/* Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        <FilterButton label="Tất cả" value="all" />
        <FilterButton label="Hôm nay" value="today" count={stats.today} />
        <FilterButton label="Chờ duyệt" value="pending" count={stats.pending} />
        <FilterButton label="Đã xác nhận" value="confirmed" count={stats.confirmed} />
        <FilterButton label="Hoàn thành" value="completed" />
        <FilterButton label="Đã hủy" value="cancelled" />
      </ScrollView>

      {loading && !refreshing ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      ) : (
        <FlatList
          data={appointments}
          renderItem={({ item }) => <AppointmentItem item={item} />}
          keyExtractor={(item) => item.appointmentId || item._id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="event-busy" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Không có lịch hẹn</Text>
            </View>
          )}
        />
      )}

      {/* Detail Modal */}
      <Modal visible={showDetailModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi Tiết Lịch Hẹn</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <MaterialIcons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedAppointment && (
              <ScrollView style={styles.modalBody}>
                {/* Status */}
                <View style={styles.statusSection}>
                  <View style={[styles.bigStatusBadge, { backgroundColor: getStatusColor(selectedAppointment.status) }]}>
                    <Text style={styles.bigStatusText}>{getStatusText(selectedAppointment.status)}</Text>
                  </View>
                </View>

                {/* Patient Info */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>
                    <MaterialIcons name="person" size={16} color="#2196F3" /> Bệnh Nhân
                  </Text>
                  <Text style={styles.sectionValue}>
                    {selectedAppointment.patientId?.personalInfo
                      ? `${selectedAppointment.patientId.personalInfo.firstName} ${selectedAppointment.patientId.personalInfo.lastName}`
                      : selectedAppointment.patientId?.email || selectedAppointment.patient?.email || 'N/A'}
                  </Text>
                  {(selectedAppointment.patientId?.personalInfo?.phone || selectedAppointment.patientId?.phone) && (
                    <Text style={styles.sectionSubValue}>
                      📞 {selectedAppointment.patientId?.personalInfo?.phone || selectedAppointment.patientId?.phone}
                    </Text>
                  )}
                </View>

                {/* Doctor Info */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>
                    <MaterialIcons name="medical-services" size={16} color="#4CAF50" /> Bác Sĩ
                  </Text>
                  <Text style={styles.sectionValue}>
                    {selectedAppointment.doctorId?.personalInfo
                      ? `${selectedAppointment.doctorId.personalInfo.firstName} ${selectedAppointment.doctorId.personalInfo.lastName}`
                      : selectedAppointment.doctorId?.email || selectedAppointment.doctor?.email || 'N/A'}
                  </Text>
                </View>

                {/* Time Info */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>
                    <MaterialIcons name="schedule" size={16} color="#FF9800" /> Thời Gian
                  </Text>
                  <Text style={styles.sectionValue}>
                    {new Date(selectedAppointment.appointmentDate || selectedAppointment.scheduledTime || selectedAppointment.date).toLocaleString('vi-VN')}
                  </Text>
                </View>

                {/* Reason */}
                {selectedAppointment.reason && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>
                      <MaterialIcons name="description" size={16} color="#9C27B0" /> Lý Do Khám
                    </Text>
                    <Text style={styles.sectionValue}>{selectedAppointment.reason}</Text>
                  </View>
                )}

                {/* Notes */}
                {selectedAppointment.notes && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>
                      <MaterialIcons name="note" size={16} color="#795548" /> Ghi Chú
                    </Text>
                    <Text style={styles.sectionValue}>{selectedAppointment.notes}</Text>
                  </View>
                )}

                {/* Actions */}
                <View style={styles.actionsContainer}>
                  {(selectedAppointment.status === 'PENDING' || selectedAppointment.status === 'SCHEDULED') && (
                    <>
                      <Button
                        mode="contained"
                        onPress={() => handleConfirmAppointment(selectedAppointment.appointmentId || selectedAppointment._id)}
                        style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
                        loading={actionLoading}
                      >
                        ✓ Xác Nhận
                      </Button>
                      <Button
                        mode="outlined"
                        onPress={() => handleCancelAppointment(selectedAppointment.appointmentId || selectedAppointment._id)}
                        style={styles.cancelButton}
                        loading={actionLoading}
                      >
                        Hủy Lịch Hẹn
                      </Button>
                    </>
                  )}
                  {selectedAppointment.status === 'CONFIRMED' && (
                    <>
                      <Button
                        mode="contained"
                        onPress={() => handleCompleteAppointment(selectedAppointment.appointmentId || selectedAppointment._id)}
                        style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
                        loading={actionLoading}
                      >
                        ✓ Hoàn Thành
                      </Button>
                      <Button
                        mode="outlined"
                        onPress={() => handleMarkNoShow(selectedAppointment.appointmentId || selectedAppointment._id)}
                        style={styles.noShowButton}
                        loading={actionLoading}
                      >
                        Đánh Dấu Không Đến
                      </Button>
                      <Button
                        mode="outlined"
                        onPress={() => handleCancelAppointment(selectedAppointment.appointmentId || selectedAppointment._id)}
                        style={styles.cancelButton}
                        loading={actionLoading}
                      >
                        Hủy Lịch Hẹn
                      </Button>
                    </>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Loading Overlay */}
      {actionLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
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
  statsScroll: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  statCard: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 6,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 80
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold'
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 4
  },
  filterButtonActive: {
    backgroundColor: '#FF9800'
  },
  filterButtonText: {
    fontSize: 12,
    color: '#666'
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: '600'
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    color: '#666'
  },
  listContent: {
    padding: 12
  },
  appointmentCard: {
    marginBottom: 12,
    borderRadius: 12
  },
  todayCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800'
  },
  todayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8
  },
  todayText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  appointmentInfo: {
    flex: 1
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  doctorName: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600'
  },
  appointmentDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4
  },
  detailText: {
    marginLeft: 4,
    fontSize: 13,
    color: '#666'
  },
  reasonContainer: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8
  },
  reasonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666'
  },
  reasonText: {
    fontSize: 13,
    color: '#333',
    marginTop: 4
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
    marginTop: 12
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  modalBody: {
    padding: 16
  },
  statusSection: {
    alignItems: 'center',
    marginBottom: 20
  },
  bigStatusBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20
  },
  bigStatusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  detailSection: {
    marginBottom: 16,
    padding: 14,
    backgroundColor: '#f9f9f9',
    borderRadius: 10
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6
  },
  sectionValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500'
  },
  sectionSubValue: {
    fontSize: 13,
    color: '#666',
    marginTop: 4
  },
  actionsContainer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },
  actionButton: {
    marginBottom: 10
  },
  cancelButton: {
    borderColor: '#F44336',
    marginBottom: 10
  },
  noShowButton: {
    borderColor: '#9E9E9E',
    marginBottom: 10
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  }
});

export default AppointmentManagementScreen;
