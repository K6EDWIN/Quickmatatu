import React, { useEffect, useState } from "react";
import { View, Text, Alert, Image, TouchableOpacity, StyleSheet, Platform, ScrollView } from "react-native";
import axios from "axios";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ScreenWidth } from "react-native-elements/dist/helpers";

const HistoryScreen = () => {
  const [tripHistory, setTripHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("history");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const fetchTripHistory = async (date) => {
    try {
      const driverId = 6;
      const formattedDate = date.toISOString().slice(0, 10);
      console.log(`Fetching trips for driver ${driverId} on ${formattedDate}`);

      const response = await axios.get(
        `http://10.0.2.2:8000/drivers/${driverId}/trip-history?date=${formattedDate}`
      );

      if (Array.isArray(response.data) && response.data.length > 0) {
        setTripHistory(response.data);
      } else {
        Alert.alert(`No trip history found for ${formattedDate}.`);
        setTripHistory([]);
      }
    } catch (error) {
      console.error("Error fetching trip history:", error);
      Alert.alert("Unable to fetch trip history. Please try again.");
      setTripHistory([]);
    }
  };

  useEffect(() => {
    fetchTripHistory(selectedDate);
  }, [selectedDate]);

  return (
    <View style={styles.historyContainer}>
      <View style={styles.historyHeader}>
        <Text style={styles.headerText}>Your History</Text>

        {/* Date Container */}
        <View style={styles.dateContainer}>
          <TouchableOpacity onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dateText}>{selectedDate.toISOString().slice(0, 10)}</Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            onChange={(event, date) => {
              setShowDatePicker(false);
              if (date) {
                setSelectedDate(date);
                fetchTripHistory(date);
              }
            }}
          />
        )}
      </View>

      {/* Scrollable Content */}
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <View style={styles.tripList}>
          {tripHistory.length > 0 ? (
            tripHistory.map((trip) => (
              <View style={styles.tripCard} key={trip.id}>
                <View style={styles.tripInfo}>
                  <Text style={styles.tripLabel}>Route:</Text>
                  <Text style={styles.tripRoute}>{trip.route || "Unknown Route"}</Text>
                  <Image source={require("./assets/locicon.png")} style={styles.locationIcon} />
                </View>
                <View style={styles.tripDetails}>
                  <View style={styles.fare}>
                    <Image source={require("./assets/money-1.png")} style={styles.currencyIcon} />
                    <Text style={styles.fareText}>Ksh 1000</Text>
                  </View>
                  <Text style={[styles.tripStatus, styles[trip.status]]}>
                    {trip.status || "Status Unknown"}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noHistoryText}>No trip history available</Text>
          )}
        </View>
      </ScrollView>

      <View style={styles.bottomNavContainer}>
        {renderBottomNavButton("Home", require("./assets/home-icon.png"), activeTab, setActiveTab)}
        {renderBottomNavButton("History", require("./assets/history-icon.png"), activeTab, setActiveTab)}
        {renderBottomNavButton("Account", require("./assets/user-icon.png"), activeTab, setActiveTab)}
      </View>
    </View>
  );
};

const renderBottomNavButton = (title, iconSrc, activeTab, setActiveTab) => (
  <TouchableOpacity
    style={[styles.bottomNav, activeTab === title.toLowerCase() && styles.active]}
    onPress={() => setActiveTab(title.toLowerCase())}
  >
    <Image source={iconSrc} style={styles.navIcon} />
    <Text>{title}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  historyContainer: {
    flex: 1,
    padding: 20,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerText: {
    flex: 1,
    textAlign: "center",
    fontSize: 30,
    fontWeight: "bold",
  },
  dateContainer: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  dateText: {
    fontSize: 16,
  },
  scrollContainer: {
    flex: 1,
    marginTop: 20,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  tripList: {
    flex: 1,
  },
  tripCard: {
    padding: 15,
    backgroundColor: "#f0f0f0",
    marginBottom: 10,
    borderRadius: 8,
  },
  tripInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  tripLabel: {
    fontWeight: "bold",
  },
  tripRoute: {
    fontSize: 20,
  },
  tripDetails: {
    flexDirection: "row",
    alignItems: "center",
  },
  fare: {
    flexDirection: "row",
    alignItems: "center",
  },
  currencyIcon: {
    width: 20,
    height: 20,
    marginRight: 5,
  },
  locationIcon: {
    width: 20,
  },
  fareText: {
    fontSize: 16,
  },
  tripStatus: {
    fontSize: 14,
    color: "#888",
    marginLeft: 45,
  },
  noHistoryText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 20,
  },
  bottomNavContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 20,
    borderRadius: 32,
    backgroundColor: "#ddd",
    width: ScreenWidth * 0.9,
  },
  bottomNav: {
    alignItems: "center",
  },
  active: {
    color: "#000",
  },
  navIcon: {
    width: 24,
    height: 24,
    marginBottom: 5,
  },
});

export default HistoryScreen;
