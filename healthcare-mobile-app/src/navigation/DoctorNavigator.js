import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';

// Doctor Screens
import DoctorDashboard from '../screens/doctor/DoctorDashboard';
import DoctorAppointments from '../screens/doctor/DoctorAppointments';
import DoctorAppointmentDetail from '../screens/doctor/DoctorAppointmentDetail';
import DoctorPatients from '../screens/doctor/DoctorPatients';
import DoctorMedicalRecords from '../screens/doctor/DoctorMedicalRecords';
import DoctorRecordDetail from '../screens/doctor/DoctorRecordDetail';
import DoctorPrescriptions from '../screens/doctor/DoctorPrescriptions';
import DoctorLabOrders from '../screens/doctor/DoctorLabOrders';
import CreatePrescription from '../screens/doctor/CreatePrescription';
import DoctorHistory from '../screens/doctor/DoctorHistory';

// Shared Screens
import ProfileScreen from '../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Doctor Tab Navigator
const DoctorTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;
        
        switch (route.name) {
          case 'DoctorHome':
            iconName = 'dashboard';
            break;
          case 'DoctorAppointmentsTab':
            iconName = 'event';
            break;
          case 'DoctorPatientsTab':
            iconName = 'people';
            break;
          case 'DoctorRecordsTab':
            iconName = 'folder-shared';
            break;
          case 'DoctorProfileTab':
            iconName = 'person';
            break;
          default:
            iconName = 'circle';
        }

        return <MaterialIcons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#00796B',
      tabBarInactiveTintColor: '#999',
      tabBarStyle: {
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingBottom: 5,
        paddingTop: 5,
        height: 60
      },
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: '500'
      }
    })}
  >
    <Tab.Screen 
      name="DoctorHome" 
      component={DoctorDashboard}
      options={{ 
        title: 'Trang chủ',
        tabBarLabel: 'Trang chủ'
      }}
    />
    <Tab.Screen 
      name="DoctorAppointmentsTab" 
      component={DoctorAppointments}
      options={{ 
        title: 'Lịch hẹn',
        tabBarLabel: 'Lịch hẹn'
      }}
    />
    <Tab.Screen 
      name="DoctorPatientsTab" 
      component={DoctorPatients}
      options={{ 
        title: 'Bệnh nhân',
        tabBarLabel: 'Bệnh nhân'
      }}
    />
    <Tab.Screen 
      name="DoctorRecordsTab" 
      component={DoctorMedicalRecords}
      options={{ 
        title: 'Hồ sơ',
        tabBarLabel: 'Hồ sơ'
      }}
    />
    <Tab.Screen 
      name="DoctorProfileTab" 
      component={ProfileScreen}
      options={{ 
        title: 'Cá nhân',
        tabBarLabel: 'Cá nhân'
      }}
    />
  </Tab.Navigator>
);

// Main Doctor Stack Navigator (includes Tab + other screens)
const DoctorNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right'
    }}
  >
    <Stack.Screen 
      name="DoctorTabs" 
      component={DoctorTabNavigator} 
    />
    <Stack.Screen 
      name="DoctorAppointments" 
      component={DoctorAppointments}
      options={{
        headerShown: false
      }}
    />
    <Stack.Screen 
      name="DoctorPatients" 
      component={DoctorPatients}
      options={{
        headerShown: false
      }}
    />
    <Stack.Screen 
      name="DoctorMedicalRecords" 
      component={DoctorMedicalRecords}
      options={{
        headerShown: false
      }}
    />
    <Stack.Screen 
      name="DoctorPrescriptions" 
      component={DoctorPrescriptions}
      options={{
        headerShown: false
      }}
    />
    <Stack.Screen 
      name="DoctorLabOrders" 
      component={DoctorLabOrders}
      options={{
        headerShown: false
      }}
    />
    <Stack.Screen 
      name="DoctorProfile" 
      component={ProfileScreen}
      options={{
        headerShown: true,
        title: 'Hồ sơ cá nhân',
        presentation: 'modal'
      }}
    />
    {/* Placeholder screens - will be implemented later */}
    <Stack.Screen 
      name="DoctorAppointmentDetail" 
      component={DoctorAppointmentDetail}
      options={{
        headerShown: false
      }}
    />
    <Stack.Screen 
      name="DoctorPatientDetail" 
      component={DoctorPatients}
      options={{
        headerShown: true,
        title: 'Thông tin bệnh nhân'
      }}
    />
    <Stack.Screen 
      name="DoctorRecordDetail" 
      component={DoctorRecordDetail}
      options={{
        headerShown: false,
        title: 'Chi tiết hồ sơ'
      }}
    />
    <Stack.Screen 
      name="DoctorPrescriptionDetail" 
      component={DoctorPrescriptions}
      options={{
        headerShown: true,
        title: 'Chi tiết đơn thuốc'
      }}
    />
    <Stack.Screen 
      name="DoctorLabOrderDetail" 
      component={DoctorLabOrders}
      options={{
        headerShown: true,
        title: 'Chi tiết xét nghiệm'
      }}
    />
    <Stack.Screen 
      name="CreateMedicalRecord" 
      component={DoctorMedicalRecords}
      options={{
        headerShown: true,
        title: 'Tạo hồ sơ bệnh án'
      }}
    />
    <Stack.Screen 
      name="CreatePrescription" 
      component={CreatePrescription}
      options={{
        headerShown: false
      }}
    />
    <Stack.Screen 
      name="CreateLabOrder" 
      component={DoctorLabOrders}
      options={{
        headerShown: true,
        title: 'Tạo phiếu xét nghiệm'
      }}
    />
    <Stack.Screen 
      name="DoctorHistory" 
      component={DoctorHistory}
      options={{
        headerShown: false,
        title: 'Lịch sử khám'
      }}
    />
    <Stack.Screen 
      name="DoctorSettings" 
      component={ProfileScreen}
      options={{
        headerShown: true,
        title: 'Cài đặt'
      }}
    />
  </Stack.Navigator>
);

export default DoctorNavigator;
