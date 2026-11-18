// App.js
import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import your existing components
import LoginForm from "./Components/LoginForm";
import RegistrationForm from "./Components/Registration";
import EmailVerificationScreen from './Components/EmailVerificationScreen';
import PasswordRecoveryScreen from './Components/PasswordRecoveryScreen';
import WelcomeScreen from './Components/WelcomeScreen';
import DriverHomepage from './Components/DriverHomepage';
import DriverHistoryScreen from './Components/HistoryScreenDriver';
import AccountScreen from './Components/AccountScreen';

// Import the new Tab Navigator
import MainTabs from './Components/MainTabs';

// Note: We don't import individual user screens here anymore because MainTabs handles them
// But we keep DriverHomepage separate for now if it has a different layout

const Stack = createNativeStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Welcome">
        
        {/* Auth Screens */}
        <Stack.Screen 
          name="Welcome" 
          component={WelcomeScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="Registration" 
          component={RegistrationForm} 
          options={{ headerTitle: "Register" }}
        />
        <Stack.Screen 
          name="Login" 
          component={LoginForm} 
          options={{ headerTitle: "Login" }}
        />
        <Stack.Screen
          name="VerifyEmail"
          component={EmailVerificationScreen}
          options={{ headerTitle: 'Verify email' }}
        />
        <Stack.Screen
          name="PasswordRecovery"
          component={PasswordRecoveryScreen}
          options={{ headerTitle: 'Password recovery' }}
        />
        <Stack.Screen 
          name="UserHomepage" 
          component={MainTabs} 
          options={{ headerShown: false }} 
        />

        <Stack.Screen name="DriverHomepage" component={DriverHomepage} />
        <Stack.Screen name="HistoryScreenDriver" component={DriverHistoryScreen} options={{ title: 'Driver bookings' }} />
        <Stack.Screen name="Account" component={AccountScreen} options={{ title: 'Account' }} />
        
      </Stack.Navigator>
    </NavigationContainer>
  );
};
export default App;