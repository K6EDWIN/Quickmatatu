import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Map = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Map Unavailable on Web</Text>
      <Text style={styles.subtitle}>
        The interactive map uses Native Modules (Mapbox) which are only available on Android and iOS.
      </Text>
      <Text style={styles.info}>
        Please open this app on an Android Emulator or Physical Device to see the live tracking.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
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
    color: '#555',
  },
  info: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  }
});

export default Map;