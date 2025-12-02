import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';

const STAFF_ROLES = ['DOCTOR', 'NURSE', 'RECEPTIONIST', 'PHARMACIST', 'LAB_TECHNICIAN', 'BILLING_STAFF', 'DEPARTMENT_HEAD', 'HOSPITAL_ADMIN'];

const ROLE_CONFIG = {
  DOCTOR: { label: 'Bác sĩ', icon: 'medical-services', color: '#2196f3' },
  NURSE: { label: 'Y tá', icon: 'healing', color: '#9c27b0' },
  RECEPTIONIST: { label: 'Lễ tân', icon: 'support-agent', color: '#ff9800' },
  PHARMACIST: { label: 'Dược sĩ', icon: 'medication', color: '#00bcd4' },
  LAB_TECHNICIAN: { label: 'KTV Xét nghiệm', icon: 'biotech', color: '#795548' },
  BILLING_STAFF: { label: 'NV Kế toán', icon: 'receipt', color: '#607d8b' },
  DEPARTMENT_HEAD: { label: 'Trưởng khoa', icon: 'admin-panel-settings', color: '#e91e63' },
  HOSPITAL_ADMIN: { label: 'Quản trị BV', icon: 'business', color: '#673ab7' }
};

const StaffManagementScreen = () => {
  const navigation = useNavigation();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users?limit=1000');
      
      let users = [];
      if (response.data?.data?.users) {
        users = response.data.data.users;
      } else if (Array.isArray(response.data?.data)) {
        users = response.data.data;
      }

      // Filter only staff (exclude PATIENT and SUPER_ADMIN)
      const staffList = users.filter(u => 
        STAFF_ROLES.includes(u.role) && !u.isDeleted
      );

      setStaff(staffList);
    } catch (error) {
      console.error('Error fetching staff:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách nhân viên');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStaff();
    setRefreshing(false);
  };

  const getFilteredStaff = () => {
    let filtered = staff;
    
    if (selectedRole !== 'ALL') {
      filtered = filtered.filter(s => s.role === selectedRole);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.email?.toLowerCase().includes(query) ||
        s.personalInfo?.firstName?.toLowerCase().includes(query) ||
        s.personalInfo?.lastName?.toLowerCase().includes(query) ||
        s.personalInfo?.phone?.includes(query)
      );
    }
    
    return filtered;
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

  const filteredStaff = getFilteredStaff();
  const staffByRole = STAFF_ROLES.reduce((acc, role) => {
    acc[role] = staff.filter(s => s.role === role).length;
    return acc;
  }, {});

  const RoleFilter = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.roleFilterContainer}
      contentContainerStyle={styles.roleFilterContent}
    >
      <TouchableOpacity
        style={[styles.roleChip, selectedRole === 'ALL' && styles.roleChipActive]}
        onPress={() => setSelectedRole('ALL')}
      >
        <Text style={[styles.roleChipText, selectedRole === 'ALL' && styles.roleChipTextActive]}>
          Tất cả ({staff.length})
        </Text>
      </TouchableOpacity>
      
      {STAFF_ROLES.map(role => {
        const config = ROLE_CONFIG[role];
        const count = staffByRole[role];
        if (count === 0) return null;
        
        return (
          <TouchableOpacity
            key={role}
            style={[
              styles.roleChip,
              selectedRole === role && styles.roleChipActive,
              selectedRole === role && { backgroundColor: config.color }
            ]}
            onPress={() => setSelectedRole(role)}
          >
            <MaterialIcons 
              name={config.icon} 
              size={16} 
              color={selectedRole === role ? '#fff' : config.color} 
            />
            <Text style={[
              styles.roleChipText,
              selectedRole === role && styles.roleChipTextActive
            ]}>
              {config.label} ({count})
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const StaffCard = ({ item }) => {
    const roleConfig = ROLE_CONFIG[item.role] || { label: item.role, icon: 'person', color: '#666' };
    const fullName = item.personalInfo?.firstName && item.personalInfo?.lastName
      ? `${item.personalInfo.lastName} ${item.personalInfo.firstName}`
      : item.email?.split('@')[0];

    return (
      <TouchableOpacity 
        style={styles.staffCard}
        onPress={() => navigation.navigate('UserManagement', { userId: item._id })}
      >
        <View style={[styles.staffAvatar, { backgroundColor: roleConfig.color + '20' }]}>
          <MaterialIcons name={roleConfig.icon} size={28} color={roleConfig.color} />
        </View>
        
        <View style={styles.staffInfo}>
          <Text style={styles.staffName}>{fullName}</Text>
          <Text style={styles.staffEmail}>{item.email}</Text>
          <View style={styles.staffMeta}>
            <View style={[styles.roleBadge, { backgroundColor: roleConfig.color + '15' }]}>
              <Text style={[styles.roleBadgeText, { color: roleConfig.color }]}>
                {roleConfig.label}
              </Text>
            </View>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>

        <MaterialIcons name="chevron-right" size={24} color="#ccc" />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản Lý Nhân Viên</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('AddUser')}
        >
          <MaterialIcons name="person-add" size={24} color="#1a237e" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={22} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm nhân viên..."
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
      <RoleFilter />

      {/* Staff List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1a237e" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredStaff.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="people-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Không có nhân viên nào</Text>
            </View>
          ) : (
            <>
              <Text style={styles.resultCount}>
                {filteredStaff.length} nhân viên
              </Text>
              {filteredStaff.map(item => (
                <StaffCard key={item._id} item={item} />
              ))}
            </>
          )}
          <View style={styles.bottomSpacing} />
        </ScrollView>
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
  addButton: {
    padding: 8
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    height: 48,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: '#333'
  },
  roleFilterContainer: {
    maxHeight: 50
  },
  roleFilterContent: {
    paddingHorizontal: 16,
    paddingVertical: 4
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  roleChipActive: {
    backgroundColor: '#1a237e',
    borderColor: '#1a237e'
  },
  roleChipText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4
  },
  roleChipTextActive: {
    color: '#fff',
    fontWeight: '500'
  },
  content: {
    flex: 1,
    padding: 16,
    paddingTop: 8
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    color: '#666'
  },
  resultCount: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12
  },
  staffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  staffAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14
  },
  staffInfo: {
    flex: 1
  },
  staffName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  staffEmail: {
    fontSize: 13,
    color: '#666',
    marginTop: 2
  },
  staffMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '500'
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 12
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4
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
  bottomSpacing: {
    height: 30
  }
});

export default StaffManagementScreen;
