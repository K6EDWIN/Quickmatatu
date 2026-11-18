import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import * as sessionStore from './sessionStore';
import { apiRequest } from './api';

export default function AccountScreen({ route, navigation }) {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  
  // Default to commuter if not passed, but we will check Storage too
  const [userType, setUserType] = useState(route.params?.name || 'commuter'); 

  useEffect(() => {
    const fetchUserData = async () => {
        try {
            const jsonValue = await sessionStore.getItem('userSession');
            if (jsonValue) {
                const user = JSON.parse(jsonValue);
                setUserType(user.userType || 'commuter');
            }
            const profile = await apiRequest('/users/me');
            setProfileData(profile);
            setUserType(profile.userType);
            setProfileError('');
        } catch (error) {
            console.error('Error fetching user data:', error);
            setProfileError(error.message || 'Unable to load your account.');
        } finally {
            setLoading(false);
        }
    };

    fetchUserData();
  }, []);

  const handleLogout = async () => {
    try {
        await apiRequest('/logout', { method: 'POST' });
    } catch (e) {
        console.error('Logout request failed; clearing the local session:', e);
    } finally {
        await sessionStore.removeItem('userSession');
        let rootNavigation = navigation;
        while (rootNavigation.getParent()) rootNavigation = rootNavigation.getParent();
        rootNavigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    }
  };

  const handleManageAccount = () => {
    if (!profileData) return;
    
    // Display user details
    const info = `Username: ${profileData.username}\nEmail: ${profileData.email}\nUser Type: ${profileData.userType}\n${profileData.license_number ? 'License: ' + profileData.license_number : ''}`;
    
    if (Platform.OS === 'web') {
        alert("Account Details:\n" + info);
    } else {
        Alert.alert("Account Details", info);
    }
  };

  const OptionItem = ({ icon, label, description, onPress }) => (
    <TouchableOpacity style={styles.optionItem} onPress={onPress}>
      <MaterialIcons name={icon} size={hp('4%')} color="#1b4332" />
      <View style={styles.optionTextContainer}>
        <Text style={styles.optionLabel}>{label}</Text>
        <Text style={styles.optionDescription}>{description}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color="#ccc" style={{ marginLeft: 'auto' }} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="blue" />
        <Text>Loading Profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.profileImageContainer}>
            <FontAwesome name="user-circle" size={hp('10%')} color="#333" />
          </View>
          <Text style={styles.username}>{profileData?.username || 'Guest'}</Text>
          <Text style={{ color: 'gray' }}>{profileData?.email}</Text>
          {!!profileError && <Text style={styles.profileError}>{profileError}</Text>}
        </View>

        <View style={styles.optionsContainer}>
          <OptionItem 
            icon="person" 
            label="Manage Account" 
            description="View your personal details" 
            onPress={handleManageAccount}
          />
          <OptionItem 
            icon="history" 
            label="History" 
            description="View your past trips" 
            onPress={() => userType === 'driver'
              ? navigation.navigate('HistoryScreenDriver')
              : navigation.navigate('History')}
          />
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f5ef',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: 20, 
  },
  header: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#fff',
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 20,
  },
  profileImageContainer: {
    marginBottom: 10,
  },
  username: {
    fontSize: hp('3%'),
    fontWeight: 'bold',
    color: '#1b4332',
  },
  optionsContainer: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    elevation: 2, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionTextContainer: {
    marginLeft: 15,
  },
  optionLabel: {
    fontSize: hp('2.2%'),
    fontWeight: '600',
    color: '#333',
  },
  optionDescription: {
    fontSize: hp('1.8%'),
    color: '#888',
  },
  logoutButton: {
    backgroundColor: '#ff4444',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 40,
    marginTop: 30,
    alignSelf: 'center',
    elevation: 2,
  },
  logoutText: {
    color: 'white',
    fontSize: hp('2.2%'),
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileError: { color: '#b42318', marginTop: 10, textAlign: 'center' },
});
