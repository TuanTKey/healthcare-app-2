import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Dimensions,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Card from '../../components/common/Card';
import api from '../../services/api';

const { width } = Dimensions.get('window');

const RevenueReportScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('week');
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalBills: 0,
    paidBills: 0,
    pendingBills: 0,
    averageBillAmount: 0,
    paymentMethodBreakdown: [],
    dailyRevenue: [],
  });

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/bills');
      
      // Handle nested response: { data: { data: { data: [...], pagination: {...} } } }
      let allBills = [];
      if (Array.isArray(response.data?.data?.data)) {
        allBills = response.data.data.data;
      } else if (Array.isArray(response.data?.data?.bills)) {
        allBills = response.data.data.bills;
      } else if (Array.isArray(response.data?.data)) {
        allBills = response.data.data;
      } else if (Array.isArray(response.data)) {
        allBills = response.data;
      }

      // Calculate date range based on period
      const now = new Date();
      let startDate;
      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      // Filter bills by period
      const periodBills = allBills.filter(b => 
        new Date(b.createdAt) >= startDate
      );

      const paidBills = periodBills.filter(b => b.status === 'PAID');
      const pendingBills = periodBills.filter(b => 
        b.status === 'PENDING' || b.status === 'PARTIALLY_PAID'
      );

      const totalRevenue = paidBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
      const averageBillAmount = paidBills.length > 0 ? totalRevenue / paidBills.length : 0;

      // Payment method breakdown
      const methodCounts = {};
      paidBills.forEach(bill => {
        if (bill.payments) {
          bill.payments.forEach(p => {
            const method = p.method || p.paymentMethod || 'OTHER';
            if (!methodCounts[method]) {
              methodCounts[method] = { count: 0, amount: 0 };
            }
            methodCounts[method].count++;
            methodCounts[method].amount += p.amount || 0;
          });
        }
      });

      const paymentMethodBreakdown = Object.entries(methodCounts).map(([method, data]) => ({
        method,
        ...data,
      })).sort((a, b) => b.amount - a.amount);

      // Daily revenue (last 7 days)
      const dailyRevenue = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
        
        const dayBills = paidBills.filter(b => {
          const billDate = new Date(b.paidAt || b.updatedAt);
          return billDate >= dayStart && billDate < dayEnd;
        });
        
        dailyRevenue.push({
          date: dayStart.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' }),
          revenue: dayBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0),
          count: dayBills.length,
        });
      }

      setStats({
        totalRevenue,
        totalBills: periodBills.length,
        paidBills: paidBills.length,
        pendingBills: pendingBills.length,
        averageBillAmount,
        paymentMethodBreakdown,
        dailyRevenue,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount || 0);
  };

  const getPaymentMethodLabel = (method) => {
    switch (method) {
      case 'CASH': return 'Tiền mặt';
      case 'BANK_TRANSFER': return 'Chuyển khoản';
      case 'CREDIT_CARD': return 'Thẻ tín dụng';
      case 'E_WALLET': return 'Ví điện tử';
      case 'INSURANCE': return 'Bảo hiểm';
      default: return 'Khác';
    }
  };

  const StatCard = ({ title, value, subtitle, icon, color }) => (
    <Card style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statContent}>
        <MaterialIcons name={icon} size={28} color={color} />
        <View style={styles.statText}>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statTitle}>{title}</Text>
          {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
        </View>
      </View>
    </Card>
  );

  const PeriodButton = ({ label, value, isActive }) => (
    <TouchableOpacity
      style={[styles.periodButton, isActive && styles.periodButtonActive]}
      onPress={() => setPeriod(value)}
    >
      <Text style={[styles.periodButtonText, isActive && styles.periodButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976d2" />
        <Text style={styles.loadingText}>Đang tải báo cáo...</Text>
      </View>
    );
  }

  // Find max revenue for chart
  const maxRevenue = Math.max(...stats.dailyRevenue.map(d => d.revenue), 1);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Period Filter */}
      <View style={styles.filterContainer}>
        <View style={styles.periodButtons}>
          <PeriodButton label="Hôm nay" value="today" isActive={period === 'today'} />
          <PeriodButton label="Tuần" value="week" isActive={period === 'week'} />
          <PeriodButton label="Tháng" value="month" isActive={period === 'month'} />
          <PeriodButton label="Năm" value="year" isActive={period === 'year'} />
        </View>
      </View>

      {/* Main Stats */}
      <View style={styles.statsGrid}>
        <StatCard
          title="Tổng doanh thu"
          value={formatCurrency(stats.totalRevenue)}
          icon="account-balance-wallet"
          color="#4caf50"
        />
        <StatCard
          title="Tổng hóa đơn"
          value={stats.totalBills}
          subtitle={`${stats.paidBills} đã thanh toán`}
          icon="receipt"
          color="#1976d2"
        />
        <StatCard
          title="Chờ thanh toán"
          value={stats.pendingBills}
          icon="pending"
          color="#ff9800"
        />
        <StatCard
          title="TB / Hóa đơn"
          value={formatCurrency(stats.averageBillAmount)}
          icon="analytics"
          color="#9c27b0"
        />
      </View>

      {/* Daily Revenue Chart */}
      <Card style={styles.chartCard}>
        <Text style={styles.sectionTitle}>Doanh thu 7 ngày gần nhất</Text>
        <View style={styles.chart}>
          {stats.dailyRevenue.map((day, index) => (
            <View key={index} style={styles.chartBar}>
              <Text style={styles.chartValue}>
                {day.revenue > 0 ? formatCurrency(day.revenue).replace('₫', '').trim() : '-'}
              </Text>
              <View style={styles.barContainer}>
                <View
                  style={[
                    styles.bar,
                    { height: `${(day.revenue / maxRevenue) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.chartLabel}>{day.date}</Text>
              <Text style={styles.chartCount}>{day.count} HĐ</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Payment Method Breakdown */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
        {stats.paymentMethodBreakdown.length > 0 ? (
          <View style={styles.dataTable}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 2 }]}>Phương thức</Text>
              <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>SL</Text>
              <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 2, textAlign: 'right' }]}>Số tiền</Text>
            </View>
            {stats.paymentMethodBreakdown.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>{getPaymentMethodLabel(item.method)}</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{item.count}</Text>
                <Text style={[styles.tableCell, { flex: 2, textAlign: 'right' }]}>{formatCurrency(item.amount)}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons name="payments" size={48} color="#ccc" />
            <Text style={styles.emptyText}>Chưa có dữ liệu</Text>
          </View>
        )}
      </Card>

      {/* Summary */}
      <Card style={[styles.card, styles.summaryCard]}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tổng thu trong kỳ:</Text>
          <Text style={styles.summaryValue}>{formatCurrency(stats.totalRevenue)}</Text>
        </View>
      </Card>
    </ScrollView>
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
  filterContainer: {
    padding: 15,
    backgroundColor: '#fff',
  },
  periodButtons: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  periodButtonActive: {
    backgroundColor: '#1976d2',
  },
  periodButtonText: {
    fontSize: 13,
    color: '#666',
  },
  periodButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
  },
  statCard: {
    width: '47%',
    margin: '1.5%',
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    marginLeft: 12,
    flex: 1,
  },
  statValue: {
    fontSize: 16,
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
  chartCard: {
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
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 180,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  chartValue: {
    fontSize: 9,
    color: '#666',
    marginBottom: 5,
    textAlign: 'center',
    height: 24,
  },
  barContainer: {
    width: '80%',
    height: 100,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    backgroundColor: '#1976d2',
    borderRadius: 4,
    minHeight: 4,
  },
  chartLabel: {
    fontSize: 9,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  chartCount: {
    fontSize: 8,
    color: '#999',
  },
  card: {
    margin: 15,
    marginTop: 5,
    borderRadius: 12,
  },
  dataTable: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  tableHeaderText: {
    fontWeight: 'bold',
    color: '#333',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tableCell: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    padding: 30,
  },
  emptyText: {
    color: '#999',
    marginTop: 10,
  },
  summaryCard: {
    marginBottom: 30,
    backgroundColor: '#1976d2',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#fff',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default RevenueReportScreen;
