import React from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { MaterialIcons } from '@expo/vector-icons';
import { logout } from '../../store/slices/authSlice';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';

const ProfileScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);

  const handleLogout = () => {
    dispatch(logout());
  };

  const getRoleText = (role) => {
    const roleMap = {
      'PATIENT': 'Bệnh nhân',
      'DOCTOR': 'Bác sĩ',
      'ADMIN': 'Quản trị viên',
      'NURSE': 'Điều dưỡng',
      'RECEPTIONIST': 'Lễ tân'
    };
    return roleMap[role] || role;
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header Section */}
      <Card style={styles.headerCard}>
        <Card.Content style={styles.headerContent}>
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.personalInfo?.firstName?.[0]}{user?.personalInfo?.lastName?.[0]}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text variant="headlineSmall" style={styles.userName}>
                {user?.personalInfo?.firstName} {user?.personalInfo?.lastName}
              </Text>
              <Text variant="bodyMedium" style={styles.userRole}>
                {getRoleText(user?.role)}
              </Text>
              <Text variant="bodySmall" style={styles.userEmail}>
                {user?.email}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Personal Information */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Thông tin cá nhân
          </Text>
          <View style={{height: 1, backgroundColor: '#ccc', marginVertical: 10}} />
          
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <MaterialIcons name="email" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text variant="bodySmall" style={styles.infoLabel}>
                  Email
                </Text>
                <Text variant="bodyMedium" style={styles.infoValue}>
                  {user?.email}
                </Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <MaterialIcons name="phone" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text variant="bodySmall" style={styles.infoLabel}>
                  Số điện thoại
                </Text>
                <Text variant="bodyMedium" style={styles.infoValue}>
                  {user?.personalInfo?.phone || 'Chưa cập nhật'}
                </Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <MaterialIcons name="person" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text variant="bodySmall" style={styles.infoLabel}>
                  Giới tính
                </Text>
                <Text variant="bodyMedium" style={styles.infoValue}>
                  {user?.personalInfo?.gender === 'MALE' ? 'Nam' : 
                   user?.personalInfo?.gender === 'FEMALE' ? 'Nữ' : 'Chưa cập nhật'}
                </Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <MaterialIcons name="cake" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text variant="bodySmall" style={styles.infoLabel}>
                  Ngày sinh
                </Text>
                <Text variant="bodyMedium" style={styles.infoValue}>
                  {user?.personalInfo?.dateOfBirth ? 
                   new Date(user.personalInfo.dateOfBirth).toLocaleDateString('vi-VN') : 
                   'Chưa cập nhật'}
                </Text>
              </View>
            </View>
          </View>

          <Button 
            mode="outlined" 
            style={styles.editButton}
            onPress={() => console.log('Edit profile')}
          >
            Chỉnh sửa thông tin
          </Button>
        </Card.Content>
      </Card>

      {/* Medical Information (for patients) */}
      {user?.role === 'PATIENT' && (
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Thông tin y tế
            </Text>
            <View style={{height: 1, backgroundColor: '#ccc', marginVertical: 10}} />
            
            <View style={styles.medicalInfo}>
              <View style={styles.medicalItem}>
                <Text variant="bodySmall" style={styles.medicalLabel}>
                  Mã bệnh nhân
                </Text>
                <Text variant="bodyMedium" style={styles.medicalValue}>
                  {user?.patientId || 'BN-' + user?._id?.slice(-6).toUpperCase()}
                </Text>
              </View>
              
              <View style={styles.medicalItem}>
                <Text variant="bodySmall" style={styles.medicalLabel}>
                  Nhóm máu
                </Text>
                <Text variant="bodyMedium" style={styles.medicalValue}>
                  {user?.medicalInfo?.bloodType || 'Chưa cập nhật'}
                </Text>
              </View>
              
              <View style={styles.medicalItem}>
                <Text variant="bodySmall" style={styles.medicalLabel}>
                  Dị ứng
                </Text>
                <Text variant="bodyMedium" style={styles.medicalValue}>
                  {user?.medicalInfo?.allergies?.length > 0 ? 
                   user.medicalInfo.allergies.join(', ') : 'Không có'}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Actions */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Tùy chọn
          </Text>
          <View style={{height: 1, backgroundColor: '#ccc', marginVertical: 10}} />

          <Button 
            mode="outlined" 
            style={styles.optionButton}
            icon="lock"
            onPress={() => console.log('Change password')}
          >
            Đổi mật khẩu
          </Button>

          <Button 
            mode="outlined" 
            style={styles.optionButton}
            icon="notifications"
            onPress={() => console.log('Notification settings')}
          >
            Cài đặt thông báo
          </Button>

          <Button 
            mode="outlined" 
            style={styles.optionButton}
            icon="help"
            onPress={() => console.log('Help & support')}
          >
            Trợ giúp & Hỗ trợ
          </Button>
        </Card.Content>
      </Card>

      {/* Logout Button */}
      <Button 
        mode="contained" 
        style={styles.logoutButton}
        buttonColor="#FF5252"
        onPress={handleLogout}
      >
        <MaterialIcons name="logout" size={20} color="white" />
        <Text style={styles.logoutText}> Đăng xuất</Text>
      </Button>

      <View style={styles.footer}>
        <Text variant="bodySmall" style={styles.versionText}>
          Phiên bản 1.0.0
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerCard: {
    margin: 16,
    marginTop: 8,
  },
  headerContent: {
    paddingVertical: 20,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1976d2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userRole: {
    color: '#1976d2',
    fontWeight: '500',
    marginBottom: 2,
  },
  userEmail: {
    color: '#666',
  },
  sectionCard: {
    margin: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  divider: {
    marginBottom: 16,
  },
  infoGrid: {
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    color: '#666',
    marginBottom: 2,
  },
  infoValue: {
    color: '#333',
    fontWeight: '500',
  },
  editButton: {
    marginTop: 8,
  },
  medicalInfo: {
    marginBottom: 16,
  },
  medicalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
  },
  medicalLabel: {
    color: '#666',
  },
  medicalValue: {
    fontWeight: '500',
    color: '#333',
  },
  optionButton: {
    marginBottom: 8,
  },
  logoutButton: {
    margin: 16,
    marginTop: 8,
    paddingVertical: 8,
  },
  logoutText: {
    color: 'white',
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    padding: 20,
  },
  versionText: {
    color: '#999',
  },
});

export default ProfileScreen;