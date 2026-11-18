import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Text, TouchableOpacity, View } from 'react-native';
import { useIdTokenAuthRequest } from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as sessionStore from './sessionStore';
import { apiRequest } from './api';

WebBrowser.maybeCompleteAuthSession();

const clientIds = {
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
};

function platformClientId() {
  if (Platform.OS === 'ios') return clientIds.iosClientId;
  if (Platform.OS === 'android') return clientIds.androidClientId;
  return clientIds.webClientId;
}

function ConfiguredGoogleRequest({ nonce, prompt, onToken, onCancel, onError }) {
  const [request, response, promptAsync] = useIdTokenAuthRequest({
    ...clientIds,
    selectAccount: true,
    extraParams: nonce ? { nonce } : undefined,
  }, process.env.EXPO_PUBLIC_GOOGLE_NATIVE_REDIRECT_URI
    ? { native: process.env.EXPO_PUBLIC_GOOGLE_NATIVE_REDIRECT_URI }
    : {});
  const promptedNonce = useRef(null);
  const handledResponse = useRef(null);

  useEffect(() => {
    if (!prompt || !nonce || !request || promptedNonce.current === nonce) return;
    promptedNonce.current = nonce;
    promptAsync().then((result) => {
      if (result.type !== 'success') onCancel();
    }).catch(onError);
  }, [nonce, onCancel, onError, prompt, promptAsync, request]);

  useEffect(() => {
    if (response?.type !== 'success' || handledResponse.current === response) return;
    handledResponse.current = response;
    const idToken = response.params?.id_token || response.authentication?.idToken;
    if (!idToken || !nonce) {
      onError(new Error('Google did not return a usable ID token.'));
      return;
    }
    onToken(idToken, nonce).catch(onError);
  }, [nonce, onError, onToken, response]);

  return null;
}

export default function GoogleSignInButton({ navigation, disabled = false }) {
  const [nonce, setNonce] = useState(null);
  const [prompt, setPrompt] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const configured = Boolean(platformClientId());

  const clearAttempt = () => {
    setNonce(null);
    setPrompt(false);
    setBusy(false);
  };

  const handleError = (authError) => {
    setError(authError.message || 'Google sign-in could not be completed.');
    clearAttempt();
  };

  const handleGoogleToken = async (idToken, requestNonce) => {
    try {
      const session = await apiRequest('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ idToken, nonce: requestNonce }),
      });
      await sessionStore.setItem('userSession', JSON.stringify({ ...session.user, token: session.token }));
      navigation.reset({
        index: 0,
        routes: [{ name: session.user?.userType === 'driver' ? 'DriverHomepage' : 'UserHomepage' }],
      });
    } finally {
      clearAttempt();
    }
  };

  const beginSignIn = async () => {
    if (!configured || busy || disabled) return;
    setBusy(true);
    setError('');
    try {
      const challenge = await apiRequest('/auth/google/nonce', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setNonce(challenge.nonce);
      setPrompt(true);
    } catch (authError) {
      handleError(authError);
    }
  };

  const cancelSignIn = () => {
    setError('');
    clearAttempt();
  };

  return (
    <View>
      {configured && nonce && (
        <ConfiguredGoogleRequest
          nonce={nonce}
          prompt={prompt}
          onToken={handleGoogleToken}
          onCancel={cancelSignIn}
          onError={handleError}
        />
      )}
      <TouchableOpacity
        accessibilityRole="button"
        onPress={beginSignIn}
        disabled={!configured || disabled || busy}
        style={{
          alignItems: 'center',
          borderColor: '#2d6a4f',
          borderRadius: 8,
          borderWidth: 1,
          flexDirection: 'row',
          justifyContent: 'center',
          marginTop: 16,
          minHeight: 48,
          opacity: !configured || disabled || busy ? 0.6 : 1,
          padding: 12,
        }}
      >
        {busy && <ActivityIndicator color="#1b4332" style={{ marginRight: 8 }} />}
        <Text style={{ color: '#1b4332', fontWeight: '700' }}>
          {busy ? 'Connecting to Google…' : 'Continue with Google'}
        </Text>
      </TouchableOpacity>
      {!configured && (
        <Text accessibilityRole="text" style={{ color: '#647067', marginTop: 6, textAlign: 'center' }}>
          Google sign-in needs an OAuth client ID for this platform.
        </Text>
      )}
      {!!error && <Text style={{ color: '#b42318', marginTop: 8, textAlign: 'center' }}>{error}</Text>}
    </View>
  );
}
