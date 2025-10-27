# 🚐 Quick Matatu

[![React Native](https://img.shields.io/badge/React%20Native-0.72-blue.svg)](https://reactnative.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[cite_start]A mobile application designed to enhance the reliability and efficiency of Kenya's matatu transport system [cite: 21][cite_start], complete with a prototype GUI built using **React Native**[cite: 979]. This project was developed as a deep dive into software engineering and real-world problem-solving for urban mobility.

[cite_start]It supports core features for both commuters and matatu operators, designed to optimize schedules, reduce wait times, and increase profitability[cite: 23, 24, 25].

*(**Note:** Add your own screenshots/GIFs here. Upload them to your GitHub repo and replace the links.)*
![Wireframe: User Homepage](https://via.placeholder.com/300x600.png?text=User+Homepage+Screenshot)
![Wireframe: Driver Homepage](https://via.placeholder.com/300x600.png?text=Driver+Homepage+Screenshot)

## ✨ Features

[cite_start]The system is designed with two primary user types: Commuters and Drivers[cite: 119].

### For Commuters
* [cite_start]**User Registration:** Register for an account using an email, username, and password[cite: 123].
* [cite_start]**Live Location Tracking:** View the real-time GPS location of matatus on your selected route[cite: 133, 188].
* [cite_start]**View ETAs:** See the approximate arrival time for matatus approaching your pick-up stage[cite: 134, 170].
* [cite_start]**Book a Matatu:** Select and book a seat on your preferred matatu[cite: 135, 136].
* [cite_start]**Cancel Bookings:** Ability to cancel a booking if your plans change[cite: 138].
* [cite_start]**Rate & Review:** Rate your ride experience after completion to provide feedback[cite: 139, 216].

### For Drivers
* [cite_start]**Secure Registration:** A verified registration process requiring an ID number, driver's license, and car number plate[cite: 121, 181].
* [cite_start]**Live Location Sharing:** Drivers can share their location when active and stop sharing when the matatu is full[cite: 140, 141, 194].
* [cite_start]**Booking Management:** Receive real-time booking notifications from commuters[cite: 142, 203].
* [cite_start]**Confirm/Cancel Bookings:** Accept or reject incoming booking requests based on vehicle capacity[cite: 143, 144].

## ⚙️ System Architecture

[cite_start]The core of this application is an **algorithm** that aggregates preferred departure times from multiple commuters to calculate the most optimal and convenient pickup times for both commuters and operators[cite: 23, 42].

This system is built on a high-level design consisting of several key components:

* [cite_start]**User Interface (React Native):** The mobile front-end for both commuters and drivers[cite: 166, 979].
* [cite_start]**Authentication & User Management:** Securely handles user registration, login, and profile management[cite: 178].
* [cite_start]**Matatu Location Tracking:** Uses GPS services to track and share real-time vehicle locations[cite: 187, 189].
* [cite_start]**Booking & Ride Management:** Manages all booking requests, confirmations, and cancellations[cite: 197, 198].
* [cite_start]**Backend API Services:** Acts as the central communication hub between the mobile app and the database[cite: 231, 232].
* [cite_start]**Database:** Stores all user data, route information, and booking details[cite: 223, 225].

## 🛠️ Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing.

### Prerequisites

* [React Native Development Environment](https://reactnative.dev/docs/environment-setup) (Node.js, Watchman, etc.)
* Git
* An Android Emulator or iOS Simulator

### Installation

1.  **Clone the repository:**
    ```sh
    git clone [https://github.com/YourUsername/YourRepoName.git](https://github.com/YourUsername/YourRepoName.git)
    cd YourRepoName
    ```
2.  **Install the required packages:**
    ```sh
    npm install
    ```
    *(or `yarn install`)*

## 🚀 Usage

To run the app, execute the following commands from the root directory.

**For Android:**
```sh
npm run android
