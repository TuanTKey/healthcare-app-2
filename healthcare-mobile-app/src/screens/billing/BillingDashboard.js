import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Text,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import Card from '../../components/common/Card';
import Chip from '../../components/common/Chip';
import Button from '../../components/common/Button';
import api from '../../services/api';

const BillingDashboard = ({ navigation }) => {
  const { user } = useSelector(state => state.auth);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalBills: 0,
    pendingBills: 0,
    paidBills: 0,
    totalRevenue: 0,
    todayRevenue: 0,
    pendingAmount: 0,
  });
  const [recentBills, setRecentBills] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch all bills
      const billsRes = await api.get('/bills');
      const bills = billsRes.data?.data?.data || billsRes.data?.data?.bills || billsRes.data?.data || [];
      
      // Calculate stats - sử dụng đúng field names từ API
      const pending = bills.filter(b => b.status === 'ISSUED' || b.status === 'PARTIAL');
      const paid = bills.filter(b => b.status === 'PAID');
      
      const totalRevenue = paid.reduce((sum, b) => sum + (b.grandTotal || b.totalAmount || 0), 0);
      const pendingAmount = pending.reduce((sum, b) => sum + (b.balanceDue || (b.grandTotal || 0) - (b.amountPaid || 0)), 0);
      
      // Today's revenue
      const today = new Date().toDateString();
      const todayBills = paid.filter(b => new Date(b.updatedAt).toDateString() === today);
      const todayRevenue = todayBills.reduce((sum, b) => sum + (b.grandTotal || b.totalAmount || 0), 0);

      setStats({
        totalBills: bills.length,
        pendingBills: pending.length,
        paidBills: paid.length,
        totalRevenue,
        todayRevenue,
        pendingAmount,
      });

      // Get recent bills (latest 10)
      const sortedBills = [...bills].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      ).slice(0, 10);
      
      setRecentBills(sortedBills);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      Alert.alert('Lỗi', 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount || 0);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PAID': return '#4caf50';
      case 'PENDING': return '#ff9800';
      case 'ISSUED': return '#ff9800';
      case 'PARTIAL': return '#2196f3';
      case 'PARTIALLY_PAID': return '#2196f3';
      case 'OVERDUE': return '#f44336';
      case 'CANCELLED': return '#f44336';
      case 'WRITTEN_OFF': return '#9e9e9e';
      case 'VOIDED': return '#9e9e9e';
      default: return '#757575';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'PAID': return 'Đã thanh toán';
      case 'PENDING': return 'Chờ thanh toán';
      case 'ISSUED': return 'Chờ thanh toán';
      case 'PARTIAL': return 'Thanh toán một phần';
      case 'PARTIALLY_PAID': return 'Thanh toán một phần';
      case 'OVERDUE': return 'Quá hạn';
      case 'CANCELLED': return 'Đã hủy';
      case 'WRITTEN_OFF': return 'Đã xóa';
      case 'VOIDED': return 'Đã vô hiệu';
      default: return status;
    }
  };

  const StatCard = ({ title, value, icon, color, subtitle, onPress }) => (
    <TouchableOpacity 
      style={[styles.statCard, { borderLeftColor: color }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.statIconContainer}>
        <MaterialIcons name={icon} size={28} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976d2" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>
            Xin chào, {user?.personalInfo?.firstName || user?.name || 'Nhân viên'}!
          </Text>
          <Text style={styles.subtitle}>Quản lý thanh toán</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            title="Tổng hóa đơn"
            value={stats.totalBills}
            icon="receipt"
            color="#1976d2"
            onPress={() => navigation.navigate('AllBills')}
          />
          <StatCard
            title="Chờ thanh toán"
            value={stats.pendingBills}
            icon="pending"
            color="#ff9800"
            subtitle={formatCurrency(stats.pendingAmount)}
            onPress={() => navigation.navigate('AllBills', { filter: 'pending' })}
          />
          <StatCard
            title="Đã thanh toán"
            value={stats.paidBills}
            icon="check-circle"
            color="#4caf50"
            onPress={() => navigation.navigate('AllBills', { filter: 'paid' })}
          />
          <StatCard
            title="Doanh thu hôm nay"
            value={formatCurrency(stats.todayRevenue)}
            icon="today"
            color="#9c27b0"
          />
        </View>

        {/* Total Revenue Card */}
        <Card style={styles.revenueCard}>
          <View style={styles.revenueHeader}>
            <MaterialIcons name="account-balance-wallet" size={32} color="#1976d2" />
            <View style={styles.revenueInfo}>
              <Text style={styles.revenueLabel}>Tổng doanh thu</Text>
              <Text style={styles.revenueValue}>{formatCurrency(stats.totalRevenue)}</Text>
            </View>
          </View>
        </Card>

        {/* Quick Actions */}
        <Card style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>Thao tác nhanh</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('CreateBill')}
            >
              <MaterialIcons name="add-circle" size={32} color="#4caf50" />
              <Text style={styles.actionText}>Tạo hóa đơn</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('ProcessPayment')}
            >
              <MaterialIcons name="payment" size={32} color="#2196f3" />
              <Text style={styles.actionText}>Thu tiền</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('PaymentHistory')}
            >
              <MaterialIcons name="history" size={32} color="#ff9800" />
              <Text style={styles.actionText}>Lịch sử</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('RevenueReport')}
            >
              <MaterialIcons name="bar-chart" size={32} color="#9c27b0" />
              <Text style={styles.actionText}>Báo cáo</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Recent Bills */}
        <Card style={styles.recentCard}>
          <View style={styles.recentHeader}>
            <Text style={styles.sectionTitle}>Hóa đơn gần đây</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AllBills')}>
              <Text style={styles.viewAllText}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>
          
          {recentBills.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="receipt-long" size={48} color="#ccc" />
              <Text style={styles.emptyText}>Chưa có hóa đơn nào</Text>
            </View>
          ) : (
            recentBills.map((bill, index) => (
              <TouchableOpacity
                key={bill._id || index}
                style={styles.billItem}
                onPress={() => navigation.navigate('BillDetail', { billId: bill._id })}
              >
                <View style={styles.billInfo}>
                  <Text style={styles.billId}>#{bill.billNumber || bill._id?.slice(-6)}</Text>
                  <Text style={styles.billPatient}>
                    {bill.patientId?.personalInfo?.firstName} {bill.patientId?.personalInfo?.lastName}
                  </Text>
                  <Text style={styles.billDate}>
                    {new Date(bill.createdAt).toLocaleDateString('vi-VN')}
                  </Text>
                </View>
                <View style={styles.billRight}>
                  <Text style={styles.billAmount}>{formatCurrency(bill.grandTotal || bill.totalAmount)}</Text>
                  <Chip
                    style={[styles.statusChip, { backgroundColor: getStatusColor(bill.status) + '20' }]}
                    textStyle={[styles.statusText, { color: getStatusColor(bill.status) }]}
                    label={getStatusLabel(bill.status)}
                  />
                </View>
              </TouchableOpacity>
            ))
          )}
        </Card>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateBill')}
        activeOpacity={0.8}
      >
        <MaterialIcons name="add" size={24} color="#fff" />
        <Text style={styles.fabText}>Tạo hóa đơn</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  header: {
    backgroundColor: '#1976d2',
    padding: 20,
    paddingTop: 40,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    marginTop: -20,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    margin: '1.5%',
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    borderLeftWidth: 4,
  },
  statIconContainer: {
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statSubtitle: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  revenueCard: {
    margin: 15,
    marginTop: 5,
    borderRadius: 12,
    backgroundColor: '#e3f2fd',
  },
  revenueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  revenueInfo: {
    marginLeft: 15,
  },
  revenueLabel: {
    fontSize: 14,
    color: '#666',
  },
  revenueValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  actionsCard: {
    margin: 15,
    marginTop: 5,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
    padding: 10,
  },
  actionText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  recentCard: {
    margin: 15,
    marginTop: 5,
    marginBottom: 100,
    borderRadius: 12,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  viewAllText: {
    color: '#1976d2',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    padding: 30,
  },
  emptyText: {
    color: '#999',
    marginTop: 10,
  },
  billItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  billInfo: {
    flex: 1,
  },
  billId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  billPatient: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  billDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  billRight: {
    alignItems: 'flex-end',
  },
  billAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  statusChip: {
    marginTop: 5,
    height: 24,
  },
  statusText: {
    fontSize: 10,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#1976d2',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 28,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 14,
  },
});

export default BillingDashboard;
