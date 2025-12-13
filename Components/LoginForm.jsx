import React, { useState } from "react";
import { View, Text, TextInput, Button, TouchableOpacity, Alert, Platform, ActivityIndicator } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage'; // IMPORT ADDED
import styles from "../Styles";

const LoginForm = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // SAFE API URL LOGIC
  const getApiUrl = () => {
    let url = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
    const baseUrl = url.replace(/\/api\/login\/?$/, '').replace(/\/api\/?$/, '').replace(/\/$/, '');
    return `${baseUrl}/api/login`;
  };

  const notify = (title, message) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      notify("Error", "Please enter both email and password.");
      return;
    }

    setLoading(true);
    const API_ENDPOINT = getApiUrl();
    console.log("Logging in to:", API_ENDPOINT);

    try {
      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Server Error: ${text.substring(0, 50)}...`);
      }

      console.log("Login response:", data);

      if (response.ok) {
        // --- CRITICAL FIX: Save User to Local Storage ---
        // This ensures the Tickets Page knows who you are
        if (data.user) {
            try {
                await AsyncStorage.setItem('userSession', JSON.stringify(data.user));
                console.log("Session saved locally");
            } catch (storageError) {
                console.error("Failed to save session locally", storageError);
            }
        }

        // Check User Type from Server Response to Navigate
        const userType = data.user?.userType;
        
        if (userType === 'driver') {
          navigation.navigate("DriverHomepage");
        } else {
          navigation.navigate("UserHomepage");
        }
      } else {
        notify("Login Failed", data.error || "Invalid credentials.");
      }
    } catch (error) {
      console.error("Login Error:", error);
      notify("Connection Error", "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Welcome Back</Text>
      <Text style={[styles.label, { textAlign: 'center', marginBottom: 20 }]}>
        Log in to your account
      </Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Email Address"
          placeholderTextColor="#aaa"
          onChangeText={setEmail}
          defaultValue={email}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#aaa"
          onChangeText={setPassword}
          defaultValue={password}
          secureTextEntry
        />

        {/* Forgot Password Link (Visual only for now) */}
        <TouchableOpacity style={{ alignSelf: 'flex-end', marginBottom: 20 }}>
           <Text style={{ color: 'black' }}>Forgot Password?</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator size="large" color="black" />
        ) : (
          <Button
            title="Log In"
            onPress={handleLogin}
            color="black"
            style={styles.button}
          />
        )}

        <TouchableOpacity
          onPress={() => {
            navigation.navigate("Registration");
          }}
          style={{ marginTop: 15 }}
        >
          <Text style={styles.linkText}>Don't have an account? Register Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default LoginForm;