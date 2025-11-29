import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, Text, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import api from '../../services/api';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Chip from '../../components/common/Chip';
import TextInput from '../../components/common/TextInput';

const PatientBillsScreen = ({ navigation }) => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredBills, setFilteredBills] = useState([]);

  useEffect(() => {
    loadBills();
  }, []);

  useEffect(() => {
    filterBills();
  }, [searchQuery, bills]);

  const loadBills = async () => {
    try {
      setLoading(true);
      console.log('💰 Fetching all bills');
      
      const response = await api.get('/bills');
      console.log('💰 Bills response structure:', Object.keys(response.data));
      console.log('💰 Full response:', JSON.stringify(response.data, null, 2));
      
      let billsList = [];
      // Service returns { success, data: { data: [...], pagination: {...} } }
      if (response.data?.data?.data) {
        // data.data is the wrapper object with data array and pagination
        if (Array.isArray(response.data.data.data)) {
          billsList = response.data.data.data;
        } else if (Array.isArray(response.data.data)) {
          // Fallback: data.data might be directly the array
          billsList = response.data.data;
        }
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        billsList = response.data.data;
      } else if (Array.isArray(response.data)) {
        billsList = response.data;
      }
      
      console.log('💰 Extracted bills count:', billsList.length);
      console.log('💰 Sample bill:', billsList[0]);
      setBills(billsList);
    } catch (error) {
      console.error('❌ Lỗi tải hoá đơn:', error.message);
      console.error('❌ Error details:', error.response?.data);
      Alert.alert('Lỗi', 'Không thể tải danh sách hoá đơn');
      setBills([]);
    } finally {
      setLoading(false);
    }
  };

  const filterBills = () => {
    if (!searchQuery.trim()) {
      setFilteredBills(bills);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = bills.filter(bill => {
      const patientName = bill.patientId?.personalInfo?.firstName || '';
      const patientEmail = bill.patientId?.email || '';
      const billNumber = bill.billNumber || '';

      return (
        patientName.toLowerCase().includes(query) ||
        patientEmail.toLowerCase().includes(query) ||
        billNumber.toLowerCase().includes(query)
      );
    });

    setFilteredBills(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBills();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PAID':
        return '#4CAF50';
      case 'PENDING':
        return '#FF9800';
      case 'CANCELLED':
        return '#F44336';
      case 'OVERDUE':
        return '#D32F2F';
      default:
        return '#1976d2';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'PAID':
        return 'ĐÃ THANH TOÁN';
      case 'PENDING':
        return 'CHỜ THANH TOÁN';
      case 'CANCELLED':
        return 'HỦY BỎ';
      case 'OVERDUE':
        return 'QUÁ HẠN';
      default:
        return status;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Đang tải hoá đơn...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          Quản Lý Hoá Đơn
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Tổng cộng: {filteredBills.length} hoá đơn
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          placeholder="Tìm kiếm theo tên bệnh nhân, số hoá đơn..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          mode="outlined"
          style={styles.searchInput}
        />
      </View>

      {/* Summary Cards */}
      {bills.length > 0 && (
        <View style={styles.summaryContainer}>
          <Card style={styles.summaryCard}>
            <Card.Content>
              <View style={styles.summaryItem}>
                <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
                <View style={styles.summaryContent}>
                  <Text variant="bodySmall" style={styles.summaryLabel}>
                    Đã Thanh Toán
                  </Text>
                  <Text variant="titleSmall" style={styles.summaryValue}>
                    {bills.filter(b => b.status === 'PAID').length}
                  </Text>
                </View>
              </View>
              <View style={styles.summaryItem}>
                <MaterialIcons name="schedule" size={24} color="#FF9800" />
                <View style={styles.summaryContent}>
                  <Text variant="bodySmall" style={styles.summaryLabel}>
                    Chờ Thanh Toán
                  </Text>
                  <Text variant="titleSmall" style={styles.summaryValue}>
                    {bills.filter(b => b.status === 'PENDING').length}
                  </Text>
                </View>
              </View>
              <View style={styles.summaryItem}>
                <MaterialIcons name="error" size={24} color="#D32F2F" />
                <View style={styles.summaryContent}>
                  <Text variant="bodySmall" style={styles.summaryLabel}>
                    Quá Hạn
                  </Text>
                  <Text variant="titleSmall" style={styles.summaryValue}>
                    {bills.filter(b => b.status === 'OVERDUE').length}
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        </View>
      )}

      {filteredBills.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content style={styles.emptyContent}>
            <MaterialIcons name="receipt" size={48} color="#ccc" />
            <Text variant="titleMedium" style={styles.emptyText}>
              Không tìm thấy hoá đơn
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              {searchQuery ? 'Thử tìm kiếm với từ khóa khác' : 'Chưa có hoá đơn'}
            </Text>
          </Card.Content>
        </Card>
      ) : (
        filteredBills.map((bill, index) => (
          <Card key={bill._id || index} style={styles.billCard}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <View style={styles.headerInfo}>
                  <Text variant="titleSmall" style={styles.billNumber}>
                    {bill.billNumber || `Bill #${index + 1}`}
                  </Text>
                  <Text variant="bodySmall" style={styles.patientName}>
                    {bill.patientId?.personalInfo?.firstName || 'Bệnh nhân N/A'}
                  </Text>
                </View>
                <Chip
                  style={{ backgroundColor: getStatusColor(bill.status) }}
                  textStyle={{ color: 'white' }}
                  label={getStatusLabel(bill.status)}
                />
              </View>

              <View style={{height: 1, backgroundColor: '#ccc', marginVertical: 10}} />

              <View style={styles.infoRow}>
                <MaterialIcons name="event" size={16} color="#666" />
                <Text variant="bodySmall" style={styles.infoText}>
                  {format(new Date(bill.billDate || bill.createdAt), 'dd/MM/yyyy', { locale: vi })}
                </Text>
              </View>

              <View style={styles.amountSection}>
                <View style={styles.amountRow}>
                  <Text variant="bodySmall" style={styles.amountLabel}>
                    Tổng tiền:
                  </Text>
                  <Text variant="titleSmall" style={styles.amountValue}>
                    {formatCurrency(bill.grandTotal || bill.totalAmount || bill.finalAmount || 0)}
                  </Text>
                </View>

                {(bill.amountPaid || bill.paidAmount) && (
                  <View style={styles.amountRow}>
                    <Text variant="bodySmall" style={styles.amountLabel}>
                      Đã thanh toán:
                    </Text>
                    <Text variant="bodySmall" style={[styles.amountValue, { color: '#4CAF50' }]}>
                      {formatCurrency(bill.amountPaid || bill.paidAmount || 0)}
                    </Text>
                  </View>
                )}

                {(bill.balanceDue || bill.remainingAmount) && (bill.balanceDue || bill.remainingAmount) > 0 && (
                  <View style={styles.amountRow}>
                    <Text variant="bodySmall" style={styles.amountLabel}>
                      Còn nợ:
                    </Text>
                    <Text variant="bodySmall" style={[styles.amountValue, { color: '#D32F2F' }]}>
                      {formatCurrency(bill.balanceDue || bill.remainingAmount || 0)}
                    </Text>
                  </View>
                )}
              </View>

              <Button
                mode="outlined"
                style={styles.detailButton}
                icon="eye"
                onPress={() => navigation.navigate('BillDetail', { billId: bill._id })}
              >
                Xem Chi Tiết
              </Button>
            </Card.Content>
          </Card>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  header: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: '#666',
  },
  searchContainer: {
    padding: 16,
  },
  searchInput: {
    elevation: 0,
    backgroundColor: 'white',
  },
  summaryContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  summaryCard: {
    marginBottom: 8,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryContent: {
    marginLeft: 12,
    flex: 1,
  },
  summaryLabel: {
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontWeight: 'bold',
    color: '#333',
  },
  emptyCard: {
    margin: 16,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 16,
    color: '#666',
  },
  emptySubtext: {
    marginTop: 8,
    color: '#999',
    textAlign: 'center',
  },
  billCard: {
    margin: 16,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerInfo: {
    flex: 1,
  },
  billNumber: {
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 4,
  },
  patientName: {
    color: '#666',
    marginTop: 2,
  },
  divider: {
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    marginLeft: 8,
    color: '#333',
  },
  amountSection: {
    marginTop: 8,
    marginBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  amountLabel: {
    color: '#666',
  },
  amountValue: {
    fontWeight: 'bold',
    color: '#333',
  },
  detailButton: {
    marginTop: 8,
  },
});

export default PatientBillsScreen;
