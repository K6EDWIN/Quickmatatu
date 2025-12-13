import React, { useState, useEffect, useCallback } from 'react';
import { 
  Dimensions, 
  TouchableOpacity, 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  Alert, 
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Platform,
  Image
} from 'react-native';
import Foundation from 'react-native-vector-icons/Foundation';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AntDesign from 'react-native-vector-icons/AntDesign';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width } = Dimensions.get('window');

const TicketsPage = ({ navigation }) => {
    const [routes, setRoutes] = useState([]);
    const [selectedRoute, setSelectedRoute] = useState(null);
    const [loading, setLoading] = useState(false);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [commuterId, setCommuterId] = useState(null);

    // SAFE API URL LOGIC
    const getApiUrl = (endpoint) => {
        let url = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
        const baseUrl = url.replace(/\/api\/?$/, '').replace(/\/$/, '');
        return `${baseUrl}/api/${endpoint}`;
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Fetch Routes
            const routeRes = await fetch(getApiUrl('routes'));
            const routeData = await routeRes.json();
            
            if (routeRes.ok && Array.isArray(routeData)) {
                setRoutes(routeData);
            } else {
                console.error("Routes fetch failed:", routeData);
                // Optional: Set fallback data for testing if API fails
                // setRoutes([{route_id: 1, route_name: 'Test Route', start_point: 'A', end_point: 'B', estimated_duration: '30 mins'}]);
            }

            // 2. Fetch User Session
            const userRes = await fetch(getApiUrl('get_user'), { credentials: 'include' });
            if (userRes.ok) {
                const userData = await userRes.json();
                setCommuterId(userData.commuterId || userData.user?.id);
            }

        } catch (error) {
            console.error("Network Error:", error);
            // Alert.alert("Connection Error", "Could not connect to server.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleBookTicket = async () => {
        if (!selectedRoute) {
            Alert.alert('Selection Required', 'Please select a route to book.');
            return;
        }
        
        if (!commuterId) {
             Alert.alert('Login Required', 'You must be logged in to book a ticket.', [
                 { text: 'Login', onPress: () => navigation.navigate('Login') },
                 { text: 'Cancel', style: 'cancel'}
             ]);
             return;
        }

        setBookingLoading(true);

        // Generate a pickup time (Current time + 15 mins)
        const pickupTime = new Date();
        pickupTime.setMinutes(pickupTime.getMinutes() + 15);

        const payload = {
            commuter_id: commuterId,
            route_id: selectedRoute.route_id, 
            pickup_point: selectedRoute.start_point, 
            estimated_pickup_time: pickupTime.toISOString(),
        };

        try {
            const response = await fetch(getApiUrl('book-ticket'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            
            if (response.ok) {
                Alert.alert('Success', 'Ticket booked successfully!', [
                    { text: 'View Ticket', onPress: () => navigation.navigate("HistoryScreenUser") }
                ]);
            } else {
                Alert.alert('Booking Failed', data.error || 'Unknown error');
            }
        } catch (error) {
            Alert.alert('Error', 'Could not connect to server.');
        } finally {
            setBookingLoading(false);
        }
    };

    const renderRouteCard = ({ item }) => {
        const isSelected = selectedRoute?.route_id === item.route_id;
        return (
            <TouchableOpacity
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => setSelectedRoute(item)}
                activeOpacity={0.8}
            >
                <View style={styles.cardHeader}>
                    <View style={[styles.iconContainer, isSelected && {backgroundColor: 'rgba(0,185,122,0.1)'}]}>
                         <Ionicons name="bus" size={24} color={isSelected ? "rgb(0,185,122)" : "black"} />
                    </View>
                    <View style={styles.cardTexts}>
                        <Text style={styles.routeName}>{item.route_name}</Text>
                        <Text style={styles.routeDuration}>
                            <Ionicons name="time-outline" size={14} color="#666" /> {item.estimated_duration || 'N/A'}
                        </Text>
                    </View>
                    <View style={styles.radio}>
                        {isSelected ? (
                            <Ionicons name="radio-button-on" size={24} color="rgb(0,185,122)" />
                        ) : (
                            <Ionicons name="radio-button-off" size={24} color="#ccc" />
                        )}
                    </View>
                </View>

                <View style={styles.cardBody}>
                    <View style={styles.locationRow}>
                        <Text style={styles.locationText}>{item.start_point}</Text>
                        <AntDesign name="arrowright" size={16} color="#bbb" style={{marginHorizontal: 10}}/>
                        <Text style={styles.locationText}>{item.end_point}</Text>
                    </View>
                    {item.intermediary_stops ? (
                        <Text style={styles.stopsText} numberOfLines={1}>
                            Via: {item.intermediary_stops}
                        </Text>
                    ) : null}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Select Route</Text>
                    <Text style={styles.headerSubtitle}>Where are you going today?</Text>
                </View>
                {/* Optional: Add user avatar here if fetched */}
            </View>

            {/* List */}
            {loading ? (
                <View style={styles.centerLoading}>
                    <ActivityIndicator size="large" color="rgb(0,185,122)" />
                    <Text style={{marginTop: 10, color: '#666'}}>Finding routes...</Text>
                </View>
            ) : (
                <FlatList
                    data={routes}
                    keyExtractor={(item) => item.route_id.toString()}
                    renderItem={renderRouteCard}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons name="bus-alert" size={50} color="#ccc" />
                            <Text style={styles.emptyText}>No routes available right now.</Text>
                        </View>
                    }
                />
            )}

            {/* Bottom Booking Action */}
            <View style={styles.footer}>
                <View style={styles.selectionInfo}>
                    <Text style={styles.footerLabel}>Selected Route</Text>
                    <Text style={styles.footerValue} numberOfLines={1}>
                        {selectedRoute ? selectedRoute.route_name : 'None'}
                    </Text>
                </View>
                <TouchableOpacity 
                    style={[styles.bookButton, !selectedRoute && styles.disabledButton]}
                    onPress={handleBookTicket}
                    disabled={!selectedRoute || bookingLoading}
                >
                    {bookingLoading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Text style={styles.bookButtonText}>Book Ticket</Text>
                            <AntDesign name="arrowright" size={16} color="white" style={{marginLeft: 8}}/>
                        </>
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
                <TouchableOpacity style={styles.navItem} onPress={() => {}}>
                    <Ionicons name='ticket' size={24} color="black" />
                    <Text style={[styles.navText, {color:'black', fontWeight:'bold'}]}>Tickets</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("Account")}>
                    <AntDesign name='user' size={24} color="#aaa" />
                    <Text style={styles.navText}>Profile</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        paddingTop: Platform.OS === 'android' ? 30 : 0
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
        backgroundColor: '#fff',
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 5,
        zIndex: 10,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#111',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    centerLoading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 15,
        paddingBottom: 160, // Space for footer + navbar
        paddingTop: 20,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#f0f0f0',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    cardSelected: {
        borderColor: 'rgb(0,185,122)',
        backgroundColor: '#F0FFF8',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#f8f8f8',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    cardTexts: {
        flex: 1,
    },
    routeName: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 2,
    },
    routeDuration: {
        fontSize: 13,
        color: '#666',
    },
    cardBody: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
        paddingTop: 15,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    locationText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#444',
    },
    stopsText: {
        marginTop: 8,
        fontSize: 12,
        color: '#999',
        fontStyle: 'italic',
    },
    radio: {
        marginLeft: 10,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        color: '#888',
        fontSize: 16,
        marginTop: 10,
    },
    // Footer
    footer: {
        position: 'absolute',
        bottom: 70, // Height of nav bar
        left: 20, 
        right: 20,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 20,
        marginBottom: 10,
    },
    selectionInfo: {
        flex: 1,
        marginRight: 10,
    },
    footerLabel: {
        fontSize: 12,
        color: '#888',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    footerValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111',
    },
    bookButton: {
        backgroundColor: 'rgb(0,185,122)',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
    },
    disabledButton: {
        backgroundColor: '#ddd',
        elevation: 0,
    },
    bookButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 15,
    },
    // NavBar
    navBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: Platform.OS === 'ios' ? 20 : 12, // Safe area for iPhone
    },
    navItem: {
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    navText: {
        fontSize: 10,
        marginTop: 4,
        color: '#aaa',
        fontWeight: '500',
    },
});

export default TicketsPage;