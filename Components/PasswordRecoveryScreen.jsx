import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { apiRequest } from './api';

export default function PasswordRecoveryScreen({ navigation, route }) {
  const [email, setEmail] = useState(route.params?.email || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [requested, setRequested] = useState(false);
  const [complete, setComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const requestCode = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });
      setRequested(true);
      setMessage(result.message);
    } catch (requestError) {
      setError(requestError.message || 'The request could not be completed.');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), code: code.trim(), password }),
      });
      setComplete(true);
      setMessage(result.message);
    } catch (requestError) {
      setError(requestError.message || 'The request could not be completed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{complete ? 'Password updated' : 'Reset your password'}</Text>
      <Text style={styles.description}>
        {message || 'We will send a short-lived reset code if the email belongs to an account.'}
      </Text>
      {!complete && (
        <>
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
          {requested && (
            <>
              <TextInput
                accessibilityLabel="Six-digit reset code"
                autoComplete="one-time-code"
                keyboardType="number-pad"
                maxLength={6}
                onChangeText={setCode}
                placeholder="Six-digit reset code"
                style={styles.input}
                value={code}
              />
              <TextInput
                accessibilityLabel="New password"
                autoComplete="new-password"
                onChangeText={setPassword}
                placeholder="New password (at least 8 characters)"
                secureTextEntry
                style={styles.input}
                value={password}
              />
            </>
          )}
        </>
      )}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {!complete && (
        <TouchableOpacity
          accessibilityRole="button"
          disabled={loading}
          onPress={requested ? resetPassword : requestCode}
          style={styles.primary}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.primaryText}>{requested ? 'Set new password' : 'Send reset code'}</Text>}
        </TouchableOpacity>
      )}
      {requested && !complete && (
        <TouchableOpacity accessibilityRole="button" disabled={loading} onPress={requestCode} style={styles.secondary}>
          <Text style={styles.secondaryText}>Send another code</Text>
        </TouchableOpacity>
      )}
      {(complete || !requested) && (
        <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('Login', { email })}>
          <Text style={styles.link}>Back to sign in</Text>
        </TouchableOpacity>
      )}
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
