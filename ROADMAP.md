# Tempo - Feature Roadmap & Changelog

This document tracks the feature roadmap, active task list, completed milestones, and changelog for the **Tempo (Contract Work Time Tracker)** application.

---

## 🚀 Status Board

| Feature Area | Description | Status | Target Release |
| :--- | :--- | :--- | :--- |
| **Theme Customization** | Light / Dark mode toggle with CSS HSL transitions | ✅ Completed | v1.0.0 |
| **Stopwatch Tracker** | Real-time active stopwatch with threshold validation logging | ✅ Completed | v1.0.0 |
| **Client CRUD Manager** | Manage client lists, addresses, and base billing rates | ✅ Completed | v1.0.0 |
| **Category Registry** | Custom work categories registry for task segmentation | ✅ Completed | v1.0.0 |
| **Time Log Filter/Bulk Actions** | Filter logs by client/status/date; bulk status transitions | ✅ Completed | v1.0.0 |
| **PDF Invoice Generator** | Compile dynamic invoices with custom taxes and payment info | ✅ Completed | v1.0.0 |
| **User Sign-up & Login** | Gated sessions and local-first namespaced data isolation | ✅ Completed | v1.1.0 |
| **Inline Category Modifying** | Rename categories inline with cascading updates to logs | ✅ Completed | v1.2.0 |
| **Pop-out Timer Window** | Standalone popout tracker window with cross-tab sync | ✅ Completed | v1.3.0 |
| **Cloud Database Sync** | Server sync using AWS Amplify Gen 2 for persistent cloud storage and cross-device sync | ✅ Completed | v1.4.0 |
| **Invoice Email Integration** | Send PDF invoices directly to client emails from the app | 📋 Planned | v2.1.0 |
| **Timer Idle Detection** | Prompt user to discard or resume if timer runs but no keyboard/mouse activity is detected | 📋 Planned | v2.2.0 |

---

## 🛠️ Bug Fixes & Hotfixes Ledger

### 🐛 PDF AutoTable Reference Error (Fixed in v1.0.1)
* **Issue**: Generating an invoice threw `TypeError: doc.autoTable is not a function` in the browser console.
* **Cause**: In ES modules / Vite bundler, importing `jspdf-autotable` does not automatically attach the method to the prototype of `jsPDF` when imported anonymously.
* **Resolution**: Imported `autoTable` as the default export (`import autoTable from 'jspdf-autotable'`) and called it directly: `autoTable(doc, options)`.

---

## 📜 Changelog

### [v1.4.0] - 2026-06-03
#### Added
* Migrated state synchronization and data storage from local browser storage to **AWS Amplify Gen 2** backend cloud infrastructure.
* Provisioned Cognito User Pools for email-based authentication and secure session management.
* Configured owner-isolated DynamoDB storage via AWS AppSync GraphQL endpoints for `Client`, `Category`, `TimeEntry`, and `UserProfile` records.
* Created a resilient frontend data synchronization architecture with dynamic fallback for offline local-first previews.
* Implemented a secure "Delete Account" flow under User Profile settings, executing complete cascading deletions across Cognito user pools and user-associated cloud tables.

### [v1.3.2] - 2026-06-03
#### Added
* Generated a modern, minimalist gradient hourglass logo asset (`tempo_logo.png`).
* Integrated the logo into the login/registration screen and the primary application sidebar navigation header.

### [v1.3.1] - 2026-06-03
#### Changed
* Customized browser tab title to "Tempo | Contract Work Time Tracker" (replacing default "Vite + React").
* Replaced the default Vite lightning bolt favicon with a custom gradient brand favicon using an inline SVG data URI.

### [v1.3.0] - 2026-06-02
#### Added
* Dedicated pop-out timer button in the active stopwatch panel, opening a standalone, resizable window (`width=400`, `height=500`).
* Cross-window synchronization using the browser's `storage` event handler. The main dashboard and the pop-out window stay perfectly in sync in real-time.
* Non-blocking timestamp delta calculations: elapsed time is computed relative to high-resolution system timestamps stored in `localStorage`, preventing browser clock drift or window freezing.
* Gated access: Standalone popout enforces session validation to preserve data sandboxing.

### [v1.2.0] - 2026-06-02
#### Added
* Inline category modification (editing/renaming) inside the Category Manager.
* Cascading updates: Renaming a category scans and updates the category field in all existing time logs automatically to preserve data consistency.
* Duplicate name prevention checks when renaming a category.

### [v1.1.0] - 2026-06-02
#### Added
* A glassmorphic user authentication login and signup gate.
* Multi-user sandboxing: namespaced storage in `localStorage` keyed by user ID to prevent data sharing between different users.
* Dynamic dashboard seeding: newly registered accounts get initialized with standard template entries and clients to ensure an immediate visual experience.
* **Log Out** button added to the sidebar navigation.

### [v1.0.0] - 2026-06-02
#### Added
* Initial project release containing Dashboard, Stopwatch Tracker, Client Mgr, Category Mgr, Manual Logs, Filters, and PDF Invoice Generation.

---

## 📅 Upcoming Sprints (Outline)

*Note: This is an initial planning outline for upcoming fixes and enhancements. Development has not yet started.*

### Sprint 1: Authentication & Security
* **Finish Authentication**: Ensure all edge cases and login screens are solid.
* **Password Reset**: Implement Cognito password recovery flows.
* **Session Management**: Handle session timeouts, token refreshments, and logouts.
* **Data Isolation Review**: Perform security checks on owner-based AppSync data partitions.

### Sprint 2: Timer Persistence & Recovery
* **Timer Persistence**: Save active stopwatch timer state in the cloud/database.
* **Browser Refresh Recovery**: Recover active running timers automatically after a page refresh.
* **Session Recovery**: Seamlessly restore application state on login session resumption.
* **Active Timer Safeguards**: Prevent accidental navigation or logging of invalid timer states.

### Sprint 3: Mobile Experience Optimization
* **Responsive Layouts**: Optimize page grids and sidebars for tablet and mobile viewports.
* **Mobile Dashboard**: Simplified analytics charts and card summaries for small screens.
* **Mobile Timer Experience**: A touch-optimized active timer dashboard and widget.

### Sprint 4: Invoicing, Export & Branding
* **PDF Improvements**: Refine page break calculations, column widths, and fonts.
* **Export Improvements**: Enhance raw JSON backup, CSV formats, and import parsers.
* **Branding**: Further polish logos, colors, invoice styling, and custom brand configurations.
