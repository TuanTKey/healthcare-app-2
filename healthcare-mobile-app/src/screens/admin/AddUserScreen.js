import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';

const ROLES = [
  { value: 'PATIENT', label: 'Bệnh nhân', icon: 'person', color: '#4caf50' },
  { value: 'DOCTOR', label: 'Bác sĩ', icon: 'medical-services', color: '#2196f3' },
  { value: 'NURSE', label: 'Y tá', icon: 'healing', color: '#9c27b0' },
  { value: 'RECEPTIONIST', label: 'Lễ tân', icon: 'support-agent', color: '#ff9800' },
  { value: 'PHARMACIST', label: 'Dược sĩ', icon: 'medication', color: '#00bcd4' },
  { value: 'LAB_TECHNICIAN', label: 'KTV Xét nghiệm', icon: 'biotech', color: '#795548' },
  { value: 'BILLING_STAFF', label: 'NV Kế toán', icon: 'receipt', color: '#607d8b' },
  { value: 'DEPARTMENT_HEAD', label: 'Trưởng khoa', icon: 'admin-panel-settings', color: '#e91e63' },
  { value: 'HOSPITAL_ADMIN', label: 'Quản trị BV', icon: 'business', color: '#673ab7' },
];

// Roles that require professional info
const PROFESSIONAL_ROLES = ['DOCTOR', 'NURSE', 'PHARMACIST', 'LAB_TECHNICIAN'];

const AddUserScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'PATIENT',
    firstName: '',
    lastName: '',
    phone: '',
    dateOfBirth: null,
    gender: 'MALE',
    // Professional info for DOCTOR, NURSE, PHARMACIST, LAB_TECHNICIAN
    licenseNumber: '',
    specialization: '',
    department: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.email.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập email');
      return false;
    }
    if (!formData.email.includes('@')) {
      Alert.alert('Lỗi', 'Email không hợp lệ');
      return false;
    }
    if (!formData.password || formData.password.length < 8) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 8 ký tự');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
      return false;
    }
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập họ và tên');
      return false;
    }
    if (!formData.dateOfBirth) {
      Alert.alert('Lỗi', 'Vui lòng chọn ngày sinh');
      return false;
    }
    if (!formData.gender) {
      Alert.alert('Lỗi', 'Vui lòng chọn giới tính');
      return false;
    }
    // Validate professional info for medical staff
    if (PROFESSIONAL_ROLES.includes(formData.role)) {
      if (!formData.licenseNumber.trim()) {
        Alert.alert('Lỗi', 'Vui lòng nhập số giấy phép hành nghề');
        return false;
      }
      if (!formData.specialization.trim()) {
        Alert.alert('Lỗi', 'Vui lòng nhập chuyên khoa');
        return false;
      }
      if (!formData.department.trim()) {
        Alert.alert('Lỗi', 'Vui lòng nhập khoa/phòng làm việc');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      const payload = {
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        role: formData.role,
        personalInfo: {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: formData.phone.trim(),
          dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString() : null,
          gender: formData.gender
        }
      };

      // Add professional info for medical staff
      if (PROFESSIONAL_ROLES.includes(formData.role)) {
        payload.professionalInfo = {
          licenseNumber: formData.licenseNumber.trim(),
          specialization: formData.specialization.trim(),
          department: formData.department.trim()
        };
      }

      console.log('Creating user with payload:', payload);
      const response = await api.post('/users', payload);
      console.log('Create user response:', response.data);
      
      if (response.data.success) {
        Alert.alert(
          'Thành công',
          `Đã tạo tài khoản ${ROLES.find(r => r.value === formData.role)?.label || formData.role} thành công!`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      }
    } catch (error) {
      console.error('Create user error:', error.response?.data || error);
      
      // Xử lý các loại lỗi khác nhau
      let errorMessage = 'Không thể tạo tài khoản. Vui lòng thử lại.';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      // Lỗi cụ thể
      if (errorMessage.includes('Email đã') || errorMessage.includes('email')) {
        errorMessage = 'Email này đã được sử dụng. Vui lòng dùng email khác.';
      }
      
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const RoleSelector = () => (
    <View style={styles.roleSection}>
      <Text style={styles.label}>Vai trò *</Text>
      <View style={styles.roleGrid}>
        {ROLES.map((role) => (
          <TouchableOpacity
            key={role.value}
            style={[
              styles.roleItem,
              formData.role === role.value && styles.roleItemSelected,
              formData.role === role.value && { borderColor: role.color }
            ]}
            onPress={() => handleChange('role', role.value)}
          >
            <View style={[styles.roleIcon, { backgroundColor: role.color + '20' }]}>
              <MaterialIcons name={role.icon} size={24} color={role.color} />
            </View>
            <Text style={[
              styles.roleLabel,
              formData.role === role.value && { color: role.color, fontWeight: '600' }
            ]}>
              {role.label}
            </Text>
            {formData.role === role.value && (
              <MaterialIcons name="check-circle" size={18} color={role.color} style={styles.checkIcon} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thêm Người Dùng Mới</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Role Selection */}
        <RoleSelector />

        {/* Form Fields */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Thông tin tài khoản</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email *</Text>
            <View style={styles.inputContainer}>
              <MaterialIcons name="email" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="example@email.com"
                value={formData.email}
                onChangeText={(text) => handleChange('email', text)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mật khẩu *</Text>
            <View style={styles.inputContainer}>
              <MaterialIcons name="lock" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Ít nhất 8 ký tự"
                value={formData.password}
                onChangeText={(text) => handleChange('password', text)}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <MaterialIcons 
                  name={showPassword ? 'visibility' : 'visibility-off'} 
                  size={20} 
                  color="#666" 
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Xác nhận mật khẩu *</Text>
            <View style={styles.inputContainer}>
              <MaterialIcons name="lock-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nhập lại mật khẩu"
                value={formData.confirmPassword}
                onChangeText={(text) => handleChange('confirmPassword', text)}
                secureTextEntry={!showPassword}
              />
            </View>
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
          
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Họ *</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Nguyễn"
                  value={formData.lastName}
                  onChangeText={(text) => handleChange('lastName', text)}
                />
              </View>
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Tên *</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Văn A"
                  value={formData.firstName}
                  onChangeText={(text) => handleChange('firstName', text)}
                />
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Số điện thoại</Text>
            <View style={styles.inputContainer}>
              <MaterialIcons name="phone" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="0901234567"
                value={formData.phone}
                onChangeText={(text) => handleChange('phone', text)}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ngày sinh *</Text>
            <TouchableOpacity 
              style={styles.inputContainer}
              onPress={() => setShowDatePicker(true)}
            >
              <MaterialIcons name="calendar-today" size={20} color="#666" style={styles.inputIcon} />
              <Text style={[styles.input, { color: formData.dateOfBirth ? '#333' : '#999' }]}>
                {formData.dateOfBirth 
                  ? formData.dateOfBirth.toLocaleDateString('vi-VN')
                  : 'Chọn ngày sinh'}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={formData.dateOfBirth || new Date(2000, 0, 1)}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (selectedDate) {
                    handleChange('dateOfBirth', selectedDate);
                  }
                }}
              />
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Giới tính *</Text>
            <View style={styles.genderContainer}>
              {[{value: 'MALE', label: 'Nam'}, {value: 'FEMALE', label: 'Nữ'}, {value: 'OTHER', label: 'Khác'}].map((gender) => (
                <TouchableOpacity
                  key={gender.value}
                  style={[
                    styles.genderButton,
                    formData.gender === gender.value && styles.genderButtonActive
                  ]}
                  onPress={() => handleChange('gender', gender.value)}
                >
                  <Text style={[
                    styles.genderButtonText,
                    formData.gender === gender.value && styles.genderButtonTextActive
                  ]}>
                    {gender.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Professional Info for DOCTOR, NURSE, PHARMACIST, LAB_TECHNICIAN */}
        {PROFESSIONAL_ROLES.includes(formData.role) && (
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Thông tin chuyên môn</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Số giấy phép hành nghề *</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="badge" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="VD: GP-12345"
                  value={formData.licenseNumber}
                  onChangeText={(text) => handleChange('licenseNumber', text)}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Chuyên khoa *</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="local-hospital" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="VD: Nội khoa, Tim mạch, Nhi khoa..."
                  value={formData.specialization}
                  onChangeText={(text) => handleChange('specialization', text)}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Khoa/Phòng làm việc *</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="business" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="VD: Khoa Nội, Khoa Ngoại..."
                  value={formData.department}
                  onChangeText={(text) => handleChange('department', text)}
                />
              </View>
            </View>
          </View>
        )}

        {/* Submit Button */
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialIcons name="person-add" size={22} color="#fff" />
              <Text style={styles.submitButtonText}>Tạo Tài Khoản</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </KeyboardAvoidingView>
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
    borderBottomColor: '#e0e0e0'
  },
  backButton: {
    padding: 8
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333'
  },
  headerRight: {
    width: 40
  },
  content: {
    flex: 1,
    padding: 16
  },
  roleSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8
  },
  roleItem: {
    width: '31%',
    alignItems: 'center',
    padding: 12,
    marginRight: '2%',
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fafafa'
  },
  roleItemSelected: {
    backgroundColor: '#fff',
    borderWidth: 2
  },
  roleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  roleLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center'
  },
  checkIcon: {
    position: 'absolute',
    top: 4,
    right: 4
  },
  formSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16
  },
  inputGroup: {
    marginBottom: 16
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 12,
    height: 48
  },
  inputIcon: {
    marginRight: 10
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#333'
  },
  row: {
    flexDirection: 'row'
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a237e',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8
  },
  submitButtonDisabled: {
    opacity: 0.7
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  },
  bottomSpacing: {
    height: 30
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 10
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
    alignItems: 'center'
  },
  genderButtonActive: {
    backgroundColor: '#e3f2fd',
    borderColor: '#1a237e'
  },
  genderButtonText: {
    fontSize: 14,
    color: '#666'
  },
  genderButtonTextActive: {
    color: '#1a237e',
    fontWeight: '600'
  }
});

export default AddUserScreen;
