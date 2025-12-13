import React, { useState } from 'react';
import { View, Text, TextInput, Button, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
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
  
  // NEW: Loading state to give feedback
  const [loading, setLoading] = useState(false);

  const [visibleComponent, setVisibleComponent] = useState('CommuterRegistration');

  // Determine the API URL
  const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
  // Ensure we don't have double slashes if the env var has a trailing slash
  const API_ENDPOINT = `${BASE_URL.replace(/\/$/, '')}/api/register`;

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
    // 1. Validation
    if (!username || !password) {
      Alert.alert("Missing Info", "Please enter a username and password.");
      return;
    }

    setLoading(true); // Start loading

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

    console.log("Attempting register to:", API_ENDPOINT);

    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      // 2. Read as text first to avoid JSON parse errors
      const text = await response.text();
      console.log("Server response:", text);

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        // If parsing fails, it's likely a Vercel 500 error page
        throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}...`);
      }

      if (response.ok) {
        Alert.alert('Success', 'Registration successful!', [
          { text: "OK", onPress: () => navigation.navigate("Login") }
        ]);
      } else {
        Alert.alert('Registration Failed', data.error || data.message || "Unknown error");
      }

    } catch (error) {
      console.error('Fetch error:', error);
      Alert.alert('Connection Error', `Failed to connect to:\n${API_ENDPOINT}\n\nError: ${error.message}`);
    } finally {
      setLoading(false); // Stop loading
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

          {/* Show a spinner if loading, otherwise show the button */}
          {loading ? (
            <ActivityIndicator size="large" color="black" style={{ marginTop: 20 }} />
          ) : (
            <Button
              title="Register"
              onPress={handleRegister}
              color="black"
              style={styles.submitButton}
            />
          )}
          
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.linkText}>Already have an account? Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default RegistrationForm;