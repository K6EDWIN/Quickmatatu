import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons'; 

export default function RatingPage() {
  const [rating, setRating] = useState(4);
  const [comment, setComment] = useState('');

  const handleRating = (star) => {
    setRating(star);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rating</Text>
      <View style={styles.card}>
        <FontAwesome5 name="shuttle-van" size={40} color="black" /> 
        <Text style={styles.prompt}>How is your trip?</Text>
        <Text style={styles.subtext}>Your feedback will help improve driving experience</Text>
        
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => handleRating(star)}>
              <FontAwesome5
                name="star"
                size={28}
                color={star <= rating ? 'black' : 'gray'} 
                solid={star <= rating} 
              />
            </TouchableOpacity>
          ))}
        </View>
        
        <TextInput
          style={styles.input}
          placeholder="Additional comments..."
          placeholderTextColor="gray"
          value={comment}
          onChangeText={setComment}
        />
        
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Submit Review</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    color: 'black',
    marginBottom: 10,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    paddingVertical: 20,
    paddingHorizontal: 15,
    alignItems: 'center',
    width: '85%',
    maxWidth: 350,
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  plate: {
    fontSize: 18,
    color: 'black',
    fontWeight: 'bold',
    marginVertical: 8,
  },
  prompt: {
    fontSize: 16,
    color: 'black',
    marginVertical: 5,
  },
  subtext: {
    fontSize: 13,
    color: 'gray',
    marginBottom: 15,
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 15,
  },
  input: {
    height: 45,
    width: '100%',
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    color: 'black',
    backgroundColor: 'white',
    marginBottom: 15,
  },
  button: {
    backgroundColor: 'black',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
});