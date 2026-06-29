# Tempo - Contract Work Time Tracker

**Tempo** is a modern, glassmorphic web application built specifically for independent 1099 contractors and freelancers to track active contract hours, manage client budgets, and estimate tax reserves. 

Developed with a local-first architecture and cloud database synchronization using **AWS Amplify Gen 2**, Tempo is designed to keep your billable hours secure even during local network dropouts or browser refreshes.

---

## ✨ Core Features

*   ⏱️ **Active Stopwatch Tracker**: Real-time timer synchronizing across windows and tabs, featuring delta-time calculations that resist browser thread freezing.
*   🚦 **Timer Inactivity Idle Detection**: Protects logs by pausing running timers when you step away, with choices to resume, keep, or discard idle minutes.
*   📂 **Client & Category Pinning**: Pin favorite clients and categories to float them to the top of all dropdowns and selection menus.
*   🔍 **Time Logs Dashboard**: Filter, search, and sort timesheets, with bulk status transitions and named "Saved Views" for fast queries.
*   🧾 **Invoices Registry & Lifecycle**: Automated tax calculations, payment status updates (Unpaid, Paid, Overdue), and tracking of monthly/weekly client budget limits.
*   🔄 **Entry-to-Invoice Auto-Sync**: Bidirectional lifecycle synchronization between log statuses and invoice payments, including a direct "Unpay" restore trigger.
*   📊 **1099 Tax Estimator**: Real-time tax reserve calculations showing automatic FICA Self-Employment taxes (effective flat `14.13%` rate) combined with custom income tax rates.
*   📅 **Tax Deadline Exporter**: Tracks next upcoming estimated tax deadlines and exports timezone-safe, Outlook-friendly All-Day Event `.ics` files.
*   ⌨️ **Power-User Keyboard Hotkeys**: Control the dashboard entirely via hotkeys: timer start/pause (`Space`), log creation (`N`), search (`/`), and tab swapping (`1`-`8`).
*   🧠 **Smart NLP Log Parser**: Natural language queries parser to extract client names, task categories, and decimal durations from raw text.
*   🩹 **Time Log Gap Finder**: Scans past weekdays for missing hours against your daily target, offering quick-log prompts to complete your timesheet.

---

## 🛠️ Technology Stack

*   **Frontend**: React (v19) + Vite (v6)
*   **Styling**: Vanilla CSS with custom HSL variables and transitions
*   **Backend & Cloud Database**: AWS Amplify Gen 2 (Cognito, DynamoDB, AppSync GraphQL)
*   **Icons**: Lucide React
*   **PDF Generation**: jsPDF + jsPDF-AutoTable

---

## 🚀 Local Development Setup

To run Tempo locally on your machine:

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/ShaiS1/TimeTracker.git
    cd TimeTracker
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Run Developer Sandbox (Optional)**:
    If you want to spin up a local Amplify Gen 2 cloud backend:
    ```bash
    npx ampx sandbox
    ```
    This generates an `amplify_outputs.json` file in your root folder. Without it, Tempo automatically falls back to **local sandbox mode** (storing namespaces isolated in browser LocalStorage).

4.  **Start Dev Server**:
    ```bash
    npm run dev
    ```
    Open `http://localhost:5173` in your browser.

5.  **Build for Production**:
    ```bash
    npm run build
    ```
    The built bundle is compiled into the `dist/` directory.

---

## 🌐 Continuous Integration & Deployment

Tempo is configured for automatic CI/CD deployment via **AWS Amplify Console**. Build settings are defined in [amplify.yml](file:///C:/Users/shais/.gemini/antigravity/scratch/contract-time-tracker/amplify.yml). Commits pushed to `origin/main` automatically trigger backend database migrations and host the updated React production build.
