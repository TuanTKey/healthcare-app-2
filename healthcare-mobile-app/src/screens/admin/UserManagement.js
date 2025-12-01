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
  TextInput as RNTextInput,
  Text,
  ActivityIndicator,
  Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../../services/api';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import TextInput from '../../components/common/TextInput';

const UserManagement = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    personalInfo: {
      firstName: '',
      lastName: '',
      dateOfBirth: null,
      gender: 'MALE',
      phone: ''
    },
    professionalInfo: {
      licenseNumber: '',
      specialization: '',
      department: ''
    },
    role: 'PATIENT'
  });

  // Roles that require professional info
  const PROFESSIONAL_ROLES = ['DOCTOR', 'NURSE', 'PHARMACIST', 'LAB_TECHNICIAN'];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // Lấy tất cả users (không filter status, limit lớn)
      const response = await api.get('/users?limit=100&status=all');
      setUsers(response.data.data || []);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tải danh sách users: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  const handleCreateUser = async () => {
    try {
      const { email, password, personalInfo, professionalInfo, role } = formData;
      
      // Validate all required fields
      if (!email || !password) {
        Alert.alert('Lỗi', 'Vui lòng nhập email và mật khẩu');
        return;
      }
      
      if (password.length < 8) {
        Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 8 ký tự');
        return;
      }
      
      if (!personalInfo.firstName || !personalInfo.lastName) {
        Alert.alert('Lỗi', 'Vui lòng nhập họ và tên');
        return;
      }
      
      if (!personalInfo.dateOfBirth) {
        Alert.alert('Lỗi', 'Vui lòng chọn ngày sinh');
        return;
      }
      
      if (!personalInfo.gender) {
        Alert.alert('Lỗi', 'Vui lòng chọn giới tính');
        return;
      }

      // Validate professional info for DOCTOR, NURSE, etc.
      if (PROFESSIONAL_ROLES.includes(role)) {
        if (!professionalInfo.licenseNumber || !professionalInfo.licenseNumber.trim()) {
          Alert.alert('Lỗi', 'Vui lòng nhập số giấy phép hành nghề');
          return;
        }
        if (!professionalInfo.specialization || !professionalInfo.specialization.trim()) {
          Alert.alert('Lỗi', 'Vui lòng nhập chuyên khoa');
          return;
        }
        if (!professionalInfo.department || !professionalInfo.department.trim()) {
          Alert.alert('Lỗi', 'Vui lòng nhập khoa/phòng làm việc');
          return;
        }
      }

      // Show loading
      setSubmitting(true);
      setLoadingMessage('Đang tạo user...');

      // Format date properly for backend
      const userData = {
        email: email.toLowerCase().trim(),
        password: password,
        role: role,
        personalInfo: {
          firstName: personalInfo.firstName.trim(),
          lastName: personalInfo.lastName.trim(),
          dateOfBirth: new Date(personalInfo.dateOfBirth).toISOString(),
          gender: personalInfo.gender,
          phone: personalInfo.phone?.trim() || ''
        }
      };

      // Add professional info for applicable roles
      if (PROFESSIONAL_ROLES.includes(role)) {
        userData.professionalInfo = {
          licenseNumber: professionalInfo.licenseNumber.trim(),
          specialization: professionalInfo.specialization.trim(),
          department: professionalInfo.department.trim()
        };
      }

      console.log('📤 Creating user with data:', JSON.stringify(userData, null, 2));

      await api.post('/users', userData);
      setSubmitting(false);
      Alert.alert('Thành công', 'Tạo user thành công');
      setShowCreateModal(false);
      setFormData({
        email: '',
        password: '',
        personalInfo: {
          firstName: '',
          lastName: '',
          dateOfBirth: null,
          gender: 'MALE',
          phone: ''
        },
        professionalInfo: {
          licenseNumber: '',
          specialization: '',
          department: ''
        },
        role: 'PATIENT'
      });
      fetchUsers();
    } catch (error) {
      setSubmitting(false);
      console.log('❌ Create user error:', error.response?.data || error.message);
      
      let errorMessage = 'Không thể tạo user';
      
      if (error.message === 'Network Error') {
        errorMessage = 'Lỗi kết nối mạng. Backend có thể đang khởi động lại, vui lòng thử lại sau 30 giây.';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.details) {
        errorMessage = error.response.data.details.join(', ');
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Lỗi', errorMessage);
    }
  };

  const handleDeleteUser = async (userId) => {
    Alert.alert('Xóa User', 'Bạn có chắc chắn muốn xóa user này?', [
      { text: 'Hủy', onPress: () => {} },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            setSubmitting(true);
            setLoadingMessage('Đang xóa user...');
            console.log('🗑️ Deleting user:', userId);
            await api.delete(`/users/${userId}`);
            setSubmitting(false);
            Alert.alert('Thành công', 'Xóa user thành công');
            fetchUsers();
          } catch (error) {
            setSubmitting(false);
            console.log('❌ Delete user error:', error.response?.data);
            const errorMessage = error.response?.data?.error || 
                                error.response?.data?.message ||
                                error.message || 
                                'Không thể xóa user';
            Alert.alert('Lỗi', errorMessage);
          }
        }
      }
    ]);
  };

  const UserItem = ({ item }) => (
    <Card style={styles.userCard}>
      <Card.Content>
        <View style={styles.userHeader}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.email}</Text>
            <Text style={styles.userRole}>{item.role}</Text>
          </View>
          <TouchableOpacity onPress={() => handleDeleteUser(item._id)}>
            <MaterialIcons name="delete" size={24} color="#F44336" />
          </TouchableOpacity>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={28} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Quản Lý Users</Text>
        <TouchableOpacity onPress={() => setShowCreateModal(true)}>
          <MaterialIcons name="add" size={28} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={({ item }) => <UserItem item={item} />}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={() => (
            <View style={styles.centerContent}>
              <Text>Không có users</Text>
            </View>
          )}
        />
      )}

      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={{fontSize: 18, fontWeight: 'bold'}}>Tạo User Mới</Text>
              <TouchableOpacity onPress={() => !submitting && setShowCreateModal(false)}>
                <MaterialIcons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>
            <View style={{height: 1, backgroundColor: '#ccc', marginVertical: 10}} />

            <ScrollView style={styles.formContainer}>
              <TextInput
                label="Email"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                mode="outlined"
                style={styles.input}
                keyboardType="email-address"
              />
              <TextInput
                label="Mật khẩu"
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                mode="outlined"
                style={styles.input}
                secureTextEntry
              />
              <TextInput
                label="Họ"
                value={formData.personalInfo.firstName}
                onChangeText={(text) => setFormData({
                  ...formData,
                  personalInfo: { ...formData.personalInfo, firstName: text }
                })}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Tên"
                value={formData.personalInfo.lastName}
                onChangeText={(text) => setFormData({
                  ...formData,
                  personalInfo: { ...formData.personalInfo, lastName: text }
                })}
                mode="outlined"
                style={styles.input}
              />
              
              {/* Date Picker for Date of Birth */}
              <Text style={styles.dateLabel}>Ngày Sinh:</Text>
              <TouchableOpacity 
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <MaterialIcons name="calendar-today" size={20} color="#666" />
                <Text style={styles.datePickerText}>
                  {formData.personalInfo.dateOfBirth 
                    ? formData.personalInfo.dateOfBirth.toLocaleDateString('vi-VN')
                    : 'Chọn ngày sinh'}
                </Text>
              </TouchableOpacity>
              
              {showDatePicker && (
                <DateTimePicker
                  value={formData.personalInfo.dateOfBirth || new Date(2000, 0, 1)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  maximumDate={new Date()}
                  minimumDate={new Date(1900, 0, 1)}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (selectedDate) {
                      setFormData({
                        ...formData,
                        personalInfo: { ...formData.personalInfo, dateOfBirth: selectedDate }
                      });
                    }
                  }}
                />
              )}
              
              <TextInput
                label="Số Điện Thoại"
                value={formData.personalInfo.phone}
                onChangeText={(text) => setFormData({
                  ...formData,
                  personalInfo: { ...formData.personalInfo, phone: text }
                })}
                mode="outlined"
                style={styles.input}
                keyboardType="phone-pad"
              />

              <View style={styles.genderContainer}>
                <Text style={styles.roleLabel}>Giới Tính:</Text>
                {['MALE', 'FEMALE', 'OTHER'].map((gender) => (
                  <TouchableOpacity
                    key={gender}
                    style={[
                      styles.roleButton,
                      formData.personalInfo.gender === gender && styles.roleButtonActive
                    ]}
                    onPress={() => setFormData({
                      ...formData,
                      personalInfo: { ...formData.personalInfo, gender }
                    })}
                  >
                    <Text
                      style={[
                        styles.roleButtonText,
                        formData.personalInfo.gender === gender && styles.roleButtonTextActive
                      ]}
                    >
                      {gender === 'MALE' ? 'Nam' : gender === 'FEMALE' ? 'Nữ' : 'Khác'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.roleContainer}>
                <Text style={styles.roleLabel}>Role:</Text>
                {['PATIENT', 'DOCTOR', 'NURSE', 'RECEPTIONIST'].map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[
                      styles.roleButton,
                      formData.role === role && styles.roleButtonActive
                    ]}
                    onPress={() => setFormData({ ...formData, role })}
                  >
                    <Text
                      style={[
                        styles.roleButtonText,
                        formData.role === role && styles.roleButtonTextActive
                      ]}
                    >
                      {role}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Professional Info for DOCTOR/NURSE */}
              {PROFESSIONAL_ROLES.includes(formData.role) && (
                <View style={styles.professionalInfoContainer}>
                  <Text style={styles.sectionTitle}>Thông Tin Chuyên Môn</Text>
                  <TextInput
                    label="Số Giấy Phép Hành Nghề *"
                    value={formData.professionalInfo.licenseNumber}
                    onChangeText={(text) => setFormData({
                      ...formData,
                      professionalInfo: { ...formData.professionalInfo, licenseNumber: text }
                    })}
                    mode="outlined"
                    style={styles.input}
                    placeholder="VD: GP-12345"
                  />
                  <TextInput
                    label="Chuyên Khoa *"
                    value={formData.professionalInfo.specialization}
                    onChangeText={(text) => setFormData({
                      ...formData,
                      professionalInfo: { ...formData.professionalInfo, specialization: text }
                    })}
                    mode="outlined"
                    style={styles.input}
                    placeholder="VD: Nội khoa, Tim mạch, Nhi khoa..."
                  />
                  <TextInput
                    label="Khoa/Phòng *"
                    value={formData.professionalInfo.department}
                    onChangeText={(text) => setFormData({
                      ...formData,
                      professionalInfo: { ...formData.professionalInfo, department: text }
                    })}
                    mode="outlined"
                    style={styles.input}
                    placeholder="VD: Khoa Nội, Khoa Ngoại, Phòng Xét nghiệm..."
                  />
                </View>
              )}
            </ScrollView>

            <View style={styles.buttonContainer}>
              <Button
                mode="outlined"
                onPress={() => setShowCreateModal(false)}
                style={styles.button}
                disabled={submitting}
              >
                Hủy
              </Button>
              <Button
                mode="contained"
                onPress={handleCreateUser}
                style={styles.button}
                disabled={submitting}
              >
                Tạo User
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Loading Overlay */}
      <Modal visible={submitting} transparent animationType="fade">
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>{loadingMessage}</Text>
            <Text style={styles.loadingSubText}>Vui lòng đợi...</Text>
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
  userCard: {
    marginBottom: 12,
    borderRadius: 8
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  userInfo: {
    flex: 1
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  userRole: {
    fontSize: 14,
    color: '#666',
    marginTop: 4
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
    maxHeight: '80%',
    paddingBottom: 16
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  formContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  input: {
    marginBottom: 12
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333'
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: '#fff'
  },
  datePickerText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333'
  },
  roleContainer: {
    marginTop: 12,
    marginBottom: 16
  },
  genderContainer: {
    marginTop: 12,
    marginBottom: 16
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333'
  },
  roleButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: '#f9f9f9'
  },
  roleButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD'
  },
  roleButtonText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center'
  },
  roleButtonTextActive: {
    color: '#007AFF',
    fontWeight: 'bold'
  },
  professionalInfoContainer: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 12
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10
  },
  button: {
    flex: 1
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  loadingSubText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666'
  }
});

export default UserManagement;
