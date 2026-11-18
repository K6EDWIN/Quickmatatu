import { StyleSheet } from "react-native";

export default StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      padding: 20,
      backgroundColor: '#f7f5ef',
    },
    header: {
      fontSize: 24,
      fontWeight: 'bold',
      textAlign: 'center',
      color: '#1b4332',
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
      borderColor: '#b8c5bb',
      borderRadius: 10,
      backgroundColor: '#1b4332',
    },
    buttonText: {
      color: 'white',
      textAlign: 'center',
    },
    input: {
      borderWidth: 1,
      borderColor: '#b8c5bb',
      borderRadius: 10,
      padding: 10,
      marginVertical: 5,
      color: 'black',
      width: '100%',
      maxWidth: 420,
      minHeight: 48,
      backgroundColor: 'white',
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