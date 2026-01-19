import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, Text, View, FlatList, TouchableOpacity, Alert, ActivityIndicator, SafeAreaView, Platform, RefreshControl 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AntDesign from 'react-native-vector-icons/AntDesign';
import Foundation from 'react-native-vector-icons/Foundation';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const TicketsPage = ({ navigation }) => {
    const [routes, setRoutes] = useState([]);
    const [selectedRoute, setSelectedRoute] = useState(null);
    const [loading, setLoading] = useState(false);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [user, setUser] = useState(null);

    const getApiUrl = (endpoint) => {
        let url = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
        return `${url.replace(/\/$/, '')}/api/${endpoint}`;
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Fetch Routes
            const res = await fetch(getApiUrl('routes'));
            const data = await res.json();
            if (Array.isArray(data)) setRoutes(data);
            
            // 2. Get User Info
            const session = await AsyncStorage.getItem('userSession');
            if (session) setUser(JSON.parse(session));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleBook = async () => {
        if (!user) {
            Alert.alert("Login Required", "You must be logged in to book.", [
                { text: "Login", onPress: () => navigation.navigate('Login') }
            ]);
            return;
        }
        if (!selectedRoute) return Alert.alert("Select a Route", "Please choose a route first.");

        setBookingLoading(true);
        try {
            const response = await fetch(getApiUrl('book-ticket'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    commuter_id: user.id,
                    route_id: selectedRoute.route_id,
                    pickup_point: selectedRoute.start_point,
                    estimated_pickup_time: new Date().toISOString()
                }),
            });
            
            const result = await response.json();

            if (response.ok) {
                Alert.alert("Request Sent!", "Your request has been sent to nearby drivers.", [
                    { text: "Track Status", onPress: () => navigation.navigate("HistoryScreenUser") }
                ]);
            } else {
                Alert.alert("Error", result.error || "Could not book ticket.");
            }
        } catch (error) {
            Alert.alert("Network Error", "Please check your connection.");
        } finally {
            setBookingLoading(false);
        }
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity 
            style={[styles.card, selectedRoute?.route_id === item.route_id && styles.selectedCard]} 
            onPress={() => setSelectedRoute(item)}
        >
            <View style={styles.row}>
                <Ionicons name="bus-outline" size={24} color={selectedRoute?.route_id === item.route_id ? "green" : "black"} />
                <View style={styles.info}>
                    <Text style={styles.routeName}>{item.route_name}</Text>
                    <Text style={styles.routeDetails}>{item.start_point} ➔ {item.end_point}</Text>
                    <Text style={styles.routeTime}><Ionicons name="time-outline"/> {item.estimated_duration}</Text>
                </View>
                {selectedRoute?.route_id === item.route_id && (
                    <AntDesign name="checkcircle" size={24} color="green" />
                )}
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerContainer}>
                <Text style={styles.header}>Where to?</Text>
                <Text style={styles.subHeader}>Select a route to hail a matatu</Text>
            </View>

            <FlatList 
                data={routes} 
                renderItem={renderItem} 
                keyExtractor={item => item.route_id.toString()}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} />}
                contentContainerStyle={{ paddingBottom: 150 }}
            />
            
            <View style={styles.footer}>
                <TouchableOpacity style={styles.bookButton} onPress={handleBook} disabled={bookingLoading}>
                    {bookingLoading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.btnText}>Request Matatu</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* Navigation Bar */}
            <View style={styles.navBar}>
                 <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("UserHomepage")}>
                    <Foundation name='home' size={24} color="#aaa" />
                    <Text style={styles.navText}>Home</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("HistoryScreenUser")}>
                    <MaterialCommunityIcons name='history' size={24} color="#aaa" />
                    <Text style={styles.navText}>History</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem}>
                    <Ionicons name='ticket' size={24} color="black" />
                    <Text style={[styles.navText, {color:'black', fontWeight: 'bold'}]}>Tickets</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("UserAccount")}>
                    <AntDesign name='user' size={24} color="#aaa" />
                    <Text style={styles.navText}>Profile</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5', paddingTop: Platform.OS === 'android' ? 30 : 0 },
    headerContainer: { padding: 20, backgroundColor: 'white', borderBottomLeftRadius: 20, borderBottomRightRadius: 20, marginBottom: 10, elevation: 3 },
    header: { fontSize: 26, fontWeight: 'bold' },
    subHeader: { color: 'gray', marginTop: 5 },
    card: { backgroundColor: 'white', padding: 20, marginHorizontal: 20, marginBottom: 15, borderRadius: 15, elevation: 2 },
    selectedCard: { borderColor: 'green', borderWidth: 2, backgroundColor: '#f0fff4' },
    row: { flexDirection: 'row', alignItems: 'center' },
    info: { flex: 1, marginLeft: 15 },
    routeName: { fontWeight: 'bold', fontSize: 18, color: '#333' },
    routeDetails: { color: '#666', marginTop: 4 },
    routeTime: { color: '#888', fontSize: 12, marginTop: 4 },
    footer: { position: 'absolute', bottom: 70, left: 0, right: 0, padding: 20 },
    bookButton: { backgroundColor: 'black', padding: 18, borderRadius: 15, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.3, elevation: 5 },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
    navBar: {
        flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10, backgroundColor: '#fff',
        position: 'absolute', bottom: 0, width: '100%', borderTopWidth: 1, borderColor: '#eee'
    },
    navItem: { alignItems: 'center' },
    navText: { fontSize: 10, color: '#aaa', marginTop: 4 }
});

export default TicketsPage;