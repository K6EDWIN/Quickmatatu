import { StyleSheet } from "react-native";

export default StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      padding: 20,
      backgroundColor: '#fff',
    },
    header: {
      fontSize: 24,
      fontWeight: 'bold',
      textAlign: 'center',
      color: 'black',
      marginBottom: 20,
    },
    userTypeContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: 20,
    },
    button: {
      flex: 1,
      padding: 10,
      marginHorizontal: 5,
      borderWidth: 1,
      borderColor: 'black',
      borderRadius: 5,
      backgroundColor: 'black',
    },
    buttonText: {
      color: 'white',
      textAlign: 'center',
    },
    input: {
      borderWidth: 1,
      borderColor: 'black',
      borderRadius: 5,
      padding: 10,
      marginVertical: 5,
      color: 'black',
      width: 300
    },
    inputContainer:{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    },
    checkboxContainer: {
      flexDirection: 'row',
      marginBottom: 20,
    },
    checkbox: {
      alignSelf: 'center',
    }
  });