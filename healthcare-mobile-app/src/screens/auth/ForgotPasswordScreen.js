import React from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import Button from '../../components/common/Button';

const ForgotPasswordScreen = ({ navigation }) => {
  const { control, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      email: ''
    }
  });

  const onSubmit = async (data) => {
    try {
      console.log('Reset password for:', data.email);
      alert('Yêu cầu đặt lại mật khẩu đã được gửi đến email của bạn.');
      navigation.navigate('Login');
    } catch (error) {
      alert('Có lỗi xảy ra. Vui lòng thử lại.');
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
            Quên mật khẩu
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Nhập email của bạn để nhận liên kết đặt lại mật khẩu
          </Text>
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

          <Button
            title="Gửi yêu cầu"
            onPress={handleSubmit(onSubmit)}
            style={styles.submitButton}
          />

          <Text 
            style={styles.link}
            onPress={() => navigation.navigate('Login')}
          >
            Quay lại đăng nhập
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
    marginBottom: 40,
  },
  title: {
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
  },
  form: {
    width: '100%',
  },
  input: {
    marginBottom: 20,
  },
  submitButton: {
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

export default ForgotPasswordScreen;