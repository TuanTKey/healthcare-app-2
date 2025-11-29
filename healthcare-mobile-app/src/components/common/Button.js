import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';

const Button = ({
  onPress,
  loading,
  disabled,
  children,
  mode = 'contained',
  style,
  labelStyle,
  color = '#6200EE',
  title,
  variant = 'primary',
  ...props
}) => {
  // Support both 'children' and 'title' props
  const label = children || title;

  const isOutline = mode === 'outlined' || variant === 'secondary';
  const isText = mode === 'text';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        isOutline && styles.outlineButton,
        isText && styles.textButton,
        !isOutline && !isText && { backgroundColor: color || '#6200EE' },
        (disabled || loading) && styles.disabled,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={isOutline || isText ? color || '#6200EE' : '#fff'}
          size="small"
        />
      ) : (
        <Text
          style={[
            styles.buttonText,
            isOutline && { color: color || '#6200EE' },
            isText && { color: color || '#6200EE' },
            !isOutline && !isText && styles.buttonTextPrimary,
            labelStyle,
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  outlineButton: {
    borderWidth: 2,
    borderColor: '#6200EE',
    backgroundColor: 'transparent',
  },
  textButton: {
    backgroundColor: 'transparent',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextPrimary: {
    color: '#fff',
  },
  disabled: {
    opacity: 0.5,
  },
});

export default Button;