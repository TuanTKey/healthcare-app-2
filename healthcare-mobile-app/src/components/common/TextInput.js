import React from 'react';
import { TextInput as RNTextInput, StyleSheet, View, Text } from 'react-native';

const TextInput = ({
  label,
  error,
  disabled,
  style,
  secureTextEntry,
  ...props
}) => {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <RNTextInput
        style={[
          styles.input,
          error && styles.inputError,
          disabled && styles.disabled,
          style,
        ]}
        editable={!disabled}
        selectTextOnFocus={!disabled}
        secureTextEntry={secureTextEntry}
        placeholderTextColor="#999"
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#f44336',
  },
  disabled: {
    backgroundColor: '#f5f5f5',
    opacity: 0.6,
  },
  errorText: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 4,
  },
});

export default TextInput;
