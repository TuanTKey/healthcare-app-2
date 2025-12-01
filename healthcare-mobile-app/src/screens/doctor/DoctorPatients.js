import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Image
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../services/api';

const DoctorPatients = ({ navigation }) => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await api.get('/patients?limit=100');
      
      let data = [];
      if (response.data?.data?.patients) {
        data = response.data.data.patients;
      } else if (Array.isArray(response.data?.data)) {
        data = response.data.data;
      }

      setPatients(data);
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPatients();
    setRefreshing(false);
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return 'N/A';
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const PatientCard = ({ item }) => {
    const userInfo = item.userId?.personalInfo || {};
    const fullName = `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim() || 'Chưa cập nhật';
    const age = calculateAge(userInfo.dateOfBirth);
    const gender = userInfo.gender === 'MALE' ? 'Nam' : userInfo.gender === 'FEMALE' ? 'Nữ' : 'Khác';

    return (
      <TouchableOpacity
        style={styles.patientCard}
        onPress={() => navigation.navigate('DoctorPatientDetail', { patientId: item._id })}
      >
        <View style={styles.avatarContainer}>
          <MaterialIcons 
            name={userInfo.gender === 'FEMALE' ? 'face-3' : 'face'} 
            size={40} 
            color="#00796B" 
          />
        </View>
        
        <View style={styles.patientInfo}>
          <Text style={styles.patientName}>{fullName}</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <MaterialIcons name="cake" size={14} color="#666" />
              <Text style={styles.infoText}>{age} tuổi</Text>
            </View>
            <View style={styles.infoItem}>
              <MaterialIcons name="wc" size={14} color="#666" />
              <Text style={styles.infoText}>{gender}</Text>
            </View>
          </View>
          {userInfo.phone && (
            <View style={styles.infoItem}>
              <MaterialIcons name="phone" size={14} color="#666" />
              <Text style={styles.infoText}>{userInfo.phone}</Text>
            </View>
          )}
          <Text style={styles.patientId}>Mã BN: {item.patientId || item._id?.slice(-8)}</Text>
        </View>

        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('DoctorPatientDetail', { patientId: item._id })}
          >
            <MaterialIcons name="visibility" size={20} color="#00796B" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('CreateMedicalRecord', { patientId: item._id })}
          >
            <MaterialIcons name="note-add" size={20} color="#1976D2" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const filteredPatients = patients.filter(patient => {
    if (!searchText) return true;
    const userInfo = patient.userId?.personalInfo || {};
    const fullName = `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.toLowerCase();
    const patientId = (patient.patientId || '').toLowerCase();
    const phone = (userInfo.phone || '').toLowerCase();
    const search = searchText.toLowerCase();
    return fullName.includes(search) || patientId.includes(search) || phone.includes(search);
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#00796B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Danh Sách Bệnh Nhân</Text>
        <TouchableOpacity onPress={onRefresh}>
          <MaterialIcons name="refresh" size={24} color="#00796B" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo tên, mã BN, SĐT..."
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText ? (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <MaterialIcons name="close" size={20} color="#999" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{patients.length}</Text>
          <Text style={styles.statLabel}>Tổng bệnh nhân</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{filteredPatients.length}</Text>
          <Text style={styles.statLabel}>Kết quả tìm kiếm</Text>
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00796B" />
        </View>
      ) : (
        <FlatList
          data={filteredPatients}
          renderItem={({ item }) => <PatientCard item={item} />}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00796B']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="people-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Không tìm thấy bệnh nhân</Text>
            </View>
          }
        />
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
    borderBottomColor: '#eee'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    elevation: 2
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2
  },
  statItem: {
    flex: 1,
    alignItems: 'center'
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00796B'
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4
  },
  statDivider: {
    width: 1,
    backgroundColor: '#eee',
    marginHorizontal: 16
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16
  },
  patientCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: 'center'
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  patientInfo: {
    flex: 1,
    marginLeft: 12
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  infoRow: {
    flexDirection: 'row',
    marginTop: 6
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 2
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4
  },
  patientId: {
    fontSize: 12,
    color: '#999',
    marginTop: 4
  },
  actionContainer: {
    flexDirection: 'column',
    gap: 8
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16
  }
});

export default DoctorPatients;
