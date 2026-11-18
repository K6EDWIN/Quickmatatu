import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { apiRequest } from './api';

const DriverHistoryScreen = () => {
  const [activeTab, setActiveTab] = useState('requests');
  const [requests, setRequests] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingTicket, setUpdatingTicket] = useState(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const [incoming, past] = await Promise.all([
        apiRequest('/driver/bookings'),
        apiRequest('/driver/bookings/history'),
      ]);
      if (!Array.isArray(incoming) || !Array.isArray(past)) {
        throw new Error('Booking information is unavailable.');
      }
      setRequests(incoming);
      setHistory(past);
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Unable to load driver bookings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const updateStatus = async (ticketId, status) => {
    setUpdatingTicket(ticketId);
    try {
      await apiRequest('/update-booking-status', {
        method: 'POST',
        body: JSON.stringify({ ticket_id: ticketId, status }),
      });
      await fetchBookings();
    } catch (requestError) {
      const message = requestError.message || 'Unable to update this request.';
      if (Platform.OS === 'web') window.alert(message);
      else Alert.alert('Request not updated', message);
    } finally {
      setUpdatingTicket(null);
    }
  };

  const data = activeTab === 'requests' ? requests : history;
  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.routeName}>{item.route_name || 'Route unavailable'}</Text>
        <Text style={[styles.status, item.status === 'accepted' ? styles.accepted : null]}>
          {item.status}
        </Text>
      </View>
      <Text style={styles.detail}>{item.start_point} to {item.end_point}</Text>
      <Text style={styles.detail}>Boarding: {item.pickup_point}</Text>
      <Text style={styles.detail}>Commuter: {item.commuter_name || 'Quickmatatu commuter'}</Text>
      <Text style={styles.detail}>
        Requested {item.booking_time ? new Date(item.booking_time).toLocaleString() : 'time unavailable'}
      </Text>
      {activeTab === 'requests' && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => updateStatus(item.ticket_id, 'accepted')}
            disabled={updatingTicket !== null}
            accessibilityRole="button"
          >
            <Text style={styles.actionText}>{updatingTicket === item.ticket_id ? 'Updating…' : 'Accept request'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => updateStatus(item.ticket_id, 'rejected')}
            disabled={updatingTicket !== null}
            accessibilityRole="button"
          >
            <Text style={styles.rejectText}>Decline</Text>
          </TouchableOpacity>
        </View>
      )}
      {activeTab === 'history' && item.status === 'accepted' && (
        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton, { marginTop: 12 }]}
          onPress={() => updateStatus(item.ticket_id, 'completed')}
          disabled={updatingTicket !== null}
          accessibilityRole="button"
        >
          <Text style={styles.actionText}>
            {updatingTicket === item.ticket_id ? 'Updating…' : 'Mark ride completed'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Driver bookings</Text>
      <View style={styles.tabs}>
        {['requests', 'history'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab }}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab === 'requests' ? `Requests (${requests.length})` : 'History'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading && data.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1b4332" />
          <Text style={styles.message}>Loading bookings…</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.ticket_id)}
          contentContainerStyle={data.length ? styles.list : styles.emptyList}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchBookings} />}
          ListEmptyComponent={<Text style={styles.message}>{error || `No ${activeTab} yet.`}</Text>}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f5ef', padding: 20, paddingTop: 52 },
  title: { color: '#1b4332', fontSize: 26, fontWeight: '700', marginBottom: 18 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#d8ddd8', marginBottom: 12 },
  tab: { paddingVertical: 12, paddingHorizontal: 16, marginRight: 8 },
  activeTab: { borderBottomWidth: 3, borderBottomColor: '#2d6a4f' },
  tabText: { color: '#475569', fontWeight: '600' },
  activeTabText: { color: '#1b4332' },
  list: { paddingBottom: 24 },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  message: { color: '#475569', textAlign: 'center', padding: 24, lineHeight: 22 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginVertical: 7, borderWidth: 1, borderColor: '#e5e7eb' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  routeName: { flex: 1, color: '#1b4332', fontSize: 17, fontWeight: '700' },
  status: { color: '#8a4b08', fontWeight: '700', textTransform: 'capitalize' },
  accepted: { color: '#2d6a4f' },
  detail: { color: '#475569', marginVertical: 3 },
  actions: { flexDirection: 'row', marginTop: 12, gap: 10 },
  actionButton: { flex: 1, borderRadius: 9, padding: 12, alignItems: 'center' },
  acceptButton: { backgroundColor: '#2d6a4f' },
  rejectButton: { borderWidth: 1, borderColor: '#b42318' },
  actionText: { color: 'white', fontWeight: '700' },
  rejectText: { color: '#b42318', fontWeight: '700' },
});

export default DriverHistoryScreen;
