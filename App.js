import * as React from 'react';
import { useState } from "react";
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginForm from "./Components/LoginForm";
import RegistrationForm from "./Components/Registration";
import DriverHomepage from './Components/DriverHomepage';
import UserScreen from "./Components/UserScreen";
import RatingPage from './Components/RatingPage';
import AccountScreen from './Components/AccountScreen';
import DriverHistoryScreen from './Components/HistoryScreenDriver';
import UserHistoryScreen from './Components/HistoryScreenUser';
import TicketsPage from './Components/TicketsPage';
import WelcomeScreen from './Components/WelcomeScreen'; 

const Stack = createNativeStackNavigator();

const App = () => {
  return (
    <>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="WelcomeScreen">
          <Stack.Screen name="WelcomeScreen" component={WelcomeScreen} />
          <Stack.Screen name="Registration" component={RegistrationForm} />
          <Stack.Screen name="Login" component={LoginForm} />
          <Stack.Screen name="UserHomepage" component={UserScreen} />
          <Stack.Screen name="DriverHomepage" component={DriverHomepage} />
          <Stack.Screen name="RatingPage" component={RatingPage} />
          <Stack.Screen name="UserAccount" component={AccountScreen} />
          <Stack.Screen name="DriverHistoryScreen" component={DriverHistoryScreen} />
          <Stack.Screen name="UserHistoryScreen" component={UserHistoryScreen} />
          <Stack.Screen name="TicketsPage" component={TicketsPage} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
};

export default App;
