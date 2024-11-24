import { Image, Dimensions, TouchableOpacity, StyleSheet, Text, View, TextInput } from 'react-native';
import React, { useState, useEffect } from 'react';
import Foundation from 'react-native-vector-icons/Foundation';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AntDesign from 'react-native-vector-icons/AntDesign';
import EvilIcons from 'react-native-vector-icons/EvilIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width, height } = Dimensions.get('window');

const TicketsPage = ({ navigation }) => {
    const [visibleComponent, setVisibleComponent] = useState('TicketsPage');
    const [routeId, setRouteId] = useState(null); // Selected route ID
    const [pickupPoint, setPickupPoint] = useState('');
    const [routes, setRoutes] = useState([]);
    const [commuterId, setCommuterId] = useState(null);
    const [selectedRouteId, setSelectedRouteId] = useState(null); // Track selected route

    useEffect(() => {
        // Fetch routes from the server
        const fetchRoutes = async () => {
            const response = await fetch('http://localhost:3001/routes');
            const data = await response.json();
            setRoutes(data);

            // Automatically select the first route as default (if routes exist)
            if (data.length > 0) {
                setRouteId(data[0].route_id); // Default to the first route
                setPickupPoint(data[0].start_point); // Default pickup point
            }
        };

        fetchRoutes();

        // Fetch commuter_id from the session (login session data)
        const fetchCommuterId = async () => {
            const response = await fetch('http://localhost:3001/get_user', {
                credentials: 'include', // This sends the session cookie
            });
            const data = await response.json();
            setCommuterId(data.commuterId); // Assuming the backend returns commuterId
        };

        fetchCommuterId();
    }, []);

    const handleBookTicket = async () => {
        if (!routeId) {
            alert('Please select a route.');
            return;
        }

        if (!commuterId) {
            alert('User is not logged in.');
            return;
        }

        const matatu_id = 1;

        // Get current time and add a random 10 to 20 minutes
        const currentTime = new Date();
        const randomMinutes = Math.floor(Math.random() * (20 - 10 + 1)) + 10; // Random minutes between 10 and 20
        currentTime.setMinutes(currentTime.getMinutes() + randomMinutes);

        // Format time in ISO format 
        const estimatedPickupTime = currentTime.toISOString();

        const response = await fetch('http://localhost:3001/book-ticket', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                commuter_id: commuterId,
                matatu_id: matatu_id,
                route_id: routeId,
                pickup_point: pickupPoint,
                estimated_pickup_time: estimatedPickupTime,
            }),
        });
        const data = await response.json();
        if (data.message) {
            alert('Ticket booked successfully!');
        } else {
            alert('Failed to book ticket.');
        }
    };

    const setComponent = () => {
        if (visibleComponent === 'TicketsPage') {
            return (
                <View style={styles.page}>
                    <View style={styles.contentContainer}>
                        <View>
                            <Text style={{ color: 'black', fontSize: 15, fontWeight: '800', wordWrap: 'break-word' }}>
                                NO TICKETS PURCHASED
                            </Text>
                            <TouchableOpacity style={styles.ticketButton1} onPress={() => { setVisibleComponent('GetTickets'); }}>
                                <Text style={{ color: 'white', fontSize: 14, fontWeight: '500', lineHeight: 20, letterSpacing: 0.10, wordWrap: 'break-word' }}>Get Tickets</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            );
        } else if (visibleComponent === 'GetTickets') {
            return (
                <View style={styles.page}>
                    <View style={[styles.contentContainer,
                         { alignItems: 'center' }]}>
                        <View style={{ display: 'flex', 
                            flexDirection: 'row',
                             right: 130 }}>
                            <TouchableOpacity style={styles.backButton} 
                            onPress={() => { setVisibleComponent('TicketsPage'); }}>
                                <Text style={{ color: 'white',
                                    fontSize: 14,
                                    fontWeight: '500',
                                    lineHeight: 20,
                                    letterSpacing: 0.10,
                                    wordWrap: 'break-word' }}
                                    >&lt; Go back</Text>
                            </TouchableOpacity>
                            <Text style={{ color: 'black',
                                fontSize: 15,
                                fontWeight: '400',
                                wordWrap: 'break-word',
                                top: 5,
                                left: 90 }
                                }>SELECT YOUR SACCO ROUTE
                            </Text>
                        </View>
                        <View style={{ alignSelf: 'center' }}>
                            {routes.map((route) => (
                                <TouchableOpacity
                                    key={route.route_id}
                                    style={[
                                        styles.saccoRoute,
                                        route.route_id === selectedRouteId && styles.selectedRoute,
                                    ]}
                                    onPress={() => {
                                        setRouteId(route.route_id); // Set the selected route
                                        if (route.route_id === 1) {
                                            setPickupPoint('Strathmore');
                                        } else {
                                            setPickupPoint('Nairobi'); 
                                        }

                                        setSelectedRouteId(route.route_id); // Set the selected route ID to highlight it
                                    }}
                                >
                                    <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center' }}>
                                        <Image source={require('../assets/wm.jpg')} style={styles.image} />
                                        <Text style={{ top: 15 }}>
                                            {route.route_name} : {route.start_point} to {route.end_point}
                                        </Text>
                                        <Image source={require('../assets/Trailing element.png')} style={{ top: 12, left: 80 }} />
                                    </View>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity style={styles.ticketButton} onPress={handleBookTicket}>
                                <Text style={{ color: 'white',
                                    fontSize: 14,
                                    fontWeight: '500',
                                    lineHeight: 20,
                                    letterSpacing: 0.10,
                                    wordWrap: 'break-word' }
                                    }>Book Ticket</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            );
        }

    };


    const BottomBar = () => {
        return (
            <View style={styles.iconscontainer}>
                <View style={styles.icons}>
                    <TouchableOpacity>
                        <Foundation name='home'
                         size={24} 
                         style={styles.icon} 
                         onPress={() => { navigation.navigate("UserHomepage"); }} />
                        <Text>Home</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.icons}>
                    <TouchableOpacity>
                        <MaterialCommunityIcons name='history' 
                        size={24} 
                        color='rgb(107,107,107)' 
                        style={styles.icon} 
                        onPress={() => { navigation.navigate("UserHistoryScreen"); }} />
                        <Text>History</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.icons}>
                    <TouchableOpacity>
                        <Ionicons 
                        name='ticket-outline'
                        color='rgb(107,107,107)'
                        size={24} 
                        style={styles.icon} 
                        onPress={() => { navigation.navigate("TicketsPage"); }} />
                        <Text>Tickets</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.icons}>
                    <TouchableOpacity>
                        <AntDesign name='user' 
                        size={24} 
                        color='rgb(107,107,107)'
                        style={styles.icon}
                        onPress={() => { navigation.navigate("UserAccount"); }} />
                        <Text>Profile</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <>
            {setComponent()}
            {BottomBar()}
        </>
    );
};

const styles = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: 'white',
    },
    contentContainer: {
        margin: 10,
    },

    ticketButton1: {    
        height:40,
        width:151, 
        borderRadius: 100, 
        overflow: 'hidden', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center', 
        gap: 8, 
        display: 'inline-flex',
        color: 'white',
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 20,
        letterSpacing: 0.10,
        left: 1097,
        top: -29 ,
        wordWrap: 'break-word',
        padding: 10,
        marginHorizontal: 5,
        borderWidth: 1,
        borderColor: 'rgba(252, 11, 15, 1)',
        backgroundColor: 'rgba(252, 11, 15, 1)',
    },

    ticketButton: {
        backgroundColor: 'rgb(0,185,122)',
        paddingVertical: 10,
        borderRadius: 5,
        marginVertical: 10,
        alignItems: 'center',
    },
    backButton: { height:40,
        width:90, 
        borderRadius: 100, 
        overflow: 'hidden', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center', 
        gap: 8, 
        display: 'inline-flex',
        color: 'white',
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 20,
        letterSpacing: 0.10,
        wordWrap: 'break-word',
        padding: 10,
        marginHorizontal: 5,
        borderWidth: 1,
        borderColor: 'rgb(0, 0, 0)',
        backgroundColor: 'rgb(0, 0, 0)',
    },
    saccoRoute: {
        backgroundColor: 'white',
        paddingVertical: 20,
        paddingHorizontal: 10,
        marginVertical: 10,
        borderRadius: 5,
        shadowColor: 'rgba(0, 0, 0, 0.25)',
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        shadowOpacity: 1,
        margin:10,
        width:550,
        height:82,
        justifyContent:'center',
        backgroundColor:'rgb(255, 255, 255)',
        borderColor:'rgb(255, 255, 255)',
        borderRadius:8,
    },
    selectedRoute: {
        backgroundColor: 'rgb(0,185,122)', 
    },
    image: {
        width: 50,
        height: 50,
        borderRadius: 50,
        marginRight: 10,
    },

    iconscontainer: {
        display: 'flex',
        flexDirection: 'row',
        height:80,
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: 'rgb(207,220,255)'
    },
    icons: {
        color: 'blue',
        flex: 1,
        alignItems: 'center',
    },
    icon: {
         paddingLeft:11,
        marginBottom: 5,
    },
});

export default TicketsPage;
