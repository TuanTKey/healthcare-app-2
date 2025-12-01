import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import { MaterialIcons } from '@expo/vector-icons';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// Patient Screens
import PatientDashboard from '../screens/patient/DashboardScreen';
import AppointmentScreen from '../screens/patient/AppointmentScreen';
import MedicalRecordsScreen from '../screens/patient/MedicalRecordsScreen';
import MedicalRecordDetailScreen from '../screens/patient/MedicalRecordDetailScreen';
import MedicalRecordEditScreen from '../screens/patient/MedicalRecordEditScreen';
import PrescriptionsScreen from '../screens/patient/PrescriptionsScreen';
import BillingScreen from '../screens/patient/BillingScreen';

// Admin Screens
import AdminDashboard from '../screens/admin/AdminDashboard';

// Shared Screens
import ProfileScreen from '../screens/shared/ProfileScreen';

// Navigators
import AdminTabNavigator from './AdminNavigator';
import DoctorNavigator from './DoctorNavigator';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Patient Tab Navigator
const PatientTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;
        
        if (route.name === 'Dashboard') {
          iconName = 'dashboard';
        } else if (route.name === 'Appointments') {
          iconName = 'event';
        } else if (route.name === 'Records') {
          iconName = 'folder';
        } else if (route.name === 'Prescriptions') {
          iconName = 'local-pharmacy';
        } else if (route.name === 'Billing') {
          iconName = 'receipt';
        } else if (route.name === 'PatientProfile') {
          iconName = 'person';
        }

        return <MaterialIcons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#1976d2',
      tabBarInactiveTintColor: 'gray',
    })}
  >
    <Tab.Screen 
      name="Dashboard" 
      component={PatientDashboard}
      options={{ title: 'Trang chủ' }}
    />
    <Tab.Screen 
      name="Appointments" 
      component={AppointmentScreen}
      options={{ title: 'Lịch hẹn' }}
    />
    <Tab.Screen 
      name="Records" 
      component={MedicalRecordsScreen}
      options={{ title: 'Hồ sơ' }}
    />
    <Tab.Screen 
      name="Prescriptions" 
      component={PrescriptionsScreen}
      options={{ title: 'Đơn thuốc' }}
    />
    <Tab.Screen 
      name="Billing" 
      component={BillingScreen}
      options={{ title: 'Hóa đơn' }}
    />
    <Tab.Screen 
      name="PatientProfile" 
      component={ProfileScreen}
      options={{ title: 'Hồ sơ' }}
    />
  </Tab.Navigator>
);

const AppNavigator = () => {
  const { isAuthenticated, user } = useSelector(state => state.auth);

  return (
    <NavigationContainer>
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false,
          animation: 'slide_from_right'
        }}
      >
        {!isAuthenticated ? (
          // Auth Stack
          <>
            <Stack.Screen 
              name="Login" 
              component={LoginScreen}
              options={{ title: 'Đăng nhập' }}
            />
            <Stack.Screen 
              name="Register" 
              component={RegisterScreen}
              options={{ title: 'Đăng ký' }}
            />
            <Stack.Screen 
              name="ForgotPassword" 
              component={ForgotPasswordScreen}
              options={{ title: 'Quên mật khẩu' }}
            />
          </>
        ) : user?.role === 'PATIENT' ? (
          // Patient Stack
          <>
            <Stack.Screen 
              name="PatientTabs" 
              component={PatientTabNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="MedicalRecordDetail"
              component={MedicalRecordDetailScreen}
              options={{
                headerShown: true,
                title: 'Chi tiết hồ sơ bệnh án',
                presentation: 'card'
              }}
            />
            <Stack.Screen 
              name="MedicalRecordEdit"
              component={MedicalRecordEditScreen}
              options={{
                headerShown: true,
                title: 'Sửa hồ sơ bệnh án',
                presentation: 'card'
              }}
            />
            <Stack.Screen 
              name="Profile" 
              component={ProfileScreen}
              options={{ 
                headerShown: true, 
                title: 'Hồ sơ cá nhân',
                presentation: 'modal'
              }}
            />
          </>
        ) : user?.role === 'HOSPITAL_ADMIN' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' ? (
          // Admin Stack
          <>
            <Stack.Screen 
              name="AdminTabs" 
              component={AdminTabNavigator}
              options={{ headerShown: false }}
            />
          </>
        ) : user?.role === 'DOCTOR' ? (
          // Doctor Stack
          <>
            <Stack.Screen 
              name="DoctorMain" 
              component={DoctorNavigator}
              options={{ headerShown: false }}
            />
          </>
        ) : user?.role === 'NURSE' ? (
          // Nurse Stack (tạm thời dùng Doctor Navigator)
          <>
            <Stack.Screen 
              name="NurseMain" 
              component={DoctorNavigator}
              options={{ headerShown: false }}
            />
          </>
        ) : isAuthenticated ? (
          // Default untuk các role khác (DOCTOR, ADMIN, NURSE, etc)
          <>
            <Stack.Screen 
              name="PatientTabs" 
              component={PatientTabNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="Profile" 
              component={ProfileScreen}
              options={{ 
                headerShown: true, 
                title: 'Hồ sơ cá nhân',
                presentation: 'modal'
              }}
            />
          </>
        ) : (
          // Fallback - không authenticate
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;