import styles from "../Styles";
import { useState, useCallback } from "react";
import { View, Text, TextInput, Button, TouchableOpacity, CheckBox, Alert } from "react-native";

const LoginForm = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [isSelected, setSelection] = useState(false);
  const [loading, setLoading] = useState(false);

  // for  state updates
  const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), delay);
    };
  };

  const handleEmailChange = useCallback(debounce((text) => setEmail(text), 100), []);
  const handlePasswordChange = useCallback(debounce((text) => setPassword(text), 100), []);
  const handleIdNumberChange = useCallback(debounce((text) => setIdNumber(text), 100), []);

  const handleLogin = async () => {
    // Check if required fields are missing
    if ((!email && !isSelected) || (!idNumber && isSelected) || !password) {
      Alert.alert("Error", "Please enter your details.");
      return;
    }

    setLoading(true);

    try {
      const payload = isSelected
        ? { userType: "driver", id_number: idNumber, password }
        : { userType: "commuter", email, password };
      console.log("Payload sent:", payload);

      const response = await fetch("http://localhost:3001/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log("Response data:", data);

      if (response.ok) {
        Alert.alert("Success", "Login successful!");
        if (isSelected) {
          navigation.navigate("DriverHomepage");
        } else {
          navigation.navigate("UserHomepage");
        }
      } else {
        Alert.alert("Error", data.error || "Login failed. Please try again.");
      }
    } catch (error) {
      console.error("Login Error:", error.message || error);
      Alert.alert(
        "Error",
        "Unable to connect to the server. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Login</Text>

      <View style={styles.inputContainer}>
        {isSelected ? (
          <TextInput
            style={styles.input}
            placeholder="Enter ID Number"
            placeholderTextColor="#aaa"
            onChangeText={handleIdNumberChange}
            defaultValue={idNumber}
            keyboardType="numeric"
          />
        ) : (
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#aaa"
            onChangeText={handleEmailChange}
            defaultValue={email}
            keyboardType="email-address"
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#aaa"
          onChangeText={handlePasswordChange}
          defaultValue={password}
          secureTextEntry
        />

        <View style={styles.checkboxContainer}>
          <CheckBox
            value={isSelected}
            onValueChange={setSelection}
            style={styles.checkbox}
          />
          <Text style={styles.label}>Are you a driver?🧑🏽‍💼</Text>
        </View>

        <Button
          title={loading ? "Logging in..." : "Login"}
          onPress={handleLogin}
          color="black"
          style={styles.button}
          disabled={loading}
        />

        <TouchableOpacity
          onPress={() => {
            navigation.navigate("Registration");
          }}
        >
          <Text style={styles.linkText}>Create an account🙂</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default LoginForm;
