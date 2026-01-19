import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';

const HistoryScreenUser = ({ navigation }) => {
    const [bookings, setBookings] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    const getApiUrl = () => {
        let url = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
        return url.replace(/\/$/, '');
    };

    const fetchHistory = async () => {
        setRefreshing(true);
        try {
            const session = await AsyncStorage.getItem('userSession');
            if (!session) return;
            const user = JSON.parse(session);

            const response = await fetch(`${getApiUrl()}/api/user/bookings/${user.id}`);
            const data = await response.json();
            if (Array.isArray(data)) setBookings(data);
        } catch (error) {
            console.error(error);
        } finally {
            setRefreshing(false);
        }
    };

    const cancelBooking = async (ticketId) => {
        try {
            await fetch(`${getApiUrl()}/api/update-booking-status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticket_id: ticketId, status: 'cancelled' })
            });
            fetchHistory(); // Refresh list
        } catch (error) {
            Alert.alert("Error", "Could not cancel booking.");
        }
    };

    useEffect(() => { fetchHistory(); }, []);

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.header}>
                <Text style={styles.date}>{new Date(item.booking_time).toLocaleDateString()} - {new Date(item.booking_time).toLocaleTimeString()}</Text>
                <Text style={[styles.status, 
                    item.status === 'accepted' ? { color: 'green' } : 
                    item.status === 'cancelled' ? { color: 'red' } : { color: 'orange' }
                ]}>
                    {item.status.toUpperCase()}
                </Text>
            </View>
            <Text style={styles.route}>{item.route_name}</Text>
            <Text style={styles.point}>Pickup: {item.pickup_point}</Text>
            
            {item.status === 'pending' && (
                <TouchableOpacity onPress={() => cancelBooking(item.ticket_id)} style={styles.cancelBtn}>
                    <Text style={styles.cancelText}>Cancel Request</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>My Rides</Text>
            <FlatList 
                data={bookings}
                renderItem={renderItem}
                keyExtractor={item => item.ticket_id.toString()}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchHistory} />}
                ListEmptyComponent={<Text style={styles.empty}>No ride history found.</Text>}
            />
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f8f9fa', paddingTop: 50 },
    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
    card: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.1, elevation: 3 },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    date: { color: '#888', fontSize: 12 },
    status: { fontWeight: 'bold', fontSize: 12 },
    route: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
    point: { fontSize: 14, color: '#555', marginBottom: 10 },
    cancelBtn: { padding: 10, backgroundColor: '#ffebee', borderRadius: 5, alignItems: 'center' },
    cancelText: { color: '#d32f2f', fontWeight: 'bold' },
    empty: { textAlign: 'center', marginTop: 50, color: '#aaa' },
    backButton: { marginTop: 10, padding: 15, backgroundColor: 'black', borderRadius: 10, alignItems: 'center' },
    backText: { color: 'white', fontWeight: 'bold' }
});

export default HistoryScreenUser;