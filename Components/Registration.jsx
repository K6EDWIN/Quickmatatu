import React, { useState } from 'react';
import { View, Text, TextInput, Button, TouchableOpacity, StyleSheet,ScrollView } from 'react-native';
import styles from '../Styles';

const RegistrationForm = ({navigation}) => {
  const [userType, setUserType] = useState("commuter");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [driverName, setDriverName] = useState("");
  const [vehicleLicensePlate, setVehicleLicensePlate]= useState("");
  const [license, setLicense] = useState("");
  const [nationalId, setNationalId] = useState("");

  const [visibleComponent,setVisibleComponent] = useState('CommuterRegistration');

  const setComponent =()=>{
    if (visibleComponent === 'CommuterRegistration'){
      return(<>
        <View style={styles.container}>
        <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#aaa"
          onChangeText={setUsername}
          value={username}
           />
        <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#aaa"
            onChangeText={setEmail}
            value={email}
            keyboardType="email-address" />
        <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#aaa"
            onChangeText={setPassword}
            value={password}
            secureTextEntry />
            </View>
            </View>
        </>);
    }else(visibleComponent === 'DriverRegistration')
    {
      return(
        <>
    <View style={styles.container}>
      <View style={styles.inputContainer}>
      <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#aaa"
          onChangeText={setUsername}
          value={username}
           />
           <TextInput
          style={styles.input}
          placeholder="Driver Name"
          placeholderTextColor="#aaa"
          onChangeText={setDriverName}
          value={driverName}
           />
        <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#aaa"
            onChangeText={setEmail}
            value={email}
            keyboardType="email-address" />
        <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#aaa"
            onChangeText={setPassword}
            value={password}
            secureTextEntry />
            <TextInput
          style={styles.input}
          placeholder="Vehicle License Plate"
          placeholderTextColor="#aaa"
          onChangeText={setVehicleLicensePlate}
          value={vehicleLicensePlate}
           />
    <TextInput
        style={styles.input}
        placeholder="Driver's License"
        placeholderTextColor="#aaa"
        onChangeText={setLicense}
        value={license} />
    <TextInput
          style={styles.input}
          placeholder="National ID"
          placeholderTextColor="#aaa"
          onChangeText={setNationalId}
          value={nationalId} />
          </View>
          </View>
    </>
      );
    }
  };
 
  const handleRegister = async () => {
    const userData = { userType,username,driverName, email, password,vehicleLicensePlate, license, nationalId};

    try {
      const response = await fetch('http://localhost:3001/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });


      if (response.ok) {
        const data = await response.json();
        console.log('User registered successfully:', data);
        alert('Registration successful!');
        navigation.navigate("Login");
      } else {
        const errorData = await response.json();
        console.error('Registration failed:', errorData);
        alert(`Registration failed: ${errorData.message}`);
      }
    } catch (error) {
      console.error('An error occurred:', error);
      alert('An error occurred during registration. Please try again.');
    }
  };


  const MainComponent= ({ setVisibleComponent}) =>{
    return(
      <>
      <Text style={styles.header}>Register</Text>
      <View style={styles.userTypeContainer}>
        <TouchableOpacity
          style={[styles.button]}
          onPress={() => { setVisibleComponent('CommuterRegistration') && exportUserType()
            setUserType('commuter');}}
        >
          <Text style={styles.buttonText}>Commuter</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button]}
          onPress={() => { setVisibleComponent('DriverRegistration') && exportUserType()
            setUserType('driver');}}
        >
          <Text style={styles.buttonText}>Driver</Text>
        </TouchableOpacity>
      </View>
      </>
    );
  };
  return (
    <ScrollView style={{backgroundColor:'rgb(255, 255, 255)'}}>
  <View style={styles.container}>
        <MainComponent setVisibleComponent={setVisibleComponent}/>
    <View style={styles.inputContainer}>
    {setComponent()}

    <Button title="Register" onPress={handleRegister} color="black" style={styles.submitButton}/>
       <TouchableOpacity onPress={()=> navigation.navigate("Login")}>
         <Text style={styles.linkText}>Already have an account? Login</Text>
       </TouchableOpacity>
    </View>
    </View>
    </ScrollView>
    );
};
export default RegistrationForm;
