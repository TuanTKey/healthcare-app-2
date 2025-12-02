import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../services/api';

const DoctorAppointmentDetail = ({ navigation, route }) => {
  const { appointmentId, appointment: initialAppointment } = route.params || {};
  
  // Lấy ID từ appointmentId hoặc từ object appointment
  const id = appointmentId || initialAppointment?._id;
  
  const [appointment, setAppointment] = useState(initialAppointment || null);
  const [loading, setLoading] = useState(!initialAppointment);
  const [updating, setUpdating] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notes, setNotes] = useState(initialAppointment?.notes || '');

  useEffect(() => {
    // Nếu có initialAppointment, set notes từ đó
    if (initialAppointment) {
      setNotes(initialAppointment.notes || '');
    }
    // Fetch nếu có ID và chưa có dữ liệu đầy đủ
    if (id && !initialAppointment) {
      fetchAppointment();
    }
  }, [id]);

  const fetchAppointment = async () => {
    try {
      setLoading(true);
      console.log('Fetching appointment with ID:', id);
      const response = await api.get(`/appointments/${id}`);
      if (response.data?.data) {
        setAppointment(response.data.data);
        setNotes(response.data.data.notes || '');
      }
    } catch (error) {
      console.error('Error fetching appointment:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin lịch hẹn');
    } finally {
      setLoading(false);
    }
  };

  const getPatientName = () => {
    if (!appointment) return 'Bệnh nhân';
    
    if (appointment.patientId?.personalInfo) {
      const info = appointment.patientId.personalInfo;
      return `${info.firstName || ''} ${info.lastName || ''}`.trim() || 'Bệnh nhân';
    }
    if (appointment.patient?.userId?.personalInfo) {
      const info = appointment.patient.userId.personalInfo;
      return `${info.firstName || ''} ${info.lastName || ''}`.trim() || 'Bệnh nhân';
    }
    if (appointment.patient?.personalInfo) {
      const info = appointment.patient.personalInfo;
      return `${info.firstName || ''} ${info.lastName || ''}`.trim() || 'Bệnh nhân';
    }
    return appointment.patientId?.email || 'Bệnh nhân';
  };

  const getPatientInfo = () => {
    if (!appointment) return {};
    
    const patientData = appointment.patientId || appointment.patient?.userId || appointment.patient;
    return {
      email: patientData?.email || 'Chưa cập nhật',
      phone: patientData?.personalInfo?.phone || patientData?.phone || 'Chưa cập nhật',
      gender: patientData?.personalInfo?.gender === 'MALE' ? 'Nam' : 
              patientData?.personalInfo?.gender === 'FEMALE' ? 'Nữ' : 'Khác',
      dateOfBirth: patientData?.personalInfo?.dateOfBirth 
        ? new Date(patientData.personalInfo.dateOfBirth).toLocaleDateString('vi-VN')
        : 'Chưa cập nhật'
    };
  };

  const getDoctorName = () => {
    if (!appointment?.doctorId?.personalInfo) return 'Bác sĩ';
    const info = appointment.doctorId.personalInfo;
    return `BS. ${info.firstName || ''} ${info.lastName || ''}`.trim();
  };

  const getStatusColor = (status) => {
    const colors = {
      'PENDING': '#FF9800',
      'SCHEDULED': '#FF9800',
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
      'SCHEDULED': 'Đã đặt lịch',
      'CONFIRMED': 'Đã xác nhận',
      'IN_PROGRESS': 'Đang khám',
      'COMPLETED': 'Hoàn thành',
      'CANCELLED': 'Đã hủy',
      'NO_SHOW': 'Vắng mặt'
    };
    return texts[status] || status;
  };

  const updateStatus = async (newStatus) => {
    try {
      setUpdating(true);
      // Sử dụng PUT /appointments/:id với body { status } 
      await api.put(`/appointments/${appointment._id}`, { status: newStatus });
      setAppointment({ ...appointment, status: newStatus });
      Alert.alert('Thành công', `Đã cập nhật trạng thái: ${getStatusText(newStatus)}`);
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Lỗi', error.response?.data?.error || 'Không thể cập nhật trạng thái');
    } finally {
      setUpdating(false);
    }
  };

  const saveNotes = async () => {
    try {
      setUpdating(true);
      await api.put(`/appointments/${appointment._id}`, { notes });
      setAppointment({ ...appointment, notes });
      setShowNotesModal(false);
      Alert.alert('Thành công', 'Đã lưu ghi chú');
    } catch (error) {
      console.error('Error saving notes:', error);
      Alert.alert('Lỗi', 'Không thể lưu ghi chú');
    } finally {
      setUpdating(false);
    }
  };

  const confirmCancel = () => {
    Alert.alert(
      'Xác nhận hủy',
      'Bạn có chắc chắn muốn hủy lịch hẹn này?',
      [
        { text: 'Không', style: 'cancel' },
        { text: 'Hủy lịch', style: 'destructive', onPress: () => updateStatus('CANCELLED') }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00796B" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  if (!appointment) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={64} color="#F44336" />
        <Text style={styles.errorText}>Không tìm thấy lịch hẹn</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const appointmentDate = new Date(appointment.appointmentDate || appointment.scheduledTime || appointment.date);
  const patientInfo = getPatientInfo();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi Tiết Lịch Hẹn</Text>
        <TouchableOpacity onPress={fetchAppointment}>
          <MaterialIcons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Status Card */}
        <View style={[styles.statusCard, { borderLeftColor: getStatusColor(appointment.status) }]}>
          <View style={styles.statusHeader}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) }]}>
              <Text style={styles.statusBadgeText}>{getStatusText(appointment.status)}</Text>
            </View>
            <Text style={styles.appointmentId}>#{appointment.appointmentId || appointment._id?.slice(-6)}</Text>
          </View>
          <View style={styles.dateTimeRow}>
            <MaterialIcons name="event" size={20} color="#00796B" />
            <Text style={styles.dateTimeText}>
              {appointmentDate.toLocaleDateString('vi-VN', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Text>
          </View>
          <View style={styles.dateTimeRow}>
            <MaterialIcons name="access-time" size={20} color="#00796B" />
            <Text style={styles.dateTimeText}>
              {appointmentDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              {appointment.duration && ` (${appointment.duration} phút)`}
            </Text>
          </View>
        </View>

        {/* Patient Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông Tin Bệnh Nhân</Text>
          <View style={styles.infoCard}>
            <View style={styles.patientHeader}>
              <View style={styles.avatarContainer}>
                <MaterialIcons name="person" size={32} color="#fff" />
              </View>
              <View style={styles.patientNameContainer}>
                <Text style={styles.patientName}>{getPatientName()}</Text>
                <Text style={styles.patientEmail}>{patientInfo.email}</Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <MaterialIcons name="phone" size={18} color="#666" />
              <Text style={styles.infoLabel}>Điện thoại:</Text>
              <Text style={styles.infoValue}>{patientInfo.phone}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <MaterialIcons name="wc" size={18} color="#666" />
              <Text style={styles.infoLabel}>Giới tính:</Text>
              <Text style={styles.infoValue}>{patientInfo.gender}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <MaterialIcons name="cake" size={18} color="#666" />
              <Text style={styles.infoLabel}>Ngày sinh:</Text>
              <Text style={styles.infoValue}>{patientInfo.dateOfBirth}</Text>
            </View>
          </View>
        </View>

        {/* Appointment Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chi Tiết Khám</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <MaterialIcons name="local-hospital" size={18} color="#666" />
              <Text style={styles.infoLabel}>Loại khám:</Text>
              <Text style={styles.infoValue}>{appointment.type || 'Khám tổng quát'}</Text>
            </View>
            
            {appointment.reason && (
              <View style={styles.reasonContainer}>
                <MaterialIcons name="description" size={18} color="#666" />
                <View style={styles.reasonContent}>
                  <Text style={styles.infoLabel}>Lý do khám:</Text>
                  <Text style={styles.reasonText}>{appointment.reason}</Text>
                </View>
              </View>
            )}

            {appointment.notes && (
              <View style={styles.reasonContainer}>
                <MaterialIcons name="note" size={18} color="#666" />
                <View style={styles.reasonContent}>
                  <Text style={styles.infoLabel}>Ghi chú:</Text>
                  <Text style={styles.reasonText}>{appointment.notes}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Doctor Info */}
        {appointment.doctorId && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bác Sĩ Phụ Trách</Text>
            <View style={styles.infoCard}>
              <View style={styles.doctorRow}>
                <View style={[styles.avatarContainer, { backgroundColor: '#00796B' }]}>
                  <MaterialIcons name="medical-services" size={24} color="#fff" />
                </View>
                <View>
                  <Text style={styles.doctorName}>{getDoctorName()}</Text>
                  <Text style={styles.doctorSpecialty}>
                    {appointment.doctorId?.professionalInfo?.specialization || 'Đa khoa'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity 
            style={styles.notesButton}
            onPress={() => {
              setNotes(appointment.notes || '');
              setShowNotesModal(true);
            }}
          >
            <MaterialIcons name="edit-note" size={20} color="#00796B" />
            <Text style={styles.notesButtonText}>Thêm ghi chú</Text>
          </TouchableOpacity>

          {appointment.status === 'PENDING' || appointment.status === 'SCHEDULED' ? (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.confirmButton]}
                onPress={() => updateStatus('CONFIRMED')}
                disabled={updating}
              >
                <MaterialIcons name="check" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Xác nhận</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={confirmCancel}
                disabled={updating}
              >
                <MaterialIcons name="close" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Hủy lịch</Text>
              </TouchableOpacity>
            </View>
          ) : appointment.status === 'CONFIRMED' ? (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.startButton]}
                onPress={() => updateStatus('IN_PROGRESS')}
                disabled={updating}
              >
                <MaterialIcons name="play-arrow" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Bắt đầu khám</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={confirmCancel}
                disabled={updating}
              >
                <MaterialIcons name="close" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Hủy</Text>
              </TouchableOpacity>
            </View>
          ) : appointment.status === 'IN_PROGRESS' ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton, { flex: 1 }]}
              onPress={() => updateStatus('COMPLETED')}
              disabled={updating}
            >
              <MaterialIcons name="done-all" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Hoàn thành khám</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('DoctorMedicalRecords', { patientId: appointment.patientId?._id })}
          >
            <MaterialIcons name="folder-shared" size={24} color="#00796B" />
            <Text style={styles.quickActionText}>Hồ sơ bệnh án</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('DoctorPrescriptions', { patientId: appointment.patientId?._id })}
          >
            <MaterialIcons name="receipt-long" size={24} color="#FF9800" />
            <Text style={styles.quickActionText}>Đơn thuốc</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('DoctorLabOrders', { patientId: appointment.patientId?._id })}
          >
            <MaterialIcons name="science" size={24} color="#9C27B0" />
            <Text style={styles.quickActionText}>Xét nghiệm</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Notes Modal */}
      <Modal visible={showNotesModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ghi chú lịch hẹn</Text>
              <TouchableOpacity onPress={() => setShowNotesModal(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.notesInput}
              placeholder="Nhập ghi chú..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowNotesModal(false)}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalSaveButton]}
                onPress={saveNotes}
                disabled={updating}
              >
                <Text style={styles.modalSaveText}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {updating && (
        <View style={styles.updatingOverlay}>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: '#666'
  },
  backButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#00796B',
    borderRadius: 8
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#00796B'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff'
  },
  content: {
    flex: 1
  },
  statusCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    elevation: 2
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  appointmentId: {
    fontSize: 12,
    color: '#999'
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8
  },
  dateTimeText: {
    marginLeft: 8,
    fontSize: 15,
    color: '#333'
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    elevation: 2
  },
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#00796B',
    justifyContent: 'center',
    alignItems: 'center'
  },
  patientNameContainer: {
    marginLeft: 12,
    flex: 1
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  patientEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  infoLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    width: 90
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontWeight: '500'
  },
  reasonContainer: {
    flexDirection: 'row',
    marginTop: 8
  },
  reasonContent: {
    flex: 1,
    marginLeft: 8
  },
  reasonText: {
    fontSize: 14,
    color: '#333',
    marginTop: 4,
    lineHeight: 20
  },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  doctorName: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  doctorSpecialty: {
    marginLeft: 12,
    fontSize: 14,
    color: '#666',
    marginTop: 2
  },
  actionsSection: {
    marginHorizontal: 16,
    marginBottom: 16
  },
  notesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00796B',
    marginBottom: 12
  },
  notesButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#00796B',
    fontWeight: '600'
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8
  },
  confirmButton: {
    backgroundColor: '#2196F3'
  },
  startButton: {
    backgroundColor: '#9C27B0'
  },
  completeButton: {
    backgroundColor: '#4CAF50'
  },
  cancelButton: {
    backgroundColor: '#F44336'
  },
  quickActions: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 32,
    gap: 12
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2
  },
  quickActionText: {
    marginTop: 8,
    fontSize: 12,
    color: '#333',
    textAlign: 'center'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '50%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
    backgroundColor: '#f9f9f9'
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center'
  },
  modalCancelButton: {
    backgroundColor: '#f0f0f0'
  },
  modalCancelText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600'
  },
  modalSaveButton: {
    backgroundColor: '#00796B'
  },
  modalSaveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  updatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  }
});

export default DoctorAppointmentDetail;
