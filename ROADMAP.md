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
| **Cloud Database Sync** | Server sync using Firebase / Supabase for cross-device access | 📋 Planned | v2.0.0 |
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
