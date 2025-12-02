import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const Chip = ({
  children,
  label,
  style,
  textStyle,
  mode = 'outlined',
  onPress,
  icon,
  ...props
}) => {
  const isOutlined = mode === 'outlined';
  const chipStyles = [
    styles.chip,
    isOutlined ? styles.outlined : styles.filled,
    style,
  ];

  // Support both 'label' and 'children' props
  const content = label || children;

  return (
    <TouchableOpacity
      style={chipStyles}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
      {...props}
    >
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      {typeof content === 'string' ? (
        <Text style={[styles.text, textStyle]}>
          {content}
        </Text>
      ) : (
        content
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
  iconContainer: {
    marginRight: 4,
  },
});

export default Chip;
