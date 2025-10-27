# 🚐 Quick Matatu

[![React Native](https://img.shields.io/badge/React%20Native-0.72-blue.svg)](https://reactnative.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A mobile application designed to enhance the reliability and efficiency of Kenya's matatu transport system, complete with a prototype GUI built using **React Native**. This project was developed as a deep dive into software engineering and real-world problem-solving for urban mobility.

It supports core features for both commuters and matatu operators, designed to optimize schedules, reduce wait times, and increase profitability.

*(**Note:** Add your own screenshots/GIFs here. Upload them to your GitHub repo and replace the links.)*
![Wireframe: User Homepage](https://via.placeholder.com/300x600.png?text=User+Homepage+Screenshot)
![Wireframe: Driver Homepage](https://via.placeholder.com/300x600.png?text=Driver+Homepage+Screenshot)

## ✨ Features

The system is designed with two primary user types: Commuters and Drivers.

### For Commuters
* **User Registration:** Register for an account using an email, username, and password.
* **Live Location Tracking:** View the real-time GPS location of matatus on your selected route.
* **View ETAs:** See the approximate arrival time for matatus approaching your pick-up stage.
* **Book a Matatu:** Select and book a seat on your preferred matatu.
* **Cancel Bookings:** Ability to cancel a booking if your plans change.
* **Rate & Review:** Rate your ride experience after completion to provide feedback.

### For Drivers
* **Secure Registration:** A verified registration process requiring an ID number, driver's license, and car number plate.
* **Live Location Sharing:** Drivers can share their location when active and stop sharing when the matatu is full.
* **Booking Management:** Receive real-time booking notifications from commuters.
* **Confirm/Cancel Bookings:** Accept or reject incoming booking requests based on vehicle capacity.

## ⚙️ System Architecture

The core of this application is an **algorithm** that aggregates preferred departure times from multiple commuters to calculate the most optimal and convenient pickup times for both commuters and operators.

This system is built on a high-level design consisting of several key components:

* **User Interface (React Native):** The mobile front-end for both commuters and drivers.
* **Authentication & User Management:** Securely handles user registration, login, and profile management.
* **Matatu Location Tracking:** Uses GPS services to track and share real-time vehicle locations.
* **Booking & Ride Management:** Manages all booking requests, confirmations, and cancellations.
* **Backend API Services:** Acts as the central communication hub between the mobile app and the database.
* **Database:** Stores all user data, route information, and booking details.

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
