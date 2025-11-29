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
  ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../services/api';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import TextInput from '../../components/common/TextInput';

const UserManagement = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    personalInfo: {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: 'MALE',
      phone: ''
    },
    role: 'PATIENT'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users?limit=10');
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
      const { email, password, personalInfo, role } = formData;
      if (!email || !password || !personalInfo.firstName || !personalInfo.lastName || !personalInfo.phone || !personalInfo.dateOfBirth) {
        Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
        return;
      }

      await api.post('/users', formData);
      Alert.alert('Thành công', 'Tạo user thành công');
      setShowCreateModal(false);
      setFormData({
        email: '',
        password: '',
        personalInfo: {
          firstName: '',
          lastName: '',
          dateOfBirth: '',
          gender: 'MALE',
          phone: ''
        },
        role: 'PATIENT'
      });
      fetchUsers();
    } catch (error) {
      Alert.alert('Lỗi', error.response?.data?.error || 'Không thể tạo user');
    }
  };

  const handleDeleteUser = async (userId) => {
    Alert.alert('Xóa User', 'Bạn có chắc chắn muốn xóa user này?', [
      { text: 'Hủy', onPress: () => {} },
      {
        text: 'Xóa',
        onPress: async () => {
          try {
            await api.delete(`/users/${userId}`);
            Alert.alert('Thành công', 'Xóa user thành công');
            fetchUsers();
          } catch (error) {
            Alert.alert('Lỗi', 'Không thể xóa user');
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
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
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
              <TextInput
                label="Ngày Sinh (YYYY-MM-DD)"
                value={formData.personalInfo.dateOfBirth}
                onChangeText={(text) => setFormData({
                  ...formData,
                  personalInfo: { ...formData.personalInfo, dateOfBirth: text }
                })}
                mode="outlined"
                style={styles.input}
                placeholder="1990-01-01"
              />
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
            </ScrollView>

            <View style={styles.buttonContainer}>
              <Button
                mode="outlined"
                onPress={() => setShowCreateModal(false)}
                style={styles.button}
              >
                Hủy
              </Button>
              <Button
                mode="contained"
                onPress={handleCreateUser}
                style={styles.button}
              >
                Tạo User
              </Button>
            </View>
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
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10
  },
  button: {
    flex: 1
  }
});

export default UserManagement;
