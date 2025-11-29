import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Text,
  TextInput as RNTextInput,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useForm, Controller } from 'react-hook-form';
import { login, getCurrentUser, clearError } from '../../store/slices/authSlice';
import Button from '../../components/common/Button';
import TextInput from '../../components/common/TextInput';

const LoginScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { isAuthenticated, isLoading, error, user } = useSelector(state => state.auth);
  
  const { control, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      email: '',
      password: ''
    }
  });

  // Debug Redux state changes
  useEffect(() => {
    console.log('🔍 Auth State Changed:', {
      isAuthenticated,
      isLoading,
      error: error?.message,
      user: user ? `${user.personalInfo?.firstName} (${user.role})` : 'null'
    });
  }, [isAuthenticated, isLoading, error, user]);

  // Check authentication status and redirect
  useEffect(() => {
    console.log('🔄 Checking auth status...');
    if (isAuthenticated && user) {
      console.log('🎯 User authenticated, should redirect to dashboard');
      console.log('User details:', {
        name: `${user.personalInfo?.firstName} ${user.personalInfo?.lastName}`,
        email: user.email,
        role: user.role
      });
      
      // Navigation sẽ được xử lý bởi AppNavigator dựa trên Redux state
    }
  }, [isAuthenticated, user, navigation]);

  useEffect(() => {
    if (error) {
      Alert.alert('Lỗi đăng nhập', error.message || 'Đăng nhập thất bại');
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const onSubmit = async (data) => {
    try {
      console.log('🚀 Submitting login form...');
      const result = await dispatch(login(data)).unwrap();
      console.log('🎊 Login successful in component:', result);
    } catch (error) {
      console.log('💥 Login failed in component:', error);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>
            Healthcare System
          </Text>
          <Text style={styles.subtitle}>
            {isAuthenticated ? 'Đang chuyển hướng...' : 'Đăng nhập vào tài khoản của bạn'}
          </Text>
          
          {/* Debug Info */}
          {isAuthenticated && (
            <View style={styles.debugCard}>
              <Text style={styles.debugText}>
                ✅ Đăng nhập thành công! Đang chuyển hướng...
              </Text>
              <Text style={styles.debugText}>
                👤 {user?.personalInfo?.firstName} ({user?.role})
              </Text>
            </View>
          )}
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            rules={{
              required: 'Email là bắt buộc',
              pattern: {
                value: /^\S+@\S+$/i,
                message: 'Email không hợp lệ'
              }
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Email"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.email?.message}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="Nhập email"
                editable={!isAuthenticated}
              />
            )}
            name="email"
          />

          <Controller
            control={control}
            rules={{
              required: 'Mật khẩu là bắt buộc',
              minLength: {
                value: 6,
                message: 'Mật khẩu phải có ít nhất 6 ký tự'
              }
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Mật khẩu"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.password?.message}
                secureTextEntry
                placeholder="Nhập mật khẩu"
                editable={!isAuthenticated}
              />
            )}
            name="password"
          />

          <Button
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            disabled={isLoading || isAuthenticated}
            style={styles.loginButton}
          >
            {isLoading ? "Đang đăng nhập..." : isAuthenticated ? "Đã đăng nhập ✓" : "Đăng nhập"}
          </Button>

          {!isAuthenticated && (
            <View style={styles.links}>
              <Text 
                style={styles.link}
                onPress={() => navigation.navigate('ForgotPassword')}
              >
                Quên mật khẩu?
              </Text>
              <Text 
                style={styles.link}
                onPress={() => navigation.navigate('Register')}
              >
                Đăng ký tài khoản mới
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1976d2',
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
  debugCard: {
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderColor: '#4caf50',
    borderWidth: 1,
  },
  debugText: {
    color: '#2e7d32',
    textAlign: 'center',
    fontSize: 12,
  },
  form: {
    width: '100%',
  },
  loginButton: {
    marginTop: 8,
    marginBottom: 20,
  },
  links: {
    alignItems: 'center',
  },
  link: {
    color: '#1976d2',
    marginVertical: 4,
    fontWeight: '500',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    marginBottom: 8,
    marginLeft: 4,
  },
});

export default LoginScreen;