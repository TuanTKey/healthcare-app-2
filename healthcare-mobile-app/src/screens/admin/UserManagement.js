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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');
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

  // All available roles with config
  const ALL_ROLES = [
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

  const ROLE_CONFIG = ALL_ROLES.reduce((acc, role) => {
    acc[role.value] = role;
    return acc;
  }, {});

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // Lấy tất cả users (không filter status, limit lớn)
      const response = await api.get('/users?limit=1000&status=all');
      const userData = response.data.data || [];
      // Filter out deleted users
      setUsers(userData.filter(u => !u.isDeleted));
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tải danh sách users: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredUsers = () => {
    let filtered = users;
    
    // Filter by role
    if (selectedRoleFilter !== 'ALL') {
      filtered = filtered.filter(u => u.role === selectedRoleFilter);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(u => 
        u.email?.toLowerCase().includes(query) ||
        u.personalInfo?.firstName?.toLowerCase().includes(query) ||
        u.personalInfo?.lastName?.toLowerCase().includes(query) ||
        u.personalInfo?.phone?.includes(query)
      );
    }
    
    return filtered;
  };

  const getUserCountByRole = (role) => {
    if (role === 'ALL') return users.length;
    return users.filter(u => u.role === role).length;
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return '#4caf50';
      case 'INACTIVE': return '#ff9800';
      case 'SUSPENDED': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'ACTIVE': return 'Hoạt động';
      case 'INACTIVE': return 'Tạm nghỉ';
      case 'SUSPENDED': return 'Đình chỉ';
      default: return status || 'N/A';
    }
  };

  const filteredUsers = getFilteredUsers();

  const UserItem = ({ item }) => {
    const roleConfig = ROLE_CONFIG[item.role] || { label: item.role, icon: 'person', color: '#666' };
    const fullName = item.personalInfo?.firstName && item.personalInfo?.lastName
      ? `${item.personalInfo.lastName} ${item.personalInfo.firstName}`
      : null;

    return (
      <Card style={styles.userCard}>
        <Card.Content>
          <View style={styles.userHeader}>
            <View style={[styles.userAvatar, { backgroundColor: roleConfig.color + '20' }]}>
              <MaterialIcons name={roleConfig.icon} size={24} color={roleConfig.color} />
            </View>
            <View style={styles.userInfo}>
              {fullName && <Text style={styles.userFullName}>{fullName}</Text>}
              <Text style={styles.userName}>{item.email}</Text>
              <View style={styles.userMeta}>
                <View style={[styles.roleBadge, { backgroundColor: roleConfig.color + '15' }]}>
                  <Text style={[styles.roleBadgeText, { color: roleConfig.color }]}>
                    {roleConfig.label}
                  </Text>
                </View>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
                <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => handleDeleteUser(item._id)}
            >
              <MaterialIcons name="delete-outline" size={22} color="#f44336" />
            </TouchableOpacity>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const RoleFilterChip = ({ role, label, icon, color, count }) => (
    <TouchableOpacity
      style={[
        styles.filterChip,
        selectedRoleFilter === role && styles.filterChipActive,
        selectedRoleFilter === role && { backgroundColor: color || '#1a237e' }
      ]}
      onPress={() => setSelectedRoleFilter(role)}
    >
      {icon && (
        <MaterialIcons 
          name={icon} 
          size={16} 
          color={selectedRoleFilter === role ? '#fff' : color || '#666'} 
        />
      )}
      <Text style={[
        styles.filterChipText,
        selectedRoleFilter === role && styles.filterChipTextActive
      ]}>
        {label} ({count})
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={28} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Quản Lý Users</Text>
        <TouchableOpacity onPress={() => setShowCreateModal(true)}>
          <MaterialIcons name="person-add" size={28} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={22} color="#666" />
        <RNTextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm theo tên, email, SĐT..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialIcons name="close" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Role Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        <RoleFilterChip 
          role="ALL" 
          label="Tất cả" 
          count={getUserCountByRole('ALL')} 
        />
        {ALL_ROLES.map(role => (
          <RoleFilterChip
            key={role.value}
            role={role.value}
            label={role.label}
            icon={role.icon}
            color={role.color}
            count={getUserCountByRole(role.value)}
          />
        ))}
      </ScrollView>

      {loading && !refreshing ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={({ item }) => <UserItem item={item} />}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={() => (
            <Text style={styles.resultCount}>{filteredUsers.length} người dùng</Text>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="people-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Không có users</Text>
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
                <View style={styles.roleGrid}>
                  {ALL_ROLES.map((role) => (
                    <TouchableOpacity
                      key={role.value}
                      style={[
                        styles.roleButton,
                        formData.role === role.value && styles.roleButtonActive,
                        formData.role === role.value && { borderColor: role.color }
                      ]}
                      onPress={() => setFormData({ ...formData, role: role.value })}
                    >
                      <MaterialIcons name={role.icon} size={20} color={formData.role === role.value ? role.color : '#666'} />
                      <Text
                        style={[
                          styles.roleButtonText,
                          formData.role === role.value && { color: role.color, fontWeight: 'bold' }
                        ]}
                      >
                        {role.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    height: 44,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#333'
  },
  filterContainer: {
    maxHeight: 50,
    marginTop: 12
  },
  filterContent: {
    paddingHorizontal: 16
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  filterChipActive: {
    borderColor: 'transparent'
  },
  filterChipText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '500'
  },
  resultCount: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  listContent: {
    padding: 16
  },
  userCard: {
    marginBottom: 10,
    borderRadius: 12
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  userInfo: {
    flex: 1
  },
  userFullName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333'
  },
  userName: {
    fontSize: 13,
    color: '#666'
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '500'
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 10
  },
  statusText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 4
  },
  deleteButton: {
    padding: 8
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16
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
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
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
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f9f9f9',
    minWidth: '48%',
    gap: 8
  },
  roleButtonActive: {
    backgroundColor: '#E3F2FD'
  },
  roleButtonText: {
    fontSize: 13,
    color: '#666'
  },
  roleButtonTextActive: {
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
