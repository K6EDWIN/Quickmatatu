import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button } from 'react-native';
import React, { useState } from 'react';
import HistoryScreen from './HistoryScreen';

export default function App() {
  const [activeScreen, setActiveScreen] = useState("home"); 

  return (
    <View style={styles.container}>
      {activeScreen === "home" ? (
        <>
          <Text>Welcome to the Home Screen!</Text>
          <Button title="Go to History" onPress={() => setActiveScreen("history")} />
        </>
      ) : (
        <>
          <HistoryScreen />
        </>
      )}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
