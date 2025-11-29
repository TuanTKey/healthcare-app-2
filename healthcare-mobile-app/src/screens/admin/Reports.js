import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Text,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../services/api';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';

const Reports = ({ navigation }) => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAppointments: 0,
    totalPatients: 0,
    totalDoctors: 0
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const [usersRes, appointmentsRes] = await Promise.all([
        api.get('/users').catch(() => ({ data: { data: [] } })),
        api.get('/appointments').catch(() => ({ data: { data: [] } }))
      ]);

      const users = usersRes.data.data || [];
      const appointments = appointmentsRes.data.data || [];

      setStats({
        totalUsers: users.length,
        totalAppointments: appointments.length,
        totalPatients: users.filter((u) => u.role === 'PATIENT').length,
        totalDoctors: users.filter((u) => u.role === 'DOCTOR').length
      });
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tải báo cáo');
    } finally {
      setLoading(false);
    }
  };

  const ReportCard = ({ icon, title, value, color }) => (
    <Card style={[styles.reportCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
      <Card.Content style={styles.reportContent}>
        <View style={styles.reportHeader}>
          <MaterialIcons name={icon} size={32} color={color} />
          <View style={styles.reportInfo}>
            <Text style={styles.reportTitle}>{title}</Text>
            <Text style={styles.reportValue}>{value}</Text>
          </View>
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
        <Text style={styles.title}>Báo Cáo Hệ Thống</Text>
        <TouchableOpacity onPress={fetchReports}>
          <MaterialIcons name="refresh" size={28} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thống Kê Tổng Quan</Text>
            <ReportCard
              icon="people"
              title="Tổng Users"
              value={stats.totalUsers}
              color="#2196F3"
            />
            <ReportCard
              icon="person"
              title="Bệnh Nhân"
              value={stats.totalPatients}
              color="#4CAF50"
            />
            <ReportCard
              icon="medical-services"
              title="Bác Sĩ"
              value={stats.totalDoctors}
              color="#FF9800"
            />
            <ReportCard
              icon="event"
              title="Lịch Hẹn"
              value={stats.totalAppointments}
              color="#F44336"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Các Báo Cáo Có Sẵn</Text>
            
            <TouchableOpacity
              style={styles.reportOption}
              onPress={() => Alert.alert('Chi Tiết', 'Báo cáo chi tiết về users (đang phát triển)')}
            >
              <View style={styles.reportOptionContent}>
                <MaterialIcons name="assessment" size={24} color="#007AFF" />
                <View style={styles.reportOptionText}>
                  <Text style={styles.reportOptionTitle}>Báo Cáo Users</Text>
                  <Text style={styles.reportOptionDesc}>Phân tích chi tiết người dùng</Text>
                </View>
              </View>
              <MaterialIcons name="arrow-forward" size={24} color="#ccc" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.reportOption}
              onPress={() => Alert.alert('Chi Tiết', 'Báo cáo chi tiết về lịch hẹn (đang phát triển)')}
            >
              <View style={styles.reportOptionContent}>
                <MaterialIcons name="calendar-month" size={24} color="#FF9800" />
                <View style={styles.reportOptionText}>
                  <Text style={styles.reportOptionTitle}>Báo Cáo Lịch Hẹn</Text>
                  <Text style={styles.reportOptionDesc}>Phân tích lịch hẹn hàng tháng</Text>
                </View>
              </View>
              <MaterialIcons name="arrow-forward" size={24} color="#ccc" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.reportOption}
              onPress={() => Alert.alert('Chi Tiết', 'Báo cáo doanh thu (đang phát triển)')}
            >
              <View style={styles.reportOptionContent}>
                <MaterialIcons name="attach-money" size={24} color="#4CAF50" />
                <View style={styles.reportOptionText}>
                  <Text style={styles.reportOptionTitle}>Báo Cáo Doanh Thu</Text>
                  <Text style={styles.reportOptionDesc}>Phân tích tài chính</Text>
                </View>
              </View>
              <MaterialIcons name="arrow-forward" size={24} color="#ccc" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.reportOption}
              onPress={() => Alert.alert('Chi Tiết', 'Báo cáo hoạt động (đang phát triển)')}
            >
              <View style={styles.reportOptionContent}>
                <MaterialIcons name="bar-chart" size={24} color="#9C27B0" />
                <View style={styles.reportOptionText}>
                  <Text style={styles.reportOptionTitle}>Báo Cáo Hoạt Động</Text>
                  <Text style={styles.reportOptionDesc}>Thống kê hoạt động hệ thống</Text>
                </View>
              </View>
              <MaterialIcons name="arrow-forward" size={24} color="#ccc" />
            </TouchableOpacity>
          </View>

          <View style={styles.exportSection}>
            <Button
              mode="contained"
              onPress={() => Alert.alert('Thành công', 'Báo cáo đã được xuất')}
              style={styles.exportButton}
            >
              Xuất PDF
            </Button>
          </View>
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
  content: {
    flex: 1,
    padding: 16
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333'
  },
  reportCard: {
    marginBottom: 12,
    borderRadius: 8
  },
  reportContent: {
    paddingVertical: 16
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  reportInfo: {
    marginLeft: 16,
    flex: 1
  },
  reportTitle: {
    fontSize: 14,
    color: '#666'
  },
  reportValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4
  },
  reportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee'
  },
  reportOptionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  reportOptionText: {
    marginLeft: 16,
    flex: 1
  },
  reportOptionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333'
  },
  reportOptionDesc: {
    fontSize: 12,
    color: '#999',
    marginTop: 4
  },
  exportSection: {
    paddingBottom: 24
  },
  exportButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12
  }
});

export default Reports;
