import React, { useState } from 'react';
import { View, Text, TextInput, Button, TouchableOpacity, ScrollView, Alert, Platform, ActivityIndicator } from 'react-native';
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
  
  const [loading, setLoading] = useState(false);
  const [visibleComponent, setVisibleComponent] = useState('CommuterRegistration');

  // SAFE API URL LOGIC
  // If we are on web and not localhost, force HTTPS or it will fail
  const getApiUrl = () => {
    let url = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
    if (Platform.OS === 'web' && window.location.protocol === 'https:' && url.startsWith('http:')) {
       // Automatic fix for mixed content: Try to upgrade localhost to relative path or just warn
       console.warn("Mixed Content Warning: You are on HTTPS but API is HTTP. Request will likely fail.");
    }
    return `${url.replace(/\/$/, '')}/api/register`;
  };

  const notify = (title, message) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

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
    if (!username || !password) {
      notify("Missing Info", "Please enter a username and password.");
      return;
    }

    setLoading(true);
    const API_ENDPOINT = getApiUrl();
    console.log("Registering to:", API_ENDPOINT);

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
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const text = await response.text();
      console.log("Server raw response:", text);

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Server Error (Not JSON): ${text.substring(0, 50)}`);
      }

      if (response.ok) {
        notify('Success', 'Registration successful!');
        navigation.navigate("Login");
      } else {
        notify('Registration Failed', data.error || data.message);
      }

    } catch (error) {
      console.error('Registration Error:', error);
      notify('Connection Error', error.message);
    } finally {
      setLoading(false);
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