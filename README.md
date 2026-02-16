# 🫓 Lavash Bakery Management System (Full Stack Edition)

> **A self-hosted, full-stack mobile solution for bakery production planning and debt tracking.**

This project represents the **Self-Hosted / Architectural** evolution of the Lavash Bakery system. Demonstrating a robust **Client-Server architecture**, it features a custom **Node.js & Express API** backend connected to a **MySQL** database, replacing the initial Serverless implementation.

It is designed to solve real-world problems for small bakeries: replacing paper/Excel chaos with a digital, mobile-first ledger system.

![Project Status](https://img.shields.io/badge/Status-Production_Ready-success)
![Frontend](https://img.shields.io/badge/Mobile-React_Native-blue)
![Backend](https://img.shields.io/badge/Backend-Node.js_Express-green)
![Database](https://img.shields.io/badge/Database-MySQL-orange)

---

## 🏗️ Architecture & Technical Migration

This project was refactored to a traditional **REST API architecture** to demonstrate full control over data logic, security, and transaction management.

### Key Architectural Decisions:
1.  **Logic Layer Shift:**
    * Business logic (e.g., updating balances, marking orders as paid) is handled explicitly in the **API Service Layer** using **MySQL Transactions**. This ensures ACID compliance and makes the code easier to test.
2.  **Data Structure:**
    * Utilizes `INT AUTO_INCREMENT` primary keys for optimized indexing.
    * Implemented `FOREIGN KEY` constraints with `RESTRICT` mode to ensure data integrity.
3.  **API Communication:**
    * A custom `api.ts` service layer manages all RESTful communication between the React Native app and the Node.js server.

---

## 🚀 Key Features

* **🛒 Advanced Order Management:**
    * Bulk order entry interface for speed.
    * **Atomic Transactions:** Ensures order creation and balance updates happen simultaneously.
* **💰 Smart Debt Tracking:**
    * Real-time balance calculation.
    * **Auto-Complete Logic:** When a payment clears a customer's debt, the backend automatically marks all past "Pending" orders as "Paid".
* **📊 Reporting:**
    * Daily production summaries.
    * Excel (`.xlsx`) export generation for accounting.
    * WhatsApp text summary sharing.

---

## 🛠️ Tech Stack

### Backend (The Core)
* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** MySQL (Relational)
* **Libraries:** `mysql2` (Driver), `dotenv` (Config), `cors` (Security).

### Frontend (The Mobile App)
* **Framework:** React Native (Expo Router)
* **Language:** TypeScript
* **State Management:** Zustand (with Persistence)
* **HTTP Client:** Native Fetch API

---

## Screenshots

<p align="center">
  <img src="https://github.com/user-attachments/assets/53dff526-471c-4e79-9fcc-eec8c0f41aae" width="165" />
  <img src="https://github.com/user-attachments/assets/f8dfadfa-693e-41f8-b5b5-233bd37c5dda" width="165" />
  <img src="https://github.com/user-attachments/assets/69fb6ba3-18d1-4fa7-b315-d46db336fccd" width="165" />
  <img src="https://github.com/user-attachments/assets/8c1f5790-5862-4677-b929-f1b6991108db" width="165" />
  <img src="https://github.com/user-attachments/assets/97390dbb-7cec-4e16-9d0d-8f43e71f220e" width="165" />
  <img src="https://github.com/user-attachments/assets/fd25be30-bbd1-41d8-9f82-7005c3bd9585" width="165" />
</p>

---

## ⚙️ Installation & Setup Guide

### Prerequisites
* Node.js installed.
* MySQL Server installed and running locally.

### Step 1: Database Setup
1.  Create a MySQL database named `lavash_bakery`.
2.  Run the provided schema script to create tables:
    ```bash
    mysql -u root -p lavash_bakery < backend/schema.sql
    ```

### Step 2: Backend (API) Setup
1.  Navigate to the backend folder:
    ```bash
    cd backend
    npm install
    ```
2.  Create a `.env` file based on `.env.example` and configure your DB credentials:
    ```env
    DB_HOST=localhost
    DB_USER=root
    DB_PASSWORD=your_password
    DB_NAME=lavash_bakery
    PORT=3000
    ```
3.  Start the server:
    ```bash
    node server.js
    # Server running on http://localhost:3000
    ```

### Step 3: Frontend (Mobile) Setup
1.  Navigate back to the root folder and install dependencies:
    ```bash
    cd ..
    npm install
    ```
2.  **Critical Configuration:** Open `lib/api.ts` and update the `BASE_URL` with your computer's local IPv4 address so the phone can reach the server:
    ```typescript
    // lib/api.ts
    const BASE_URL = '[http://192.168.1.](http://192.168.1.)XX:3000'; // Replace XX with your actual IP
    ```
3.  Run the app:
    ```bash
    npx expo start
    ```

---

## 📄 License

This project is licensed under the MIT License.
