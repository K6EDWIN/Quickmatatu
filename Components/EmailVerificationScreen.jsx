import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { apiRequest } from './api';

export default function EmailVerificationScreen({ navigation, route }) {
  const [email, setEmail] = useState(route.params?.email || '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('Enter the six-digit code sent to your email.');
  const [error, setError] = useState('');

  const submit = async (path, body) => {
    setLoading(true);
    setError('');
    try {
      const result = await apiRequest(path, { method: 'POST', body: JSON.stringify(body) });
      setMessage(result.message);
      return true;
    } catch (requestError) {
      setError(requestError.message || 'The request could not be completed.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    if (await submit('/auth/verify-email', { email: email.trim(), code: code.trim() })) {
      navigation.navigate('Login', { email: email.trim().toLowerCase() });
    }
  };

  const resend = () => submit('/auth/resend-verification', { email: email.trim() });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify your email</Text>
      <Text style={styles.description}>{message}</Text>
      <TextInput
        accessibilityLabel="Email address"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="Email address"
        style={styles.input}
        value={email}
      />
      <TextInput
        accessibilityLabel="Six-digit verification code"
        autoComplete="one-time-code"
        keyboardType="number-pad"
        maxLength={6}
        onChangeText={setCode}
        placeholder="Six-digit code"
        style={styles.input}
        value={code}
      />
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <TouchableOpacity accessibilityRole="button" disabled={loading} onPress={verify} style={styles.primary}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Verify email</Text>}
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" disabled={loading} onPress={resend} style={styles.secondary}>
        <Text style={styles.secondaryText}>Resend verification code</Text>
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('Login', { email })}>
        <Text style={styles.link}>Back to sign in</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f5ef', justifyContent: 'center', padding: 24 },
  title: { color: '#1b4332', fontSize: 26, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  description: { color: '#475569', lineHeight: 22, marginBottom: 18, textAlign: 'center' },
  input: { backgroundColor: '#fff', borderColor: '#d8ddd8', borderRadius: 9, borderWidth: 1, marginBottom: 12, padding: 14 },
  primary: { alignItems: 'center', backgroundColor: '#2d6a4f', borderRadius: 9, marginTop: 4, padding: 14 },
  primaryText: { color: '#fff', fontWeight: '700' },
  secondary: { alignItems: 'center', borderColor: '#2d6a4f', borderRadius: 9, borderWidth: 1, marginTop: 10, padding: 13 },
  secondaryText: { color: '#1b4332', fontWeight: '600' },
  link: { color: '#1b4332', marginTop: 20, textAlign: 'center', textDecorationLine: 'underline' },
  error: { color: '#b42318', marginBottom: 8, textAlign: 'center' },
});
