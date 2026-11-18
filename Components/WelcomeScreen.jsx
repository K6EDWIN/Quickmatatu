import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Image } from 'react-native';

const WelcomeScreen = ({ navigation }) => {
  const [modalVisible, setModalVisible] = useState(false);

  const handleProceed = () => {
    setModalVisible(true);  
  };

  const goToSignUp = () => {
    setModalVisible(false); 
    navigation.navigate('Registration'); 
  };

  const goToLogIn = () => {
    setModalVisible(false); 
    navigation.navigate('Login'); 
  };

  return (
    <View style={styles.container}>
      <Text style={styles.welcomeText}>Welcome to QuickMatatu</Text>
      <Image
        source={require('../assets/QuickMatatu.png')}
        style={styles.logo}
        accessibilityLabel="QuickMatatu logo"
      />
      <Text style={styles.subtitle}>Plan a route and send a ride request.</Text>
      <TouchableOpacity style={styles.proceedButton} onPress={handleProceed} accessibilityRole="button">
        <Text style={styles.proceedText}>Get started</Text>
      </TouchableOpacity>
      
      {/* Modal for Sign In / Log In */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalText}>Please Sign In or Log In</Text>
            <TouchableOpacity style={styles.modalButton} onPress={goToSignUp}>
              <Text style={styles.modalButtonText}>Sign Up</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalButton} onPress={goToLogIn}>
              <Text style={styles.modalButtonText}>Log In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f7f5ef',
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1b4332',
  },
  logo: {
    width: 300,
    height: 300,
    marginBottom: 8,
  },
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(27, 67, 50, 0.5)',
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalText: {
    fontSize: 18,
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#1b4332',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
    width: 150,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
  },
  subtitle: { color: '#475569', textAlign: 'center', marginBottom: 24 },
  proceedButton: { backgroundColor: '#1b4332', minWidth: 180, padding: 15, borderRadius: 12, alignItems: 'center' },
  proceedText: { color: 'white', fontWeight: '700', fontSize: 16 },
});

export default WelcomeScreen;
