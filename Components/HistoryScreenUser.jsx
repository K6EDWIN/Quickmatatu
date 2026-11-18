import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Alert, Platform } from 'react-native';
import * as sessionStore from './sessionStore';
import { apiRequest } from './api';

const HistoryScreenUser = () => {
    const [bookings, setBookings] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [hasSession, setHasSession] = useState(true);

    const fetchHistory = async () => {
        setRefreshing(true);
        try {
            const session = await sessionStore.getItem('userSession');
            if (!session) {
                setHasSession(false);
                setBookings([]);
                return;
            }
            const user = JSON.parse(session);
            const data = await apiRequest(`/user/bookings/${user.id}`);
            if (!Array.isArray(data)) throw new Error('Booking history is unavailable.');
            setHasSession(true);
            setError('');
            setBookings(data);
        } catch (error) {
            console.error(error);
            setError(error.message || 'Unable to load your rides.');
        } finally {
            setRefreshing(false);
        }
    };

    const cancelBooking = async (ticketId) => {
        try {
            await apiRequest('/update-booking-status', {
                method: 'POST',
                body: JSON.stringify({ ticket_id: ticketId, status: 'cancelled' }),
            });
            fetchHistory(); // Refresh list
        } catch (requestError) {
            const message = requestError.message || "Could not cancel booking.";
            if (Platform.OS === 'web') window.alert(message);
            else Alert.alert("Error", message);
        }
    };

    useEffect(() => { fetchHistory(); }, []);

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.header}>
                <Text style={styles.date}>{new Date(item.booking_time).toLocaleDateString()} - {new Date(item.booking_time).toLocaleTimeString()}</Text>
                <Text style={[styles.status, 
                    item.status === 'accepted' ? { color: '#2d6a4f' } :
                    ['cancelled', 'rejected'].includes(item.status) ? { color: '#b42318' } : { color: '#8a4b08' }
                ]}>
                    {item.status === 'accepted' ? 'ACCEPTED · SEAT NOT VERIFIED' : item.status.toUpperCase()}
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
                ListEmptyComponent={<Text style={styles.empty}>
                    {error || (refreshing ? 'Loading ride requests…' : !hasSession ? 'Log in to view your rides.' : 'No ride requests yet.')}
                </Text>}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f7f5ef', paddingTop: 50 },
    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, color: '#1b4332' },
    card: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.1, elevation: 3 },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    date: { color: '#888', fontSize: 12 },
    status: { fontWeight: 'bold', fontSize: 12 },
    route: { fontSize: 18, fontWeight: 'bold', marginBottom: 5, color: '#1b4332' },
    point: { fontSize: 14, color: '#555', marginBottom: 10 },
    empty: { textAlign: 'center', marginTop: 50, color: '#475569' },
    cancelBtn: { padding: 10, backgroundColor: '#fff2f0', borderRadius: 8, alignItems: 'center', minHeight: 44 },
    cancelText: { color: '#b42318', fontWeight: 'bold' }
});

export default HistoryScreenUser;
