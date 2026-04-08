# 📊 ExpenseFlow



## 🚀 Overview
**ExpenseFlow** is a modern, high-performance **Reimbursement Management System** designed to streamline how organizations handle employee expenses. Built with a focus on speed, reliability, and user experience, ExpenseFlow leverages OCR technology to automate data entry and provides a robust multi-level approval workflow.

Developed as a specialized solution for the **Odoo Hackathon**, it combines the power of **React + Vite** for the frontend with **Neon PostgreSQL** for a seamless serverless database experience.

---

## ✨ Key Features

### 🔍 Smart OCR Receipt Scanning
Never type an expense manually again. ExpenseFlow uses **Tesseract.js** to scan receipts in real-time, automatically extracting:
*   **Merchant Name**
*   **Transaction Date**
*   **Total Amount**
*   **Category Classification** (e.g., Travel, Meals, Medical)

### 📈 Dynamic Analytics Dashboard
Get a high-level overview of your finances with visual stats.
*   **Monthly Spend Tracking**: Monitor spending trends over time.
*   **Category Breakdown**: See exactly where the budget is going.
*   **Approval Status**: Quick access to pending, approved, and rejected claims.

### 🛡️ Advanced Multi-Role Workflow
Configurable approval logic for any organization size:
*   **Sequential Approval**: Route expenses through specific managers.
*   **Percentage-based Approval**: Require a consensus from a group of approvers.
*   **Role-based Access**: Custom views for **Employees**, **Managers**, **Admins**, and **Super Admins**.

### 🌍 Multi-Currency Support
Built for global teams with real-time currency conversion integrated via the **ExchangeRate-API**.

### 📄 Professional PDF Exports
Generate clean, professional reimbursement reports and history logs using **jsPDF** and **AutoTable**.

### ☁️ Cloud Persistence & Offline Resilience
*   **Neon Serverless Postgres**: Lightning-fast cloud syncing.
*   **Smart Local Logic**: Robust `localStorage` fallback ensures your data is safe even if the connection drops.

---

## 🛠️ Tech Stack

*   **Frontend**: React 19, Vite, React Router 7
*   **Styling**: Vanilla CSS (Modern CSS Variables & Glassmorphism)
*   **Database**: Neon PostgreSQL (Serverless)
*   **OCR Engine**: Tesseract.js
*   **Icons**: Lucide React
*   **PDF Generation**: jsPDF, jsPDF-AutoTable
*   **Utilities**: Date-fns, Currency APIs

---

## 🚦 Getting Started

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/KammariSadguruSai/Reimbursement-management.git
cd odoo-hack
```

### 2️⃣ Install Dependencies
```bash
npm install
```

### 3️⃣ Configure Environment Variables
Create a `.env.local` file in the root directory and add your Neon DB credentials:
```env
VITE_DATABASE_URL=your_postgresql_connection_string
VITE_ADMIN_EMAIL=admin@expenseflow.com
VITE_ADMIN_PASSWORD=admin
```

### 4️⃣ Launch the Application
```bash
npm run dev
```

---

## 📂 Project Structure

```text
src/
├── components/         # Reusable UI components (Layout, Toast, etc.)
├── pages/              # Main application views
│   ├── Approvals.jsx   # Manager approval flow
│   ├── Auth.jsx        # Login/Signup/Forgot Password
│   ├── Dashboard.jsx   # Analytics and stats
│   ├── Expenses.jsx    # OCR-enabled expense submission
│   ├── History.jsx     # Exportable expense archives
│   ├── Settings.jsx    # Profile and preferences
│   ├── SuperAdmin.jsx  # Global system controls
│   └── Team.jsx        # Member management
├── store.jsx           # Central state management & Database Sync
├── index.css           # Global design system
└── main.jsx            # App entry point
```

---

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License
This project is licensed under the MIT License.

---
*Created for the Odoo Hackathon by [Sadguru Sai](https://github.com/KammariSadguruSai)*
