import React, { useState } from 'react';
import { View, Text, Button, Modal, StyleSheet, TouchableOpacity, Image } from 'react-native';

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
      <Text style={styles.welcomeText}>Welcome to Quick Matatu</Text>
      <Image
        source={require('../assets/QuickMatatu.png')}
        style={styles.logo}
      />
      <Button title="Proceed" onPress={handleProceed} />
      
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
    padding: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  logo: {
    width: 300,
    height: 300,
    marginBottom: 20,
  },
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    backgroundColor: '#007bff',
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
});

export default WelcomeScreen;
