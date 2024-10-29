import React, { useEffect, useState } from "react";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./HistoryScreen.css";

const HistoryScreen = () => {
  const [tripHistory, setTripHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("history");
  const [selectedDate, setSelectedDate] = useState(new Date());

  const fetchTripHistory = async (date) => {
    try {
      const driverId = 6;
      const formattedDate = date.toISOString().slice(0, 10);
      console.log(`Fetching trips for driver ${driverId} on ${formattedDate}`);

      const response = await axios.get(
        `http://localhost:8000/drivers/${driverId}/trip-history?date=${formattedDate}`
      );

      console.log("API Response:", response.data);

      if (Array.isArray(response.data) && response.data.length > 0) {
        setTripHistory(response.data);
      } else {
        alert(`No trip history found for ${formattedDate}.`);
        setTripHistory([]);
      }
    } catch (error) {
      console.error("Error fetching trip history:", error);
      alert("Unable to fetch trip history. Please try again.");
      setTripHistory([]);
    }
  };

  useEffect(() => {
    fetchTripHistory(selectedDate);
  }, [selectedDate]);

  return (
    <div className="history-container">
      <header className="history-header">
        <h1 className="header-text">History</h1>
        <DatePicker
          selected={selectedDate}
          onChange={(date) => {
            setSelectedDate(date);
            fetchTripHistory(date);
          }}
          dateFormat="yyyy-MM-dd"
          className="date-picker"
        />
      </header>

      <div className="trip-list">
        {tripHistory.length > 0 ? (
          tripHistory.map((trip) => (
            <div className="trip-card" key={trip.id}>
              <div className="trip-info">
                <h3 className="trip-label">Route:</h3>
                <p className="trip-route">{trip.route || "Unknown Route"}</p>
              </div>
              <div className="trip-details">
                <div className="fare">
                  <img src="/money-1.png" alt="Currency Icon" className="currency-icon" />
                  <p className="fare-text">Ksh 1000</p>
                </div>
                <p id="tripstatus" className={`trip-status ${trip.status}`}>
                  {trip.status || "Status Unknown"}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="no-history-text">No trip history available</p>
        )}
      </div>

      <div className="bottom-nav-container">
        {renderBottomNavButton("Home", "/home-icon.png", activeTab, setActiveTab)}
        {renderBottomNavButton("History", "/history-icon.png", activeTab, setActiveTab)}
        {renderBottomNavButton("Tickets", "/ticket-icon.png", activeTab, setActiveTab)}
        {renderBottomNavButton("Account", "/user-icon.png", activeTab, setActiveTab)}
      </div>
    </div>
  );
};

const renderBottomNavButton = (title, iconSrc, activeTab, setActiveTab) => (
  <div
    className={`bottom-nav ${activeTab === title.toLowerCase() ? "active" : ""}`}
    onClick={() => setActiveTab(title.toLowerCase())}
  >
    <img src={iconSrc} alt={`${title} Icon`} className="nav-icon" />
    <span>{title}</span>
  </div>
);

export default HistoryScreen;
