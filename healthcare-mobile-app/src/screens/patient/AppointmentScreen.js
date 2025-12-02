import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  FlatList,
  Modal,
  Text
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useForm, Controller } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../services/api';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import TextInput from '../../components/common/TextInput';
import DateTimePicker from '../../components/common/DateTimePicker';

const AppointmentScreen = ({ route }) => {
  const { user } = useSelector(state => state.auth);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'completed'
  
  // Date/Time picker states
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  const { control, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: {
      reason: '',
      description: '',
    }
  });

  // Check if navigated with specific tab
  useEffect(() => {
    if (route?.params?.tab) {
      setActiveTab(route.params.tab);
    }
  }, [route?.params?.tab]);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      if (user?._id) {
        console.log('📋 Fetching appointments for user:', user._id);
        const response = await api.get(`/appointments/patient/${user._id}`);
        console.log('📋 API Response:', response.data);
        // API returns: { data: { appointments: [...], pagination: {...} }, message, success }
        const appointmentsList = response.data.data?.appointments || response.data.data || response.data || [];
        console.log('📋 Appointments list:', appointmentsList);
        setAppointments(appointmentsList);
      }
    } catch (error) {
      console.error('Lỗi lấy lịch hẹn:', error);
      Alert.alert('Lỗi', 'Không thể tải lịch hẹn');
    } finally {
      setLoading(false);
    }
  };

  // Xử lý thay đổi ngày
  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  // Xử lý thay đổi giờ
  const handleTimeChange = (time) => {
    setSelectedTime(time);
  };

  // Format hiển thị ngày
  const formatDate = (date) => {
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // Format hiển thị giờ
  const formatTime = (time) => {
    return time.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const onSubmit = async (data) => {
    try {
      if (!user?._id) {
        Alert.alert('Lỗi', 'Vui lòng đăng nhập lại');
        return;
      }

      // Kết hợp ngày và giờ được chọn
      const appointmentDateTime = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        selectedTime.getHours(),
        selectedTime.getMinutes()
      );

      const appointmentData = {
        patientId: user._id,
        reason: data.reason,
        description: data.description,
        appointmentDate: appointmentDateTime.toISOString(),
      };

      console.log('📤 Gửi dữ liệu lịch hẹn:', appointmentData);
      const response = await api.post('/appointments', appointmentData);
      
      if (response.data.success) {
        Alert.alert('Thành công', 'Lịch hẹn đã được tạo');
        reset();
        setShowForm(false);
        setSelectedDate(new Date());
        setSelectedTime(new Date());
        fetchAppointments();
      }
    } catch (error) {
      console.error('Lỗi tạo lịch hẹn:', error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tạo lịch hẹn');
    }
  };

  const renderAppointmentCard = ({ item }) => {
    const getStatusDisplay = (status) => {
      switch (status) {
        case 'SCHEDULED':
          return '⏳ Đang chờ';
        case 'CONFIRMED':
          return '✅ Đã xác nhận';
        case 'IN_PROGRESS':
          return '🏥 Đang khám';
        case 'COMPLETED':
          return '✔️ Hoàn thành';
        case 'CANCELLED':
          return '❌ Đã hủy';
        case 'NO_SHOW':
          return '⚠️ Không đến';
        default:
          return status;
      }
    };

    return (
      <Card style={styles.appointmentCard}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{item.reason}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{getStatusDisplay(item.status)}</Text>
            </View>
          </View>
          <Text style={{marginVertical: 4}}>
            📅 Ngày: {new Date(item.appointmentDate).toLocaleDateString('vi-VN')}
          </Text>
          <Text style={{marginVertical: 4}}>
            🕐 Giờ: {new Date(item.appointmentDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {item.description && (
            <Text style={[styles.description, {marginVertical: 4}]}>
              📝 {item.description}
            </Text>
          )}
        </Card.Content>
      </Card>
    );
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
        return '#9E9E9E';
    }
  };

  // Filter appointments based on active tab
  const pendingAppointments = appointments.filter(apt => 
    apt.status !== 'COMPLETED' && apt.status !== 'CANCELLED'
  );
  const completedAppointments = appointments.filter(apt => 
    apt.status === 'COMPLETED'
  );
  const displayedAppointments = activeTab === 'pending' ? pendingAppointments : completedAppointments;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Lịch Hẹn Của Tôi</Text>
          {!showForm && (
            <Button
              title="+ Tạo Lịch Hẹn Mới"
              onPress={() => setShowForm(true)}
              style={styles.createButton}
            />
          )}
        </View>

        {/* Form - Only show if toggled */}
        {showForm && (
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Tạo Lịch Hẹn Mới</Text>

            <Controller
              control={control}
              rules={{ required: 'Lý do là bắt buộc' }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Lý do khám"
                  mode="outlined"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={!!errors.reason}
                  style={styles.input}
                  placeholder="Ví dụ: Khám bệnh, Tái khám..."
                />
              )}
              name="reason"
            />
            {errors.reason && <Text style={styles.errorText}>{errors.reason.message}</Text>}

            <Controller
              control={control}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Mô tả thêm (tùy chọn)"
                  mode="outlined"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  multiline
                  numberOfLines={4}
                  style={styles.input}
                  placeholder="Mô tả các triệu chứng hoặc vấn đề..."
                />
              )}
              name="description"
            />

            {/* Date Picker Button */}
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <MaterialIcons name="calendar-today" size={24} color="#1976d2" />
              <View style={styles.dateButtonContent}>
                <Text style={styles.dateButtonLabel}>Chọn Ngày</Text>
                <Text style={styles.dateButtonValue}>{formatDate(selectedDate)}</Text>
              </View>
            </TouchableOpacity>

            {/* Time Picker Button */}
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowTimePicker(true)}
            >
              <MaterialIcons name="schedule" size={24} color="#1976d2" />
              <View style={styles.dateButtonContent}>
                <Text style={styles.dateButtonLabel}>Chọn Giờ</Text>
                <Text style={styles.dateButtonValue}>{formatTime(selectedTime)}</Text>
              </View>
            </TouchableOpacity>

            {/* Date Picker Modal */}
            <DateTimePicker
              visible={showDatePicker}
              mode="date"
              title="Chọn Ngày"
              onConfirm={handleDateChange}
              onClose={() => setShowDatePicker(false)}
            />

            {/* Time Picker Modal */}
            <DateTimePicker
              visible={showTimePicker}
              mode="time"
              title="Chọn Giờ"
              onConfirm={handleTimeChange}
              onClose={() => setShowTimePicker(false)}
            />

            <View style={styles.buttonGroup}>
              <Button
                title="Tạo Lịch Hẹn"
                onPress={handleSubmit(onSubmit)}
                style={styles.submitButton}
              />
              <Button
                title="Hủy"
                onPress={() => {
                  setShowForm(false);
                  reset();
                  setSelectedDate(new Date());
                  setSelectedTime(new Date());
                }}
                style={styles.cancelButton}
              />
            </View>
          </View>
        )}

        {/* Appointments List - Always visible */}
        <View style={styles.appointmentsList}>
          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
              onPress={() => setActiveTab('pending')}
            >
              <MaterialIcons 
                name="event" 
                size={20} 
                color={activeTab === 'pending' ? '#1976d2' : '#666'} 
              />
              <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
                Chờ khám ({pendingAppointments.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
              onPress={() => setActiveTab('completed')}
            >
              <MaterialIcons 
                name="check-circle" 
                size={20} 
                color={activeTab === 'completed' ? '#4CAF50' : '#666'} 
              />
              <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
                Đã khám ({completedAppointments.length})
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <Text style={styles.emptyText}>Đang tải...</Text>
          ) : displayedAppointments.length > 0 ? (
            <FlatList
              data={displayedAppointments}
              renderItem={renderAppointmentCard}
              keyExtractor={(item) => item._id || Math.random().toString()}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialIcons 
                name={activeTab === 'pending' ? 'event-busy' : 'history'} 
                size={48} 
                color="#ccc" 
              />
              <Text style={styles.emptyText}>
                {activeTab === 'pending' 
                  ? 'Không có lịch hẹn nào đang chờ' 
                  : 'Chưa có lịch khám hoàn thành'}
              </Text>
            </View>
          )}
        </View>
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
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1976d2',
  },
  createButton: {
    marginBottom: 16,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  input: {
    marginBottom: 16,
  },
  dateButton: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1976d2',
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateButtonContent: {
    marginLeft: 12,
    flex: 1,
  },
  dateButtonLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  dateButtonValue: {
    fontSize: 16,
    color: '#1976d2',
    fontWeight: '600',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  submitButton: {
    flex: 1,
  },
  cancelButton: {
    flex: 1,
  },
  appointmentsList: {
    marginTop: 16,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  appointmentCard: {
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#1976d2',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  description: {
    marginTop: 8,
    color: '#666',
    fontStyle: 'italic',
  },
  separator: {
    height: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    marginTop: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#e3f2fd',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#1976d2',
    fontWeight: '600',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 12,
    marginBottom: 8,
  },
});

export default AppointmentScreen;