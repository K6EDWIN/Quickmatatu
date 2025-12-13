import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { UserTypeProvider } from './UserTypeContext'; 

// Import your screens
import WelcomeScreen from './Components/WelcomeScreen';
import Registration from './Components/Registration';
import LoginForm from './Components/LoginForm';
import UserHomepage from './Components/UserScreen'; 
import DriverHomepage from './Components/DriverHomepage';
import MapScreen from './Components/Map';
import AccountScreen from './Components/AccountScreen';
import HistoryScreenUser from './Components/HistoryScreenUser';
import HistoryScreenDriver from './Components/HistoryScreenDriver';
import RealTimeTrackingScreen from './Components/RealTimeTrackingScreen';
import TicketsPage from './Components/TicketsPage';
import RatingPage from './Components/RatingPage';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <UserTypeProvider>
      <NavigationContainer>
        {}
        <Stack.Navigator 
          initialRouteName="Welcome"
          screenOptions={{ headerShown: false }} 
        >
          {/* Auth Screens */}
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Registration" component={Registration} />
          <Stack.Screen name="Login" component={LoginForm} />

          {/* User Screens */}
          <Stack.Screen name="UserHomepage" component={UserHomepage} />
          <Stack.Screen name="Map" component={MapScreen} />
          <Stack.Screen name="Account" component={AccountScreen} />
          <Stack.Screen name="HistoryUser" component={HistoryScreenUser} />
          <Stack.Screen name="Tracking" component={RealTimeTrackingScreen} />
          <Stack.Screen name="Tickets" component={TicketsPage} />
          <Stack.Screen name="Rating" component={RatingPage} />

          {/* Driver Screens */}
          <Stack.Screen name="DriverHomepage" component={DriverHomepage} />
          <Stack.Screen name="HistoryDriver" component={HistoryScreenDriver} />
          
        </Stack.Navigator>
      </NavigationContainer>
    </UserTypeProvider>
  );
}