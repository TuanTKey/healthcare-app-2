import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';

import AdminDashboard from '../screens/admin/AdminDashboard';
import ProfileScreen from '../screens/shared/ProfileScreen';
import UserManagement from '../screens/admin/UserManagement';
import AppointmentList from '../screens/admin/AppointmentList';
import Reports from '../screens/admin/Reports';
import AdminSettings from '../screens/admin/AdminSettings';
import PatientMedicalRecordsScreen from '../screens/admin/PatientMedicalRecordsScreen';
import PatientPrescriptionsScreen from '../screens/admin/PatientPrescriptionsScreen';
import PatientBillsScreen from '../screens/admin/PatientBillsScreen';
import PrescriptionDetailScreen from '../screens/admin/PrescriptionDetailScreen';
import BillDetailScreen from '../screens/admin/BillDetailScreen';
import MedicalRecordDetailScreen from '../screens/patient/MedicalRecordDetailScreen';
import MedicalRecordEditScreen from '../screens/patient/MedicalRecordEditScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const AdminDashboardStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false
    }}
  >
    <Stack.Screen name="AdminDashboardHome" component={AdminDashboard} />
    <Stack.Screen 
      name="UserManagement" 
      component={UserManagement}
      options={{ title: 'Quản Lý Users' }}
    />
    <Stack.Screen 
      name="AppointmentList" 
      component={AppointmentList}
      options={{ title: 'Lịch Hẹn' }}
    />
    <Stack.Screen 
      name="PatientMedicalRecords"
      component={PatientMedicalRecordsScreen}
      options={{ 
        title: 'Quản Lý Hồ Sơ Bệnh Án',
        headerShown: true
      }}
    />
    <Stack.Screen 
      name="PatientPrescriptions"
      component={PatientPrescriptionsScreen}
      options={{ 
        title: 'Quản Lý Đơn Thuốc',
        headerShown: true
      }}
    />
    <Stack.Screen 
      name="PrescriptionDetail"
      component={PrescriptionDetailScreen}
      options={{
        title: 'Chi tiết đơn thuốc',
        headerShown: true
      }}
    />
    <Stack.Screen 
      name="PatientBills"
      component={PatientBillsScreen}
      options={{ 
        title: 'Quản Lý Hoá Đơn',
        headerShown: true
      }}
    />
    <Stack.Screen 
      name="BillDetail"
      component={BillDetailScreen}
      options={{
        title: 'Chi tiết hoá đơn',
        headerShown: true
      }}
    />
    <Stack.Screen 
      name="MedicalRecordDetail"
      component={MedicalRecordDetailScreen}
      options={{
        title: 'Chi tiết hồ sơ bệnh án',
        headerShown: true
      }}
    />
    <Stack.Screen 
      name="MedicalRecordEdit"
      component={MedicalRecordEditScreen}
      options={{
        title: 'Sửa hồ sơ bệnh án',
        headerShown: true
      }}
    />
    <Stack.Screen 
      name="Reports" 
      component={Reports}
      options={{ title: 'Báo Cáo' }}
    />
    <Stack.Screen 
      name="AdminSettings" 
      component={AdminSettings}
      options={{ title: 'Cấu Hình' }}
    />
  </Stack.Navigator>
);

const AdminTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;
        
        if (route.name === 'AdminHome') {
          iconName = 'dashboard';
        } else if (route.name === 'Profile') {
          iconName = 'person';
        }

        return <MaterialIcons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#1976d2',
      tabBarInactiveTintColor: 'gray',
      headerShown: false,
    })}
  >
    <Tab.Screen 
      name="AdminHome" 
      component={AdminDashboardStack}
      options={{ 
        title: 'Dashboard',
        headerShown: false 
      }}
    />
    <Tab.Screen 
      name="Profile" 
      component={ProfileScreen}
      options={{ 
        title: 'Hồ sơ',
        headerShown: true
      }}
    />
  </Tab.Navigator>
);

export default AdminTabNavigator;
