import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Map = ({ searchQuery }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Driver map unavailable on web</Text>
      <Text style={styles.subtitle}>
        The driver map requires the native map provider. Location sharing controls remain available separately.
      </Text>
      <Text style={styles.info}>
        No vehicle position or arrival time is simulated here.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f5ef',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#475569',
  },
  info: {
    fontSize: 14,
    color: '#647067',
    textAlign: 'center',
  }
});

export default Map;