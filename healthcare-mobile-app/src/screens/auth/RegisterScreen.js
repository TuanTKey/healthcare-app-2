import React from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Text } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useForm, Controller } from 'react-hook-form';
import { register } from '../../store/slices/authSlice';
import Button from '../../components/common/Button';
import TextInput from '../../components/common/TextInput';

const RegisterScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { isRegistering, error } = useSelector(state => state.auth);
  
  const { control, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      phone: '',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'MALE'
    }
  });

  const onSubmit = async (data) => {
    try {
      if (data.password !== data.confirmPassword) {
        alert('Mật khẩu xác nhận không khớp');
        return;
      }

      const userData = {
        email: data.email,
        password: data.password,
        confirmPassword: data.confirmPassword,
        role: 'PATIENT',
        personalInfo: {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          dateOfBirth: data.dateOfBirth.toISOString().split('T')[0],
          gender: data.gender
        }
      };

      const result = await dispatch(register(userData)).unwrap();
      console.log('✅ Register result:', result);
      
      // Đăng ký thành công - nếu đã có token thì không cần navigate
      if (result.token && result.user) {
        // Đã auto login, không cần navigate
        alert(result.message || 'Đăng ký thành công!');
      } else {
        // Cần đăng nhập riêng
        alert(result.message || 'Đăng ký thành công! Vui lòng đăng nhập.');
        navigation.navigate('Login');
      }
    } catch (error) {
      console.log('❌ Register error:', error);
      // Hiển thị lỗi từ server hoặc message mặc định
      const errorMessage = error?.message || error?.error || 'Đăng ký thất bại. Vui lòng thử lại.';
      alert(errorMessage);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Đăng ký tài khoản
          </Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            rules={{ required: 'Họ là bắt buộc' }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Họ"
                mode="outlined"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={!!errors.lastName}
                style={styles.input}
              />
            )}
            name="lastName"
          />
          {errors.lastName && <Text style={styles.errorText}>{errors.lastName.message}</Text>}

          <Controller
            control={control}
            rules={{ required: 'Tên là bắt buộc' }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Tên"
                mode="outlined"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={!!errors.firstName}
                style={styles.input}
              />
            )}
            name="firstName"
          />
          {errors.firstName && <Text style={styles.errorText}>{errors.firstName.message}</Text>}

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
                mode="outlined"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={!!errors.email}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
              />
            )}
            name="email"
          />
          {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}

          <Controller
            control={control}
            rules={{ required: 'Số điện thoại là bắt buộc' }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Số điện thoại"
                mode="outlined"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={!!errors.phone}
                keyboardType="phone-pad"
                style={styles.input}
              />
            )}
            name="phone"
          />
          {errors.phone && <Text style={styles.errorText}>{errors.phone.message}</Text>}

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
                mode="outlined"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={!!errors.password}
                secureTextEntry
                style={styles.input}
              />
            )}
            name="password"
          />
          {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}

          <Controller
            control={control}
            rules={{
              required: 'Xác nhận mật khẩu là bắt buộc',
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Xác nhận mật khẩu"
                mode="outlined"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={!!errors.confirmPassword}
                secureTextEntry
                style={styles.input}
              />
            )}
            name="confirmPassword"
          />
          {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword.message}</Text>}

          <Button
            title={isRegistering ? "Đang đăng ký..." : "Đăng ký"}
            onPress={handleSubmit(onSubmit)}
            loading={isRegistering}
            disabled={isRegistering}
            style={styles.registerButton}
          />

          <Text 
            style={styles.link}
            onPress={() => navigation.navigate('Login')}
          >
            Đã có tài khoản? Đăng nhập
          </Text>
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
    marginBottom: 30,
  },
  title: {
    fontWeight: 'bold',
    color: '#1976d2',
  },
  form: {
    width: '100%',
  },
  input: {
    marginBottom: 12,
  },
  registerButton: {
    marginTop: 8,
    marginBottom: 20,
  },
  link: {
    color: '#1976d2',
    textAlign: 'center',
    fontWeight: '500',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    marginBottom: 8,
    marginLeft: 4,
  },
});

export default RegisterScreen;