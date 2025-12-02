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

const DoctorMedicalRecords = ({ navigation }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const response = await api.get('/medical-records?limit=100');
      
      console.log('📋 Medical records response:', JSON.stringify(response.data, null, 2));
      
      let data = [];
      // API trả về { success, data: { medicalRecords: [...], pagination } }
      if (response.data?.data?.medicalRecords) {
        data = response.data.data.medicalRecords;
      } else if (response.data?.data?.records) {
        data = response.data.data.records;
      } else if (Array.isArray(response.data?.data)) {
        data = response.data.data;
      }

      console.log('📋 Parsed records:', data.length);

      // Sort by date (newest first)
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setRecords(data);
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRecords();
    setRefreshing(false);
  };

  const RecordCard = ({ item }) => {
    const date = new Date(item.visitDate || item.createdAt);
    
    // Xử lý tên bệnh nhân - patientId được populate trực tiếp
    let patientName = 'Bệnh nhân';
    if (item.patientId?.personalInfo) {
      const info = item.patientId.personalInfo;
      patientName = `${info.firstName || ''} ${info.lastName || ''}`.trim() || item.patientId.email || 'Bệnh nhân';
    } else if (item.patient?.userId?.personalInfo) {
      const info = item.patient.userId.personalInfo;
      patientName = `${info.firstName || ''} ${info.lastName || ''}`.trim();
    }
    
    // Xử lý tên bác sĩ
    let doctorName = 'N/A';
    if (item.doctorId?.personalInfo) {
      doctorName = item.doctorId.personalInfo.lastName || item.doctorId.personalInfo.firstName || 'N/A';
    } else if (item.doctor?.personalInfo) {
      doctorName = item.doctor.personalInfo.lastName || 'N/A';
    }

    const getRecordTypeIcon = (type) => {
      switch(type) {
        case 'EXAMINATION': return 'medical-services';
        case 'FOLLOW_UP': return 'replay';
        case 'EMERGENCY': return 'warning';
        case 'CONSULTATION': return 'chat';
        default: return 'assignment';
      }
    };

    const getRecordTypeText = (type) => {
      switch(type) {
        case 'EXAMINATION': return 'Khám bệnh';
        case 'FOLLOW_UP': return 'Tái khám';
        case 'EMERGENCY': return 'Cấp cứu';
        case 'CONSULTATION': return 'Tư vấn';
        default: return 'Khám tổng quát';
      }
    };

    return (
      <TouchableOpacity
        style={styles.recordCard}
        onPress={() => navigation.navigate('DoctorRecordDetail', { recordId: item._id })}
      >
        <View style={styles.recordHeader}>
          <View style={styles.iconContainer}>
            <MaterialIcons 
              name={getRecordTypeIcon(item.recordType)} 
              size={24} 
              color="#00796B" 
            />
          </View>
          <View style={styles.recordInfo}>
            <Text style={styles.patientName}>{patientName}</Text>
            <Text style={styles.recordType}>{getRecordTypeText(item.recordType)}</Text>
            <View style={styles.dateRow}>
              <MaterialIcons name="event" size={14} color="#666" />
              <Text style={styles.dateText}>
                {date.toLocaleDateString('vi-VN')}
              </Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#ccc" />
        </View>

        {item.chiefComplaint && (
          <View style={styles.complaintContainer}>
            <Text style={styles.complaintLabel}>Lý do khám:</Text>
            <Text style={styles.complaintText} numberOfLines={2}>{item.chiefComplaint}</Text>
          </View>
        )}

        {item.diagnosis && item.diagnosis.length > 0 && (
          <View style={styles.diagnosisContainer}>
            <Text style={styles.diagnosisLabel}>Chẩn đoán:</Text>
            <Text style={styles.diagnosisText} numberOfLines={1}>
              {item.diagnosis.map(d => d.description || d.code).join(', ')}
            </Text>
          </View>
        )}

        <View style={styles.recordFooter}>
          <View style={styles.footerItem}>
            <MaterialIcons name="person" size={14} color="#666" />
            <Text style={styles.footerText}>
              BS. {doctorName}
            </Text>
          </View>
          {item.prescriptions && item.prescriptions.length > 0 && (
            <View style={styles.footerItem}>
              <MaterialIcons name="medication" size={14} color="#E91E63" />
              <Text style={styles.footerText}>{item.prescriptions.length} đơn thuốc</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const filteredRecords = records.filter(record => {
    if (!searchText) return true;
    // Xử lý tên bệnh nhân từ patientId (populated)
    let patientName = '';
    if (record.patientId?.personalInfo) {
      patientName = `${record.patientId.personalInfo.firstName || ''} ${record.patientId.personalInfo.lastName || ''}`.toLowerCase();
    } else if (record.patient?.userId?.personalInfo) {
      patientName = `${record.patient.userId.personalInfo.firstName || ''} ${record.patient.userId.personalInfo.lastName || ''}`.toLowerCase();
    }
    const complaint = (record.chiefComplaint || '').toLowerCase();
    const search = searchText.toLowerCase();
    return patientName.includes(search) || complaint.includes(search);
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#00796B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hồ Sơ Bệnh Án</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CreateMedicalRecord')}>
          <MaterialIcons name="add" size={24} color="#00796B" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo tên bệnh nhân, triệu chứng..."
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
          <MaterialIcons name="folder" size={24} color="#00796B" />
          <Text style={styles.statValue}>{records.length}</Text>
          <Text style={styles.statLabel}>Tổng hồ sơ</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialIcons name="today" size={24} color="#1976D2" />
          <Text style={styles.statValue}>
            {records.filter(r => {
              const today = new Date().toDateString();
              return new Date(r.createdAt).toDateString() === today;
            }).length}
          </Text>
          <Text style={styles.statLabel}>Hôm nay</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialIcons name="date-range" size={24} color="#FF9800" />
          <Text style={styles.statValue}>
            {records.filter(r => {
              const weekAgo = new Date();
              weekAgo.setDate(weekAgo.getDate() - 7);
              return new Date(r.createdAt) >= weekAgo;
            }).length}
          </Text>
          <Text style={styles.statLabel}>Tuần này</Text>
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00796B" />
        </View>
      ) : (
        <FlatList
          data={filteredRecords}
          renderItem={({ item }) => <RecordCard item={item} />}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00796B']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="folder-open" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Không có hồ sơ bệnh án</Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => navigation.navigate('CreateMedicalRecord')}
              >
                <Text style={styles.createButtonText}>Tạo hồ sơ mới</Text>
              </TouchableOpacity>
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
    elevation: 2,
    justifyContent: 'space-around'
  },
  statItem: {
    alignItems: 'center'
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2
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
  recordCard: {
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
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  recordInfo: {
    flex: 1,
    marginLeft: 12
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  recordType: {
    fontSize: 13,
    color: '#00796B',
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
  complaintContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  complaintLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4
  },
  complaintText: {
    fontSize: 14,
    color: '#333'
  },
  diagnosisContainer: {
    marginTop: 8
  },
  diagnosisLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4
  },
  diagnosisText: {
    fontSize: 14,
    color: '#E91E63',
    fontWeight: '500'
  },
  recordFooter: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16
  },
  footerText: {
    fontSize: 12,
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
  },
  createButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#00796B',
    borderRadius: 8
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  }
});

export default DoctorMedicalRecords;
