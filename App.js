import * as React from 'react';
import { useState } from "react";
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import LoginForm from "./Components/LoginForm";
import RegistrationForm from "./Components/Registration";
import DriverHomepage from './Components/DriverHomepage';
import RealTimeTrackingScreen from "./Components/RealTimeTrackingScreen";
import RatingPage from './Components/RatingPage';
import AccountScreen from './Components/AccountScreen';
import HistoryScreen from './Components/HistoryScreen';

const Stack = createNativeStackNavigator();

const App = () => {
  return(
    <>
    <NavigationContainer>
      <Stack.Navigator  initialRouteName="Registration">
        <Stack.Screen name="Registration" component={RegistrationForm} />
        <Stack.Screen name="Login" component={LoginForm} />
        <Stack.Screen name="UserHomepage" component={RealTimeTrackingScreen} />
        <Stack.Screen name="DriverHomepage" component={DriverHomepage} />
        <Stack.Screen name="RatingPage" component={RatingPage} />
        <Stack.Screen name="UserAccount" component={AccountScreen} />
        <Stack.Screen name="HistoryScreen" component={HistoryScreen} />
      </Stack.Navigator>
    </NavigationContainer>
    </>
  )
};

export default App;
