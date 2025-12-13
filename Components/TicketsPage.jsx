import React, { useState, useEffect, useCallback } from 'react';
import { 
  Dimensions, 
  TouchableOpacity, 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  Image, 
  Alert, 
  ActivityIndicator,
  RefreshControl,
  SafeAreaView 
} from 'react-native';
import Foundation from 'react-native-vector-icons/Foundation';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AntDesign from 'react-native-vector-icons/AntDesign';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width } = Dimensions.get('window');

// Define API URL dynamically
const API_URL = process.env.EXPO_PUBLIC_API_URL 
  ? `${process.env.EXPO_PUBLIC_API_URL}/api`
  : 'http://localhost:3001/api';

const TicketsPage = ({ navigation }) => {
    const [viewMode, setViewMode] = useState('MyTickets'); // 'MyTickets' or 'BookTicket'
    const [routes, setRoutes] = useState([]);
    const [selectedRoute, setSelectedRoute] = useState(null);
    const [loading, setLoading] = useState(false);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [commuterId, setCommuterId] = useState(null);

    // Fetch Routes and User Data
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Fetch Routes (Ensure your server has this endpoint)
            const routeRes = await fetch(`${API_URL}/routes`);
            const routeData = await routeRes.json();
            
            if (Array.isArray(routeData)) {
                setRoutes(routeData);
                // Default select the first route
                if (routeData.length > 0 && !selectedRoute) {
                    setSelectedRoute(routeData[0]);
                }
            }

            // 2. Fetch User Session
            // Note: In a real app, you might store this in a global Context instead of fetching every time
            const userRes = await fetch(`${API_URL}/get_user`, { credentials: 'include' });
            if (userRes.ok) {
                const userData = await userRes.json();
                setCommuterId(userData.commuterId || userData.user?.id);
            }
        } catch (error) {
            console.error("Fetch Error:", error);
            // Fallback mock data for UI testing if server fails
            setRoutes([
                { route_id: 1, route_name: 'Super Metro', start_point: 'Nairobi', end_point: 'Juja', price: 100 },
                { route_id: 2, route_name: 'Killeton', start_point: 'Westlands', end_point: 'Kileleshwa', price: 80 },
                { route_id: 3, route_name: 'Metro Trans', start_point: 'CBD', end_point: 'Utawala', price: 120 },
            ]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedRoute]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleBookTicket = async () => {
        if (!selectedRoute) {
            Alert.alert('Error', 'Please select a route.');
            return;
        }

        // Allow booking even if session fetch failed (for testing), or block strictly:
        // if (!commuterId) { Alert.alert('Error', 'Please log in again.'); return; }

        setBookingLoading(true);

        const currentTime = new Date();
        const randomMinutes = Math.floor(Math.random() * 11) + 10; 
        currentTime.setMinutes(currentTime.getMinutes() + randomMinutes);

        const payload = {
            commuter_id: commuterId || 1, // Fallback ID for testing
            matatu_id: 1,
            route_id: selectedRoute.route_id,
            pickup_point: selectedRoute.start_point,
            estimated_pickup_time: currentTime.toISOString(),
        };

        try {
            const response = await fetch(`${API_URL}/book-ticket`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            
            if (response.ok) {
                Alert.alert('Success', 'Ticket booked successfully!', [
                    { text: 'OK', onPress: () => setViewMode('MyTickets') }
                ]);
            } else {
                Alert.alert('Failed', data.error || 'Could not book ticket.');
            }
        } catch (error) {
            Alert.alert('Network Error', 'Could not connect to server.');
        } finally {
            setBookingLoading(false);
        }
    };

    // --- SUB-COMPONENTS ---

    const renderHeader = (title, showBack = false) => (
        <View style={styles.headerContainer}>
            {showBack && (
                <TouchableOpacity onPress={() => setViewMode('MyTickets')} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>
            )}
            <Text style={styles.headerTitle}>{title}</Text>
            <View style={{ width: 24 }} /> {/* Spacer for centering */}
        </View>
    );

    const renderMyTickets = () => (
        <View style={styles.centerContent}>
            {renderHeader("My Tickets")}
            <View style={styles.emptyStateContainer}>
                <View style={styles.circleIcon}>
                    <MaterialCommunityIcons name="ticket-confirmation-outline" size={60} color="#ccc" />
                </View>
                <Text style={styles.emptyTitle}>No Active Tickets</Text>
                <Text style={styles.emptySubtitle}>You haven't booked any trips yet.</Text>
                
                <TouchableOpacity 
                    style={styles.primaryButton} 
                    onPress={() => setViewMode('BookTicket')}
                >
                    <Text style={styles.primaryButtonText}>Buy a Ticket</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderBookTicket = () => (
        <View style={{ flex: 1 }}>
            {renderHeader("Select Route", true)}
            
            <View style={styles.listContainer}>
                {loading ? (
                    <ActivityIndicator size="large" color="black" style={{ marginTop: 50 }} />
                ) : (
                    <FlatList
                        data={routes}
                        keyExtractor={(item) => item.route_id.toString()}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                        contentContainerStyle={{ paddingBottom: 100 }}
                        ListHeaderComponent={
                            <Text style={styles.sectionLabel}>Available Routes</Text>
                        }
                        renderItem={({ item }) => {
                            const isSelected = selectedRoute?.route_id === item.route_id;
                            return (
                                <TouchableOpacity
                                    style={[styles.routeCard, isSelected && styles.routeCardSelected]}
                                    onPress={() => setSelectedRoute(item)}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.routeRow}>
                                        {/* Placeholder Icon/Image */}
                                        <View style={[styles.routeIcon, { backgroundColor: isSelected ? 'black' : '#f0f0f0' }]}>
                                             <Ionicons name="bus-outline" size={24} color={isSelected ? 'white' : 'black'} />
                                        </View>
                                        
                                        <View style={styles.routeInfo}>
                                            <Text style={styles.routeName}>{item.route_name}</Text>
                                            <Text style={styles.routePath}>
                                                {item.start_point} <AntDesign name="arrowright" /> {item.end_point}
                                            </Text>
                                        </View>

                                        {/* Radio Button Visual */}
                                        <View style={styles.radioContainer}>
                                            {isSelected ? (
                                                <Ionicons name="radio-button-on" size={24} color="rgb(0,185,122)" />
                                            ) : (
                                                <Ionicons name="radio-button-off" size={24} color="#ccc" />
                                            )}
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                    />
                )}
            </View>

            {/* Floating Bottom Action Bar */}
            <View style={styles.footerAction}>
                <View>
                    <Text style={styles.totalLabel}>Selected Route</Text>
                    <Text style={styles.totalPrice}>
                        {selectedRoute ? selectedRoute.route_name : 'None'}
                    </Text>
                </View>
                <TouchableOpacity 
                    style={[styles.bookButton, !selectedRoute && { backgroundColor: '#ccc' }]}
                    onPress={handleBookTicket}
                    disabled={!selectedRoute || bookingLoading}
                >
                    {bookingLoading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.bookButtonText}>Book Now</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.page}>
            <View style={styles.container}>
                {viewMode === 'MyTickets' ? renderMyTickets() : renderBookTicket()}
            </View>

            {/* Bottom Navigation Bar */}
            <View style={styles.bottomBar}>
                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("UserHomepage")}>
                    <Foundation name='home' size={24} color="#aaa" />
                    <Text style={styles.navText}>Home</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("HistoryUser")}>
                    <MaterialCommunityIcons name='history' size={24} color="#aaa" />
                    <Text style={styles.navText}>History</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.navItem} onPress={() => {}}>
                    <Ionicons name='ticket' size={24} color="black" />
                    <Text style={[styles.navText, { color: 'black', fontWeight: 'bold' }]}>Tickets</Text>
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
    page: {
        flex: 1,
        backgroundColor: '#fff',
    },
    container: {
        flex: 1,
        backgroundColor: '#f9f9f9', // Light grey background for content
    },
    
    // Header
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: 15,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: 'black',
    },
    backButton: {
        padding: 5,
    },

    // Empty State
    centerContent: {
        flex: 1,
        backgroundColor: 'white',
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    circleIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        marginBottom: 30,
    },
    primaryButton: {
        backgroundColor: 'black',
        paddingVertical: 14,
        paddingHorizontal: 40,
        borderRadius: 30,
        elevation: 3,
    },
    primaryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },

    // Route Selection List
    listContainer: {
        flex: 1,
        padding: 15,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 10,
        marginLeft: 5,
        textTransform: 'uppercase',
    },
    routeCard: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 15,
        marginBottom: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'transparent',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    routeCardSelected: {
        borderColor: 'rgb(0,185,122)',
        backgroundColor: '#F0FDF4', // Very light green bg
    },
    routeRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    routeIcon: {
        width: 45,
        height: 45,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    routeInfo: {
        flex: 1,
    },
    routeName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    routePath: {
        fontSize: 13,
        color: '#666',
    },
    radioContainer: {
        marginLeft: 10,
    },

    // Footer Action
    footerAction: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 10,
    },
    totalLabel: {
        fontSize: 12,
        color: '#888',
    },
    totalPrice: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'black',
    },
    bookButton: {
        backgroundColor: 'rgb(0,185,122)',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 10,
    },
    bookButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },

    // Bottom Bar
    bottomBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 12,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    navItem: {
        alignItems: 'center',
    },
    navText: {
        fontSize: 10,
        marginTop: 4,
        color: '#aaa',
    },
});

export default TicketsPage;