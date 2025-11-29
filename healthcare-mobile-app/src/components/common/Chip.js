import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const Chip = ({
  children,
  style,
  textStyle,
  mode = 'outlined',
  onPress,
  ...props
}) => {
  const isOutlined = mode === 'outlined';
  const chipStyles = [
    styles.chip,
    isOutlined ? styles.outlined : styles.filled,
    style,
  ];

  return (
    <TouchableOpacity
      style={chipStyles}
      onPress={onPress}
      disabled={!onPress}
      {...props}
    >
      {typeof children === 'string' ? (
        <Text style={[styles.text, textStyle]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  outlined: {
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: 'transparent',
  },
  filled: {
    backgroundColor: '#007AFF',
  },
  text: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
});

export default Chip;
