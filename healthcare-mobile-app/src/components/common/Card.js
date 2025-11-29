import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';

const Card = ({
  children,
  style,
  onPress,
  ...props
}) => {
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={[styles.card, style]}
      onPress={onPress}
      {...props}
    >
      {children}
    </Container>
  );
};

// Add Content as a passthrough component
Card.Content = ({ children, style }) => (
  <View style={style}>
    {children}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
});

export default Card;