import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';

// Billing Screens
import BillingDashboard from '../screens/billing/BillingDashboard';
import AllBillsScreen from '../screens/billing/AllBillsScreen';
import BillDetailScreen from '../screens/billing/BillDetailScreen';
import CreateBillScreen from '../screens/billing/CreateBillScreen';
import ProcessPaymentScreen from '../screens/billing/ProcessPaymentScreen';
import PaymentHistoryScreen from '../screens/billing/PaymentHistoryScreen';
import RevenueReportScreen from '../screens/billing/RevenueReportScreen';

// Shared Screens
import ProfileScreen from '../screens/shared/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Billing Stack Navigator
const BillingStackNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: '#1976d2',
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }}
  >
    <Stack.Screen
      name="BillingDashboard"
      component={BillingDashboard}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="AllBills"
      component={AllBillsScreen}
      options={{ title: 'Tất cả hóa đơn' }}
    />
    <Stack.Screen
      name="BillDetail"
      component={BillDetailScreen}
      options={{ title: 'Chi tiết hóa đơn' }}
    />
    <Stack.Screen
      name="CreateBill"
      component={CreateBillScreen}
      options={{ title: 'Tạo hóa đơn mới' }}
    />
    <Stack.Screen
      name="ProcessPayment"
      component={ProcessPaymentScreen}
      options={{ title: 'Thu tiền' }}
    />
    <Stack.Screen
      name="PaymentHistory"
      component={PaymentHistoryScreen}
      options={{ title: 'Lịch sử thanh toán' }}
    />
    <Stack.Screen
      name="RevenueReport"
      component={RevenueReportScreen}
      options={{ title: 'Báo cáo doanh thu' }}
    />
  </Stack.Navigator>
);

// Billing Tab Navigator
const BillingTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;

        switch (route.name) {
          case 'Home':
            iconName = 'dashboard';
            break;
          case 'Bills':
            iconName = 'receipt';
            break;
          case 'Payment':
            iconName = 'payment';
            break;
          case 'Reports':
            iconName = 'bar-chart';
            break;
          case 'BillingProfile':
            iconName = 'person';
            break;
          default:
            iconName = 'circle';
        }

        return <MaterialIcons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#1976d2',
      tabBarInactiveTintColor: 'gray',
      headerStyle: {
        backgroundColor: '#1976d2',
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    })}
  >
    <Tab.Screen
      name="Home"
      component={BillingStackNavigator}
      options={{
        title: 'Trang chủ',
        headerShown: false,
      }}
    />
    <Tab.Screen
      name="Bills"
      component={AllBillsScreen}
      options={{
        title: 'Hóa đơn',
        headerTitle: 'Danh sách hóa đơn',
      }}
    />
    <Tab.Screen
      name="Payment"
      component={ProcessPaymentScreen}
      options={{
        title: 'Thu tiền',
        headerTitle: 'Xử lý thanh toán',
      }}
    />
    <Tab.Screen
      name="Reports"
      component={RevenueReportScreen}
      options={{
        title: 'Báo cáo',
        headerTitle: 'Báo cáo doanh thu',
      }}
    />
    <Tab.Screen
      name="BillingProfile"
      component={ProfileScreen}
      options={{
        title: 'Hồ sơ',
        headerTitle: 'Hồ sơ cá nhân',
      }}
    />
  </Tab.Navigator>
);

export default BillingTabNavigator;
