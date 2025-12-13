import React, { useState } from 'react';
import { View, Text, TextInput, Button, TouchableOpacity, ScrollView, Alert } from 'react-native';
import styles from '../Styles';

const RegistrationForm = ({ navigation }) => {
  const [userType, setUserType] = useState("commuter");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [driverName, setDriverName] = useState("");
  const [vehicleLicensePlate, setVehicleLicensePlate] = useState("");
  const [license, setLicense] = useState("");
  const [nationalId, setNationalId] = useState("");

  const [visibleComponent, setVisibleComponent] = useState('CommuterRegistration');

  // Use environment variable, fallback to localhost for development
  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

  const renderInputs = () => {
    if (visibleComponent === 'CommuterRegistration') {
      return (
        <View style={styles.container}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#aaa"
              onChangeText={setUsername}
              value={username}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#aaa"
              onChangeText={setEmail}
              value={email}
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#aaa"
              onChangeText={setPassword}
              value={password}
              secureTextEntry
            />
          </View>
        </View>
      );
    } else if (visibleComponent === 'DriverRegistration') {
      return (
        <View style={styles.container}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#aaa"
              onChangeText={setUsername}
              value={username}
            />
            <TextInput
              style={styles.input}
              placeholder="Driver Name"
              placeholderTextColor="#aaa"
              onChangeText={setDriverName}
              value={driverName}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#aaa"
              onChangeText={setEmail}
              value={email}
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#aaa"
              onChangeText={setPassword}
              value={password}
              secureTextEntry
            />
            <TextInput
              style={styles.input}
              placeholder="Vehicle License Plate"
              placeholderTextColor="#aaa"
              onChangeText={setVehicleLicensePlate}
              value={vehicleLicensePlate}
            />
            <TextInput
              style={styles.input}
              placeholder="Driver's License"
              placeholderTextColor="#aaa"
              onChangeText={setLicense}
              value={license}
            />
            <TextInput
              style={styles.input}
              placeholder="National ID"
              placeholderTextColor="#aaa"
              onChangeText={setNationalId}
              value={nationalId}
              keyboardType="numeric"
            />
          </View>
        </View>
      );
    }
  };

  const handleRegister = async () => {
    const userData = {
      userType,
      username,
      driverName,
      email,
      password,
      vehicleLicensePlate,
      license,
      nationalId
    };

    try {
      const response = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        const data = await response.json();
        Alert.alert('Success', 'Registration successful!');
        navigation.navigate("Login");
      } else {
        const errorData = await response.json();
        Alert.alert('Registration failed', errorData.message || errorData.error);
      }
    } catch (error) {
      console.error('An error occurred:', error);
      Alert.alert('Error', 'Unable to connect to the server. Please try again.');
    }
  };

  const UserTypeSelector = ({ setVisibleComponent }) => {
    return (
      <>
        <Text style={styles.header}>Register</Text>
        <View style={styles.userTypeContainer}>
          <TouchableOpacity
            style={[
              styles.button, 
              // If commuter, use black (default), otherwise use grey
              { backgroundColor: userType === 'commuter' ? 'black' : 'grey' }
            ]}
            onPress={() => {
              setVisibleComponent('CommuterRegistration');
              setUserType('commuter');
            }}
          >
            <Text style={styles.buttonText}>Commuter</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button,
              // If driver, use black, otherwise use grey
              { backgroundColor: userType === 'driver' ? 'black' : 'grey' }
            ]}
            onPress={() => {
              setVisibleComponent('DriverRegistration');
              setUserType('driver');
            }}
          >
            <Text style={styles.buttonText}>Driver</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  return (
    <ScrollView style={{ backgroundColor: 'rgb(255, 255, 255)' }}>
      <View style={styles.container}>
        <UserTypeSelector setVisibleComponent={setVisibleComponent} />
        
        <View style={styles.inputContainer}>
          {renderInputs()}

          <Button
            title="Register"
            onPress={handleRegister}
            color="black"
            style={styles.submitButton}
          />
          
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.linkText}>Already have an account? Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default RegistrationForm;