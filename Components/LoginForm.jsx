import React, { useState } from "react";
import { View, Text, TextInput, Button, TouchableOpacity, Alert, Platform, ActivityIndicator } from "react-native";
import * as sessionStore from './sessionStore';
import styles from "../Styles";
import { getApiBaseUrl } from './api';
import GoogleSignInButton from './GoogleSignInButton';

const LoginForm = ({ navigation, route }) => {
  const [email, setEmail] = useState(route.params?.email || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('The server returned an invalid response.');
      }

      if (response.ok) {
        await sessionStore.setItem('userSession', JSON.stringify({ ...data.user, token: data.token }));
        setPassword('');

        // Check User Type from Server Response to Navigate
        const userType = data.user?.userType;
        navigation.reset({
          index: 0,
          routes: [{ name: userType === 'driver' ? 'DriverHomepage' : 'UserHomepage' }],
        });
      } else {
        notify("Login Failed", data.error || "Invalid credentials.");
      }
    } catch (error) {
      console.error("Login Error:", error);
      notify("Login Error", error.message || "Unable to connect to the server.");
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
          value={email}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TouchableOpacity onPress={() => navigation.navigate('PasswordRecovery', { email })}>
          <Text style={styles.linkText}>Forgot your password?</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#aaa"
          onChangeText={setPassword}
          value={password}
          secureTextEntry
        />

        {loading ? (
          <ActivityIndicator size="large" color="#1b4332" />
        ) : (
          <Button
            title="Log In"
            onPress={handleLogin}
            color="#1b4332"
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
        <TouchableOpacity onPress={() => navigation.navigate('VerifyEmail', { email })}>
          <Text style={styles.linkText}>Resend verification code</Text>
        </TouchableOpacity>
        <Text style={{ color: '#647067', marginTop: 16, textAlign: 'center' }}>or</Text>
        <GoogleSignInButton navigation={navigation} disabled={loading} />
      </View>
    </View>
  );
};

export default LoginForm;
