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
| **Invoices Registry & Limits** | Invoice Registry, payment states, billable toggles, client budget caps, rounding rules, sync status dot | ✅ Completed | v1.5.0 |
| **Timer Idle Detection** | Prompt user to discard or resume if timer runs but no keyboard/mouse activity is detected | ✅ Completed | v2.1.0 |
| **Recurring/Pinned Elements** | Support pinning favorite clients or frequently used categories | ✅ Completed | v2.1.0 |
| **Saved Filters** | Support saving custom views (e.g., "Current Month Unbilled Work", "Client-Specific Views") | ✅ Completed | v2.1.0 |
| **Tax Estimator** | Suggest monthly tax reserves for 1099 independent contractors based on current tax settings | ✅ Completed | v2.2.0 |
| **Invoice Email Integration** | Send PDF invoices directly to client emails from the app | 📋 Deferred | Backlog |
| **Power-User Hotkeys** | Keyboard shortcuts for timer start/stop, tab switching, and log creation | 📋 Planned | v2.3.0 |
| **Smart NLP Logging** | Support natural language parsing (e.g. "Acme 2h dev coding") to auto-create logs | 📋 Planned | v2.3.0 |
| **Time Audit & Gap Finder** | Detect untracked gaps in standard working hours and prompt logging | 📋 Planned | v2.3.0 |
| **Live Rounding Preview** | View actual vs. rounded time/revenue in real-time on running stopwatch | 📋 Planned | v2.3.0 |
| **Tax Deadlines Integration** | Display IRS quarterly tax payment reminders with calendar export | 📋 Planned | v2.3.0 |


---

## 🛠️ Bug Fixes & Hotfixes Ledger

### 🐛 PDF AutoTable Reference Error (Fixed in v1.0.1)
* **Issue**: Generating an invoice threw `TypeError: doc.autoTable is not a function` in the browser console.
* **Cause**: In ES modules / Vite bundler, importing `jspdf-autotable` does not automatically attach the method to the prototype of `jsPDF` when imported anonymously.
* **Resolution**: Imported `autoTable` as the default export (`import autoTable from 'jspdf-autotable'`) and called it directly: `autoTable(doc, options)`.

### 🐛 Security Lockout in Sandbox Password Reset (Fixed in v2.2.1)
* **Issue**: Requesting a password reset in local mode immediately changed the account's password to a mock `'dummy'` value before verifying the reset code or entering a new password, causing accidental lockouts.
* **Cause**: The `REQUEST_CODE` step called `resetUserPassword(email, 'dummy')` instead of verifying account existence first.
* **Resolution**: Introduced a separate `verifyUserEmail` helper to validate account existence during `REQUEST_CODE`, delaying the actual password update until the correct mock code and new password are submitted.

### 🐛 Invoice Overwrites of Stored Billing Data (Fixed in v2.2.1)
* **Issue**: Regenerating invoices with selected entries did not filter by status, allowing already `Billed` or `Paid` entries to be updated and their old invoice references overwritten.
* **Cause**: Lack of state validation check in `handleInvoiceRequest` inside `EntryList.jsx`.
* **Resolution**: Added client-side filtering to only send `Unbilled` entries to invoice generation, with a warning prompt to inform the user if already billed/paid entries are skipped.

### 🐛 Dropped Client Budgets & Profile Rounding in Cloud Mode (Fixed in v2.2.1)
* **Issue**: Creating a client in cloud mode silently omitted budget and rounding settings, and updating a user profile in settings omitted default rounding rules.
* **Cause**: Properties were missing from the AWS Amplify creation and update payloads in `src/App.jsx`.
* **Resolution**: Updated `Client.create` and `UserProfile` update payloads to explicitly include all budget and rounding settings.

### 🐛 Truncated Cloud Dashboard Queries (Fixed in v2.2.1)
* **Issue**: Long-term users with more than 100 time logs or invoices saw incomplete dashboard statistics and logs list.
* **Cause**: Amplify model `.list()` calls are paginated by default and did not follow the `nextToken` query cursor.
* **Resolution**: Implemented a recursive `listAll` utility to exhaustively follow the pagination cursor and retrieve all records.

### 🐛 Mock Code Bypass in Sandbox Password Reset (Fixed in v2.2.2)
* **Issue**: In local fallback mode, any non-empty verification code was accepted, allowing unauthorized resets.
* **Cause**: The input check only validated that `confirmationCode` was not empty.
* **Resolution**: Added an explicit validation check to verify that `confirmationCode.trim()` is equal to `'123456'`.

### 🐛 Race Condition in Single-Invoice PDF Generation (Fixed in v2.2.2)
* **Issue**: Creating a single invoice marked time entries as billed in the database before the PDF compiler finished downloading the file. If compiler crashed or failed, the database was updated regardless.
* **Cause**: `generateInvoicePDF` was called without the `await` keyword.
* **Resolution**: Added the `await` keyword to the PDF compiler call in `handleGenerateInvoicePDF`.

---

## 📜 Changelog

### [v2.2.0] - 2026-06-17
#### Added
* Implemented 1099 Tax Estimator card on the Dashboard.
* Auto-calculates FICA self-employment taxes (15.3% on 92.35% of gross earnings, translating to an effective flat 14.13% rate).
* Integrates custom user-configured income tax rate to estimate combined tax reserves.
* Displays a detailed breakdown of FICA vs. Income tax reserves.
* Added settings navigation link if no income tax rate is set, while still displaying FICA reserves.

### [v2.1.0] - 2026-06-16
#### Added
* Implemented active stopwatch idle inactivity detection (pauses timer automatically after inactivity threshold and prompts the user with resolution options).
* Added Client/Category pinning in Manager tabs to sort favorite entities to the top of selectors with a 📌 visual prefix.
* Added Saved Views/Filters dashboard manager inside the logs tab.

### [v1.5.0] - 2026-06-05
#### Added
* Implemented Invoices Registry dashboard tab to manage, search, sort, and filter generated client invoices.
* Added invoice lifecycle states (`Unpaid`, `Paid`, `Overdue`) and action triggers: Mark Paid, Delete Invoice, and Re-download PDF invoice.
* Implemented Billable vs. Non-Billable toggles for the real-time stopwatch tracker and manual entry log form.
* Created time duration rounding rules (Nearest 6m, 15m, 30m, Ceil 15m) configurable globally or per-client.
* Added client retainer/budget caps (Hours/Revenue limits) with automated warning alerts and visual progress gauges.
* Added a dynamic connection status indicator in the top header tracking local sandbox fallback, cloud syncing, and offline states.

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

## 📅 Completed Sprints (Archived Planning Outline)

*Note: These sprints have been fully implemented in releases v1.1.0 through v1.5.0.*

### Sprint 1: Authentication, Security & Customization (Completed in v1.1.0 / v1.4.0)
* **Finish Authentication**: Refine registration, login, session recovery, and secure logout flows.
* **Password Reset**: Implement AWS Cognito password recovery and reset flows.
* **Session Management**: Handle session timeouts, token refreshments, and logouts.
* **Data Isolation Review**: Perform security checks on owner-based AppSync data partitions (ensuring users only see their own Clients, Categories, TimeEntries, and Profiles).
* **Cognito Email Customization**: Configure custom verification and password reset email templates matching Tempo branding.

### Sprint 2: Timer Persistence & Reliability (Completed in v1.4.0)
* **Timer Persistence**: Save active stopwatch timer state in the cloud/database so it survives browser crashes, refreshes, device sleep, and network interruptions.
* **Browser Refresh Recovery**: Recover active running timers automatically after a page refresh.
* **Session Recovery**: Seamlessly restore active timer state and session details on reopening the application.
* **Active Timer Safeguards**: Prevent accidental navigation or logging of invalid timer states, ensuring billable hours are never at risk.
* **Offline-First Resilience**: Implement local mutations caching and sync to handle transient network dropouts seamlessly.

### Sprint 3: Mobile Experience Companion (Completed in v1.4.0)
* **Mobile Strategy**: Do not replicate the full desktop interface. Focus on mobile as a quick reference companion.
* **Mobile Dashboard**: Focus on key metrics (Today's Hours, Active Timer, Weekly Hours, Unbilled Earnings, and Recent Entries), avoiding large tables.
* **Mobile Quick Actions**: Allow starting, stopping, pausing timers, viewing today's work, and quick-adding time entries.

### Sprint 4: Reporting, Invoicing & Branding (Completed in v1.4.0)
* **PDF Invoice Improvements**: Enhance page breaks, layout fonts, notes sections, and formatting.
* **Branding**: Further polish logos, invoice styling, company branding, and custom colors.
* **Export Improvements**: Support exporting timesheets to PDF, Excel, and CSV (including contractor name, period, hours, and amount due).
* **Bulk Actions**: Support marking selected entries as billed/paid, generating batch invoices, and bulk exporting entries.

### Sprint 5: Invoices Registry, Budgets & Rounding (Completed in v1.5.0)
* **Invoice Registry & Payment Tracking**: Create an Invoices tab to manage unpaid, overdue, and paid invoices, and quickly re-download past PDF invoices.
* **Billable vs. Non-Billable Switch**: Add a billable toggle on stopwatch/logs to track non-billable hours at a $0 rate while keeping them in productivity stats.
* **Hour Rounding Rules**: Global or client-specific time-rounding configurations (e.g. round to nearest 6, 15, or 30 minutes).
* **Retainer & Budget Caps**: Track maximum hours or billing limits per client with warnings and dashboard progress gauges.
* **Sync Status Indicator**: Add a header status dot (Green for cloud, Yellow for local fallback) to alert the user of connection status.

---

## 🎯 Consolidated Product Review & Future Priorities

### Priority 3: Timer Experience
* **Enhanced Active Session Display**: While active, display Client, Category, Description, Elapsed Time, and live Earnings (e.g., `Client: Acme | 02:14:37 | $89.58 Earned`).
* **Earnings Meter**: Dynamic live billing calculation running in real-time.
* **Dynamic Browser Title**: Update the tab title to show active state (e.g., `Tempo - 02:14:37` or `Tempo - Acme Deployment - 02:14:37`).
* **Dedicated Popup Layout**: Simplify the popout timer window into a compact widget showing only controls, elapsed time, description, and live earnings.

### Priority 5: Client Enhancements
* **Client Statistics**: Show total hours, total revenue, unbilled revenue, and last activity per client.
* **Client Dashboard**: Add detailed views showing client-specific revenue, hours worked, invoices, recent entries, and outstanding balance.
* **Client Statuses**: Introduce `Active`, `Inactive`, and `Archived` filters for long-term project management.
* **Separate Invoice Contact**: Support mapping a separate Billing/Invoice contact address and email separate from the primary contact.

### Priority 6: Category Enhancements
* **Billable vs. Non-Billable**: Allow categorizing work as billable (e.g., Development) or non-billable (e.g., Admin, Training) for better reporting.
* **Category Analytics**: Show total hours logged, revenue generated, and usage count per work category.
* **Category Colors**: Assign customizable colors to categories, reused in charts, reports, and calendar feeds.

### Priority 7: Analytics Expansion
* **Revenue Trends**: Graph billing by month and week (e.g., Month-over-Month comparisons).
* **Hours Trends**: Track hours worked per week and month to monitor contractor workload.
* **Client Trends**: Analyze client revenue changes over time.
* **Productivity Metrics**: Add KPI summary cards (Top Client, Most Used Category, Average Hours/Day, Average Revenue/Week).
* **Clickable Analytics**: Enable interactive charts (e.g., clicking on a client's slice in a pie chart filters the Time Logs view).

### Future Roadmap Ideas (Backlog)
* **Client Portal**: Future portal allowing clients to view report sheets, download PDF invoices, and review logs directly.
* **Team Support**: Multi-contractor support with manager review and approval workflows.
* **Invoice Email Integration** (Deferred): Send PDF invoices directly to client emails from the app.
* **Gusto Invoice & Payments Sync** (Deferred): Link contractor invoices and payments directly with Gusto contractor payroll (moved to backlog as API key access may be restricted for hobby projects):
  * Connect Gusto company account via secure OAuth2 authorization.
  * Map Tempo Client profiles to Gusto `contractor_uuid` values.
  * Send invoices directly to Gusto as payment groups with preview estimates.
  * Receive real-time payment status updates (e.g. Funded/Cleared) via webhooks to auto-reconcile invoices in the registry.

### Priority 8: Power-User Productivity & Smart Logging (Target: v2.3.0)
* **Global Keyboard Shortcuts (Hotkeys)**: Control the active stopwatch (`Space`), open manual logger (`N`), focus search (`/`), and switch tabs (`1`-`5`) without using the mouse.
* **Natural Language Time Logging (NLP)**: Type single-sentence logs like `Acme 2.5h dev worked on oauth verification` to automatically populate time entry forms.
* **Time Log Auditing & Gap Detection**: Visual warning prompts showing gaps in logged billing hours during standard workdays to prevent missed revenue.
* **Live Rounding Preview**: Real-time display of both actual elapsed time and rounded billable duration on the running timer screen.
* **Estimated Tax Deadlines**: Calendar integrations and dashboard reminders for IRS quarterly estimated tax payment deadlines (April, June, September, January).

---

## 💡 Strategic Recommendation

The Tempo application already has substantial feature depth. **We must avoid major feature expansion for the time being.**

Instead, our focus is strictly locked onto stabilizing and refining the core tracking loop:
1. **Authentication & Session Security** (Sprint 1)
2. **Timer Reliability & Offline Protection** (Sprint 2)
3. **Mobile Quick Action Companion** (Sprint 3)
4. **Professional Invoice Polish & Data Export** (Sprint 4)

**Tempo's biggest risk is not a lack of features; it is the reliability of the existing time tracking workflow.** Independent contractors can tolerate missing charts or analytics, but they cannot tolerate:
* Lost timer sessions or lost work hours.
* Stale or incorrect invoice numbers/math.
* Broken session logins.

We will focus on making the existing time-tracking workflow **100% bulletproof** before expanding the platform further.
