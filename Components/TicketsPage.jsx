import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, Text, View, FlatList, TouchableOpacity, Alert, ActivityIndicator, SafeAreaView, Platform, ScrollView
} from 'react-native';
import * as sessionStore from './sessionStore';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AntDesign from 'react-native-vector-icons/AntDesign';
import { apiRequest } from './api';

const TicketsPage = ({ navigation }) => {
    const [routes, setRoutes] = useState([]);
    const [boardingStage, setBoardingStage] = useState('');
    const [destination, setDestination] = useState('');
    const [selectedRoute, setSelectedRoute] = useState(null);
    const [loading, setLoading] = useState(false);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [user, setUser] = useState(null);
    const [error, setError] = useState('');
    const notify = (title, message, action) => {
        if (Platform.OS === 'web') {
            window.alert(`${title}: ${message}`);
            if (action) action();
        } else {
            Alert.alert(title, message, action ? [{ text: 'Continue', onPress: action }] : undefined);
        }
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Fetch Routes
            const data = await apiRequest('/routes');
            if (!Array.isArray(data)) throw new Error('Route information is unavailable.');
            setRoutes(data);
            setError('');
            
            // 2. Get User Info
            const session = await sessionStore.getItem('userSession');
            if (session) setUser(JSON.parse(session));
        } catch (error) {
            console.error(error);
            setError(error.message || 'Unable to load routes.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleBook = async () => {
        if (!user) {
            notify("Login required", "You must be logged in to send a ride request.", () => navigation.navigate('Login'));
            return;
        }
        if (!selectedRoute) return notify("Select a route", "Please choose a route first.");

        setBookingLoading(true);
        try {
            const result = await apiRequest('/book-ticket', {
                method: 'POST',
                body: JSON.stringify({
                    route_id: selectedRoute.route_id,
                    pickup_point: selectedRoute.start_point,
                }),
            });
            notify("Request sent", result.message, () => navigation.navigate("History"));
        } catch (error) {
            notify("Unable to request a ride", error.message || "Please check your connection.");
        } finally {
            setBookingLoading(false);
        }
    };

    const destinations = boardingStage
        ? [...new Set(routes.filter(route => route.start_point === boardingStage).map(route => route.end_point))]
        : [];
    const matchingRoutes = destination
        ? routes.filter(route => route.start_point === boardingStage && route.end_point === destination)
        : [];

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
                    <Text style={styles.routeTime}>
                        <Ionicons name="time-outline" /> {item.estimated_duration || 'Duration unavailable'}
                    </Text>
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
                <Text style={styles.header}>Plan your ride</Text>
                <Text style={styles.subHeader}>Choose a route starting point and destination from saved route records.</Text>
            </View>

            <ScrollView contentContainerStyle={styles.planner}>
                <Text style={styles.stepLabel}>1. Starting point</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stageList}>
                    {[...new Set(routes.map(route => route.start_point))].map(stage => (
                        <TouchableOpacity
                            key={stage}
                            onPress={() => {
                                setBoardingStage(stage);
                                setDestination('');
                                setSelectedRoute(null);
                            }}
                            style={[styles.stageChip, boardingStage === stage && styles.selectedStageChip]}
                        >
                            <Text style={[styles.stageText, boardingStage === stage && styles.selectedStageText]}>{stage}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {boardingStage ? (
                    <>
                        <Text style={styles.stepLabel}>2. Destination</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stageList}>
                            {destinations.map(stage => (
                                <TouchableOpacity
                                    key={stage}
                                    onPress={() => {
                                        setDestination(stage);
                                        setSelectedRoute(null);
                                    }}
                                    style={[styles.stageChip, destination === stage && styles.selectedStageChip]}
                                >
                                    <Text style={[styles.stageText, destination === stage && styles.selectedStageText]}>{stage}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </>
                ) : null}

                {destination ? (
                    <>
                        <Text style={styles.stepLabel}>3. Available route</Text>
                        {matchingRoutes.length
                            ? matchingRoutes.map(item => <View key={item.route_id}>{renderItem({ item })}</View>)
                            : <Text style={styles.empty}>No route connects these stages in the available data.</Text>}
                    </>
                ) : null}
                {!loading && routes.length === 0 ? (
                    <Text style={styles.empty}>
                        {error || 'No routes with configured start and end points are available yet.'}
                    </Text>
                ) : null}
                <Text style={styles.disclaimer}>
                    Route points are not verified boarding stops. A driver response is not a confirmed seat or vehicle assignment; no live arrival time or fare is available.
                </Text>
            </ScrollView>

            {loading && routes.length === 0 && !error ? (
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color="#1b4332" />
                    <Text style={styles.empty}>Loading route information…</Text>
                </View>
            ) : null}

            {error && routes.length > 0 ? (
                <TouchableOpacity onPress={fetchData} style={styles.retry}>
                    <Text style={styles.retryText}>Couldn’t refresh route data. Tap to retry.</Text>
                </TouchableOpacity>
            ) : null}

            {/* No map-based ETA or seat availability is presented without supporting data. */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.bookButton, (!selectedRoute || bookingLoading) && styles.disabledButton]}
                    onPress={handleBook}
                    disabled={bookingLoading || !selectedRoute || !routes.length}
                >
                    {bookingLoading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.btnText}>Send ride request</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f7f5ef', paddingTop: Platform.OS === 'android' ? 30 : 0 },
    headerContainer: { padding: 20, backgroundColor: 'white', borderBottomLeftRadius: 20, borderBottomRightRadius: 20, marginBottom: 10, elevation: 2 },
    header: { fontSize: 26, fontWeight: 'bold', color: '#1b4332' },
    subHeader: { color: 'gray', marginTop: 5 },
    card: { backgroundColor: 'white', padding: 20, marginHorizontal: 20, marginBottom: 15, borderRadius: 15, elevation: 2 },
    selectedCard: { borderColor: '#2d6a4f', borderWidth: 2, backgroundColor: '#edf5ef' },
    row: { flexDirection: 'row', alignItems: 'center' },
    info: { flex: 1, marginLeft: 15 },
    routeName: { fontWeight: 'bold', fontSize: 18, color: '#333' },
    routeDetails: { color: '#666', marginTop: 4 },
    routeTime: { color: '#888', fontSize: 12, marginTop: 4 },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: '#f7f5ef' },
    bookButton: { backgroundColor: '#1b4332', padding: 18, borderRadius: 15, alignItems: 'center', elevation: 2 },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
    disabledButton: { opacity: 0.55 },
    planner: { paddingBottom: 112 },
    stepLabel: { fontWeight: '700', fontSize: 16, color: '#1b4332', marginHorizontal: 20, marginTop: 16 },
    stageList: { paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
    stageChip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: '#b8c5bb', backgroundColor: 'white' },
    selectedStageChip: { backgroundColor: '#1b4332', borderColor: '#1b4332' },
    stageText: { color: '#334155', fontWeight: '600' },
    selectedStageText: { color: 'white' },
    disclaimer: { marginHorizontal: 20, marginTop: 8, color: '#475569', lineHeight: 20 },
    empty: { padding: 24, textAlign: 'center', color: '#475569', lineHeight: 22 },
    loading: { position: 'absolute', top: '35%', alignSelf: 'center', alignItems: 'center' },
    retry: { padding: 12, alignItems: 'center' },
    retryText: { color: '#b42318' }
});

export default TicketsPage;
