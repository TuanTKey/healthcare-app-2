import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../services/api';

const CreatePrescription = ({ navigation, route }) => {
  const { appointment, patientId, patientName } = route.params || {};
  
  const [loading, setLoading] = useState(false);
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [medications, setMedications] = useState([]);
  const [showAddMedModal, setShowAddMedModal] = useState(false);
  
  // New medication form
  const [newMed, setNewMed] = useState({
    name: '',
    dosage: '',
    frequency: '',
    duration: '',
    quantity: '',
    instructions: ''
  });

  // Common frequencies for quick selection
  const frequencies = [
    { label: 'Ngày 1 lần', value: '1 lần/ngày' },
    { label: 'Ngày 2 lần', value: '2 lần/ngày' },
    { label: 'Ngày 3 lần', value: '3 lần/ngày' },
    { label: 'Ngày 4 lần', value: '4 lần/ngày' },
    { label: 'Khi cần', value: 'Khi cần' }
  ];

  const addMedication = () => {
    if (!newMed.name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên thuốc');
      return;
    }
    if (!newMed.dosage.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập liều dùng');
      return;
    }

    setMedications([...medications, { ...newMed, id: Date.now() }]);
    setNewMed({
      name: '',
      dosage: '',
      frequency: '',
      duration: '',
      quantity: '',
      instructions: ''
    });
    setShowAddMedModal(false);
  };

  const removeMedication = (id) => {
    Alert.alert(
      'Xác nhận',
      'Bạn có chắc muốn xóa thuốc này?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: () => {
          setMedications(medications.filter(med => med.id !== id));
        }}
      ]
    );
  };

  const submitPrescription = async () => {
    if (!diagnosis.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập chẩn đoán');
      return;
    }
    if (medications.length === 0) {
      Alert.alert('Lỗi', 'Vui lòng thêm ít nhất một loại thuốc');
      return;
    }

    try {
      setLoading(true);

      const prescriptionData = {
        patientId: patientId,
        appointmentId: appointment?.appointmentId || appointment?._id,
        diagnosis: diagnosis,
        medications: medications.map(med => ({
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: med.duration,
          quantity: parseInt(med.quantity) || 0,
          instructions: med.instructions
        })),
        notes: notes,
        status: 'ACTIVE'
      };

      console.log('📝 Creating prescription:', prescriptionData);

      const response = await api.post('/prescriptions', prescriptionData);
      
      if (response.data?.success) {
        Alert.alert(
          'Thành công',
          'Đã kê đơn thuốc thành công',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        throw new Error(response.data?.message || 'Không thể tạo đơn thuốc');
      }
    } catch (error) {
      console.error('Error creating prescription:', error);
      Alert.alert('Lỗi', error.response?.data?.error || error.message || 'Không thể tạo đơn thuốc');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#00796B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kê Đơn Thuốc</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Patient Info Card */}
        <View style={styles.patientCard}>
          <View style={styles.patientHeader}>
            <View style={styles.avatarContainer}>
              <MaterialIcons name="person" size={28} color="#fff" />
            </View>
            <View style={styles.patientInfo}>
              <Text style={styles.patientName}>{patientName || 'Bệnh nhân'}</Text>
              {appointment?.appointmentId && (
                <Text style={styles.appointmentId}>
                  Lịch hẹn: #{appointment.appointmentId}
                </Text>
              )}
              {appointment?.reason && (
                <Text style={styles.reason}>Lý do: {appointment.reason}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Diagnosis */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <MaterialIcons name="medical-services" size={18} color="#00796B" /> Chẩn đoán *
          </Text>
          <TextInput
            style={styles.textInput}
            placeholder="Nhập chẩn đoán bệnh..."
            value={diagnosis}
            onChangeText={setDiagnosis}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Medications List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              <MaterialIcons name="medication" size={18} color="#FF9800" /> Danh sách thuốc ({medications.length})
            </Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowAddMedModal(true)}
            >
              <MaterialIcons name="add" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Thêm thuốc</Text>
            </TouchableOpacity>
          </View>

          {medications.length === 0 ? (
            <View style={styles.emptyMeds}>
              <MaterialIcons name="medication" size={48} color="#ccc" />
              <Text style={styles.emptyText}>Chưa có thuốc nào</Text>
              <Text style={styles.emptySubText}>Nhấn "Thêm thuốc" để bắt đầu kê đơn</Text>
            </View>
          ) : (
            medications.map((med, index) => (
              <View key={med.id} style={styles.medicationCard}>
                <View style={styles.medHeader}>
                  <View style={styles.medNumber}>
                    <Text style={styles.medNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.medName}>{med.name}</Text>
                  <TouchableOpacity onPress={() => removeMedication(med.id)}>
                    <MaterialIcons name="delete" size={22} color="#F44336" />
                  </TouchableOpacity>
                </View>
                <View style={styles.medDetails}>
                  <View style={styles.medRow}>
                    <MaterialIcons name="local-pharmacy" size={16} color="#666" />
                    <Text style={styles.medLabel}>Liều dùng:</Text>
                    <Text style={styles.medValue}>{med.dosage}</Text>
                  </View>
                  {med.frequency && (
                    <View style={styles.medRow}>
                      <MaterialIcons name="schedule" size={16} color="#666" />
                      <Text style={styles.medLabel}>Tần suất:</Text>
                      <Text style={styles.medValue}>{med.frequency}</Text>
                    </View>
                  )}
                  {med.duration && (
                    <View style={styles.medRow}>
                      <MaterialIcons name="date-range" size={16} color="#666" />
                      <Text style={styles.medLabel}>Thời gian:</Text>
                      <Text style={styles.medValue}>{med.duration}</Text>
                    </View>
                  )}
                  {med.quantity && (
                    <View style={styles.medRow}>
                      <MaterialIcons name="inventory" size={16} color="#666" />
                      <Text style={styles.medLabel}>Số lượng:</Text>
                      <Text style={styles.medValue}>{med.quantity}</Text>
                    </View>
                  )}
                  {med.instructions && (
                    <View style={styles.medRow}>
                      <MaterialIcons name="info" size={16} color="#666" />
                      <Text style={styles.medLabel}>Hướng dẫn:</Text>
                      <Text style={styles.medValue}>{med.instructions}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <MaterialIcons name="note" size={18} color="#666" /> Ghi chú thêm
          </Text>
          <TextInput
            style={styles.textInput}
            placeholder="Lưu ý cho bệnh nhân, nhà thuốc..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={submitPrescription}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialIcons name="check" size={24} color="#fff" />
              <Text style={styles.submitButtonText}>Hoàn thành kê đơn</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Medication Modal */}
      <Modal visible={showAddMedModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thêm thuốc</Text>
              <TouchableOpacity onPress={() => setShowAddMedModal(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Tên thuốc *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="VD: Paracetamol 500mg"
                value={newMed.name}
                onChangeText={(text) => setNewMed({ ...newMed, name: text })}
              />

              <Text style={styles.inputLabel}>Liều dùng *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="VD: 1 viên"
                value={newMed.dosage}
                onChangeText={(text) => setNewMed({ ...newMed, dosage: text })}
              />

              <Text style={styles.inputLabel}>Tần suất</Text>
              <View style={styles.frequencyContainer}>
                {frequencies.map((freq) => (
                  <TouchableOpacity
                    key={freq.value}
                    style={[
                      styles.frequencyButton,
                      newMed.frequency === freq.value && styles.frequencyButtonActive
                    ]}
                    onPress={() => setNewMed({ ...newMed, frequency: freq.value })}
                  >
                    <Text style={[
                      styles.frequencyText,
                      newMed.frequency === freq.value && styles.frequencyTextActive
                    ]}>
                      {freq.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Thời gian dùng</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="VD: 7 ngày, 2 tuần..."
                value={newMed.duration}
                onChangeText={(text) => setNewMed({ ...newMed, duration: text })}
              />

              <Text style={styles.inputLabel}>Số lượng</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="VD: 20"
                value={newMed.quantity}
                onChangeText={(text) => setNewMed({ ...newMed, quantity: text })}
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Hướng dẫn sử dụng</Text>
              <TextInput
                style={[styles.modalInput, { height: 80 }]}
                placeholder="VD: Uống sau ăn, không dùng với rượu..."
                value={newMed.instructions}
                onChangeText={(text) => setNewMed({ ...newMed, instructions: text })}
                multiline
              />

              <TouchableOpacity style={styles.addMedButton} onPress={addMedication}>
                <MaterialIcons name="add" size={20} color="#fff" />
                <Text style={styles.addMedButtonText}>Thêm vào đơn</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  content: {
    flex: 1
  },
  patientCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2
  },
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#00796B',
    justifyContent: 'center',
    alignItems: 'center'
  },
  patientInfo: {
    marginLeft: 12,
    flex: 1
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  appointmentId: {
    fontSize: 13,
    color: '#666',
    marginTop: 2
  },
  reason: {
    fontSize: 13,
    color: '#00796B',
    marginTop: 2
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20
  },
  addButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    textAlignVertical: 'top',
    minHeight: 80
  },
  emptyMeds: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12
  },
  emptySubText: {
    fontSize: 13,
    color: '#bbb',
    marginTop: 4
  },
  medicationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800'
  },
  medHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  medNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  medNumberText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12
  },
  medName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  medDetails: {
    marginLeft: 34
  },
  medRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  medLabel: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
    width: 80
  },
  medValue: {
    flex: 1,
    fontSize: 13,
    color: '#333'
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12
  },
  submitButtonDisabled: {
    backgroundColor: '#a5d6a7'
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8
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
    maxHeight: '85%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12
  },
  modalInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  frequencyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  frequencyButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff'
  },
  frequencyButtonActive: {
    backgroundColor: '#00796B',
    borderColor: '#00796B'
  },
  frequencyText: {
    fontSize: 13,
    color: '#666'
  },
  frequencyTextActive: {
    color: '#fff',
    fontWeight: '600'
  },
  addMedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00796B',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    marginBottom: 20
  },
  addMedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8
  }
});

export default CreatePrescription;
