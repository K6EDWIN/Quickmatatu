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

  // SAFE API URL: If the env var is missing, it will warn you in the console
  const API_URL = process.env.EXPO_PUBLIC_API_URL 
    ? `${process.env.EXPO_PUBLIC_API_URL}/api/register`
    : 'http://localhost:3001/api/register';

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
              autoCapitalize="none"
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
              placeholder="Email (Optional)"
              placeholderTextColor="#aaa"
              onChangeText={setEmail}
              value={email}
              keyboardType="email-address"
              autoCapitalize="none"
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
    console.log("Register button pressed.");
    
    // 1. Validate fields before sending
    if (!username || !password) {
        Alert.alert("Missing Info", "Please enter a username and password.");
        return;
    }
    if (userType === 'commuter' && !email) {
        Alert.alert("Missing Info", "Please enter an email address.");
        return;
    }

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

    console.log(`Sending request to: ${API_URL}`);
    console.log("Payload:", userData);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json(); // Try to parse JSON

      if (response.ok) {
        console.log('Success:', data);
        Alert.alert('Success', 'Registration successful!', [
            { text: "OK", onPress: () => navigation.navigate("Login") }
        ]);
      } else {
        console.error('Server Error:', data);
        Alert.alert('Registration Failed', data.error || data.message || "Unknown server error");
      }
    } catch (error) {
      console.error('Network Error:', error);
      Alert.alert(
        'Connection Error', 
        `Could not connect to server at ${API_URL}.\n\nCheck your internet connection.`
      );
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