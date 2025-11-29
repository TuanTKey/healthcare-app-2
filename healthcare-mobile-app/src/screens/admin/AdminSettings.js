import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
  Text
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';

const AdminSettings = ({ navigation }) => {
  const [settings, setSettings] = useState({
    notificationsEnabled: true,
    emailAlerts: true,
    maintenanceMode: false,
    debugMode: false
  });

  const handleSettingChange = (key) => {
    setSettings({ ...settings, [key]: !settings[key] });
  };

  const SettingItem = ({ icon, title, description, settingKey }) => (
    <View style={styles.settingItem}>
      <View style={styles.settingContent}>
        <MaterialIcons name={icon} size={24} color="#007AFF" />
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingDesc}>{description}</Text>
        </View>
      </View>
      <Switch
        value={settings[settingKey]}
        onValueChange={() => handleSettingChange(settingKey)}
        trackColor={{ false: '#ccc', true: '#81C784' }}
        thumbColor={settings[settingKey] ? '#4CAF50' : '#999'}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={28} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Cấu Hình Hệ Thống</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* General Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cài Đặt Chung</Text>
          <Card style={styles.settingCard}>
            <Card.Content>
              <SettingItem
                icon="notifications"
                title="Thông Báo"
                description="Bật/tắt thông báo hệ thống"
                settingKey="notificationsEnabled"
              />
              <View style={{height: 1, backgroundColor: '#ccc', marginVertical: 10}} />
              <SettingItem
                icon="mail"
                title="Cảnh Báo Email"
                description="Gửi email cảnh báo quan trọng"
                settingKey="emailAlerts"
              />
            </Card.Content>
          </Card>
        </View>

        {/* System Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hệ Thống</Text>
          <Card style={styles.settingCard}>
            <Card.Content>
              <SettingItem
                icon="construction"
                title="Chế Độ Bảo Trì"
                description="Tắt truy cập người dùng"
                settingKey="maintenanceMode"
              />
              <View style={{height: 1, backgroundColor: '#ccc', marginVertical: 10}} />
              <SettingItem
                icon="bug-report"
                title="Chế Độ Debug"
                description="Hiển thị thông tin chi tiết"
                settingKey="debugMode"
              />
            </Card.Content>
          </Card>
        </View>

        {/* Admin Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quản Trị</Text>
          
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => Alert.alert('Thống Kê', 'Xem thống kê chi tiết hệ thống')}
          >
            <MaterialIcons name="analytics" size={24} color="#007AFF" />
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>Xem Thống Kê</Text>
              <Text style={styles.actionDesc}>Phân tích hoạt động hệ thống</Text>
            </View>
            <MaterialIcons name="arrow-forward" size={24} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => Alert.alert('Nhật Ký Kiểm Toán', 'Xem nhật ký hoạt động')}
          >
            <MaterialIcons name="history" size={24} color="#FF9800" />
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>Nhật Ký Kiểm Toán</Text>
              <Text style={styles.actionDesc}>Lịch sử các hành động hệ thống</Text>
            </View>
            <MaterialIcons name="arrow-forward" size={24} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => Alert.alert('Sao Lưu', 'Tạo sao lưu dữ liệu hệ thống')}
          >
            <MaterialIcons name="backup" size={24} color="#4CAF50" />
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>Sao Lưu Dữ Liệu</Text>
              <Text style={styles.actionDesc}>Tạo bản sao lưu hệ thống</Text>
            </View>
            <MaterialIcons name="arrow-forward" size={24} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => Alert.alert('Khôi Phục', 'Khôi phục từ bản sao lưu')}
          >
            <MaterialIcons name="restore" size={24} color="#2196F3" />
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>Khôi Phục Dữ Liệu</Text>
              <Text style={styles.actionDesc}>Phục hồi từ sao lưu trước đó</Text>
            </View>
            <MaterialIcons name="arrow-forward" size={24} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#F44336' }]}>Vùng Nguy Hiểm</Text>
          
          <Button
            mode="outlined"
            onPress={() =>
              Alert.alert(
                'Xóa Bộ Nhớ Cache',
                'Bạn có chắc chắn muốn xóa cache?',
                [
                  { text: 'Hủy', onPress: () => {} },
                  {
                    text: 'Xóa',
                    onPress: () => Alert.alert('Thành công', 'Cache đã được xóa'),
                    style: 'destructive'
                  }
                ]
              )
            }
            style={styles.dangerButton}
            labelStyle={{ color: '#F44336' }}
          >
            Xóa Cache
          </Button>

          <Button
            mode="outlined"
            onPress={() =>
              Alert.alert(
                'Khởi Động Lại Hệ Thống',
                'Tất cả người dùng sẽ bị đăng xuất',
                [
                  { text: 'Hủy', onPress: () => {} },
                  {
                    text: 'Khởi Động',
                    onPress: () => Alert.alert('Thành công', 'Hệ thống đã khởi động lại'),
                    style: 'destructive'
                  }
                ]
              )
            }
            style={[styles.dangerButton, { marginTop: 12 }]}
            labelStyle={{ color: '#F44336' }}
          >
            Khởi Động Lại Hệ Thống
          </Button>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
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
  settingCard: {
    borderRadius: 8,
    backgroundColor: '#fff'
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12
  },
  settingContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  settingText: {
    marginLeft: 16,
    flex: 1
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333'
  },
  settingDesc: {
    fontSize: 12,
    color: '#999',
    marginTop: 4
  },
  divider: {
    marginVertical: 8
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee'
  },
  actionText: {
    marginLeft: 16,
    flex: 1
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333'
  },
  actionDesc: {
    fontSize: 12,
    color: '#999',
    marginTop: 4
  },
  dangerButton: {
    borderColor: '#F44336',
    borderWidth: 1
  },
  bottomSpacing: {
    height: 24
  }
});

export default AdminSettings;
