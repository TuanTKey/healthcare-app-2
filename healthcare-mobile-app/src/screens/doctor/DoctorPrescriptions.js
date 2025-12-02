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
  Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../services/api';

const DoctorPrescriptions = ({ navigation }) => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/prescriptions?limit=100');
      
      console.log('📋 Prescriptions response:', JSON.stringify(response.data, null, 2));
      
      let data = [];
      // API trả về { success, data: { data: [...], pagination } }
      if (response.data?.data?.data) {
        data = response.data.data.data;
      } else if (response.data?.data?.prescriptions) {
        data = response.data.data.prescriptions;
      } else if (Array.isArray(response.data?.data)) {
        data = response.data.data;
      }

      console.log('📋 Parsed prescriptions:', data.length);

      // Sort by date (newest first)
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setPrescriptions(data);
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPrescriptions();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    const colors = {
      'ACTIVE': '#4CAF50',
      'PENDING': '#FF9800',
      'DISPENSED': '#2196F3',
      'COMPLETED': '#9E9E9E',
      'CANCELLED': '#F44336'
    };
    return colors[status] || '#999';
  };

  const getStatusText = (status) => {
    const texts = {
      'ACTIVE': 'Đang dùng',
      'PENDING': 'Chờ cấp',
      'DISPENSED': 'Đã cấp',
      'COMPLETED': 'Hoàn thành',
      'CANCELLED': 'Đã hủy'
    };
    return texts[status] || status;
  };

  const FilterButton = ({ label, value }) => (
    <TouchableOpacity
      style={[styles.filterButton, filter === value && styles.filterButtonActive]}
      onPress={() => setFilter(value)}
    >
      <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const PrescriptionCard = ({ item }) => {
    const date = new Date(item.prescriptionDate || item.createdAt);
    
    // Xử lý tên bệnh nhân - patientId được populate trực tiếp
    let patientName = 'Bệnh nhân';
    if (item.patientId?.personalInfo) {
      const info = item.patientId.personalInfo;
      patientName = `${info.firstName || ''} ${info.lastName || ''}`.trim() || item.patientId.email || 'Bệnh nhân';
    } else if (item.patient?.userId?.personalInfo) {
      const info = item.patient.userId.personalInfo;
      patientName = `${info.firstName || ''} ${info.lastName || ''}`.trim();
    }
    
    const medicationCount = item.medications?.length || 0;
    const diagnosis = item.specialInstructions || item.notes || item.diagnosis;

    return (
      <TouchableOpacity
        style={styles.prescriptionCard}
        onPress={() => navigation.navigate('DoctorPrescriptionDetail', { prescriptionId: item._id })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="medication" size={24} color="#E91E63" />
          </View>
          <View style={styles.prescriptionInfo}>
            <Text style={styles.patientName}>{patientName}</Text>
            <Text style={styles.prescriptionCode}>
              Mã: {item.prescriptionId || item.prescriptionNumber || item._id?.slice(-8)}
            </Text>
            <View style={styles.dateRow}>
              <MaterialIcons name="event" size={14} color="#666" />
              <Text style={styles.dateText}>
                {date.toLocaleDateString('vi-VN')}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>

        {/* Medications Preview */}
        <View style={styles.medicationsContainer}>
          <Text style={styles.medicationsLabel}>
            <MaterialIcons name="local-pharmacy" size={14} color="#666" /> {medicationCount} loại thuốc
          </Text>
          {item.medications?.slice(0, 2).map((med, index) => (
            <View key={index} style={styles.medicationItem}>
              <Text style={styles.medicationName} numberOfLines={1}>
                • {med.name || med.medication?.name}
              </Text>
              <Text style={styles.medicationDosage}>
                {med.dosage?.unit || med.dosage} - {med.frequency?.instructions || med.frequency?.timesPerDay + ' lần/ngày' || med.frequency}
              </Text>
            </View>
          ))}
          {medicationCount > 2 && (
            <Text style={styles.moreText}>+{medicationCount - 2} thuốc khác...</Text>
          )}
        </View>

        {diagnosis && (
          <View style={styles.diagnosisContainer}>
            <Text style={styles.diagnosisLabel}>Chẩn đoán:</Text>
            <Text style={styles.diagnosisText} numberOfLines={1}>{diagnosis}</Text>
          </View>
        )}

        <View style={styles.cardFooter}>
          <TouchableOpacity 
            style={styles.footerAction}
            onPress={() => navigation.navigate('DoctorPrescriptionDetail', { prescriptionId: item._id })}
          >
            <MaterialIcons name="visibility" size={18} color="#00796B" />
            <Text style={styles.footerActionText}>Xem</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.footerAction}
            onPress={() => {/* Print functionality */}}
          >
            <MaterialIcons name="print" size={18} color="#1976D2" />
            <Text style={styles.footerActionText}>In</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const filteredPrescriptions = prescriptions.filter(p => {
    // Filter by status
    if (filter !== 'all' && p.status !== filter.toUpperCase()) {
      return false;
    }
    // Filter by search
    if (!searchText) return true;
    const patientName = `${p.patient?.userId?.personalInfo?.firstName || ''} ${p.patient?.userId?.personalInfo?.lastName || ''}`.toLowerCase();
    const code = (p.prescriptionNumber || '').toLowerCase();
    const search = searchText.toLowerCase();
    return patientName.includes(search) || code.includes(search);
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#00796B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đơn Thuốc</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CreatePrescription')}>
          <MaterialIcons name="add" size={24} color="#00796B" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo tên bệnh nhân, mã đơn..."
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <FilterButton label="Tất cả" value="all" />
        <FilterButton label="Đang dùng" value="active" />
        <FilterButton label="Chờ cấp" value="pending" />
        <FilterButton label="Hoàn thành" value="completed" />
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00796B" />
        </View>
      ) : (
        <FlatList
          data={filteredPrescriptions}
          renderItem={({ item }) => <PrescriptionCard item={item} />}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00796B']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="medication" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Không có đơn thuốc</Text>
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
    marginBottom: 8,
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  filterButtonActive: {
    backgroundColor: '#E91E63',
    borderColor: '#E91E63'
  },
  filterText: {
    fontSize: 12,
    color: '#666'
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  listContent: {
    padding: 16
  },
  prescriptionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FCE4EC',
    alignItems: 'center',
    justifyContent: 'center'
  },
  prescriptionInfo: {
    flex: 1,
    marginLeft: 12
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  prescriptionCode: {
    fontSize: 12,
    color: '#666',
    marginTop: 2
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  dateText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold'
  },
  medicationsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  medicationsLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8
  },
  medicationItem: {
    marginBottom: 4
  },
  medicationName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500'
  },
  medicationDosage: {
    fontSize: 12,
    color: '#666',
    marginLeft: 12
  },
  moreText: {
    fontSize: 12,
    color: '#E91E63',
    fontStyle: 'italic',
    marginTop: 4
  },
  diagnosisContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  diagnosisLabel: {
    fontSize: 12,
    color: '#999'
  },
  diagnosisText: {
    fontSize: 14,
    color: '#333',
    marginTop: 4
  },
  cardFooter: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    justifyContent: 'flex-end'
  },
  footerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  footerActionText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4
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

export default DoctorPrescriptions;
