# Monk Media CRM

A premium, full-stack CRM web application designed specifically for **Monk Media** (a marketing and production agency). Built with Next.js 14, plain JavaScript/React (no TypeScript), Tailwind CSS, and Firebase (Authentication, Firestore, Storage, and Admin SDK).

---

## 🛠️ Stack & Architecture

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS (adhering to a pure white background `#FFFFFF` and sky-blue text design system)
- **Database & Storage**: Firebase Firestore + Storage
- **Authentication**: Firebase Authentication + Custom React Auth Context
- **Admin Operations**: Firebase Admin SDK (used in server-side Next.js API routes)

---

## 🔑 Environment Variables Configuration

To run this application, create a `.env.local` file in the root directory. Add the following environment configurations:

```env
# Firebase Admin SDK Credentials (choose one method)

# Method A: Parse from single JSON string (recommended)
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"mediacrm-9b0a0",...}'

# Method B: Individual credentials configuration
FIREBASE_PROJECT_ID="mediacrm-9b0a0"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@mediacrm-9b0a0.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC..."

# Vercel Cron Secret (For securing api/cron routes)
CRON_SECRET="your_vercel_cron_secret"
```

---

## 🚀 Bootstrapping the First Admin Account

Since creating team members requires an authenticated administrator session, the very first Admin account must be provisioned. You can choose one of the following two paths:

### Path A: Automatic Bootstrap (Recommended)
1. Start the development server (`npm run dev`).
2. Navigate to [http://localhost:3000/setup](http://localhost:3000/setup).
3. Enter your name, email, and admin password. Click **Initialize Admin**.
4. Once completed, the `/setup` route is **permanently locked** and will redirect requests, ensuring security.

### Path B: Manual Firebase Console Setup
1. Go to your [Firebase Console](https://console.firebase.google.com/).
2. Under **Authentication**, click **Add User** and create an account with email and password. Copy the generated UID.
3. Under **Firestore Database**, create a document in the `users` collection with the document ID matching the UID. Add the following fields:
   - `name`: "Admin Name"
   - `email`: "admin@monkmedia.com"
   - `role`: "admin"
   - `status`: "active"
   - `assignedClients`: `[]` (Array)
   - `assignedProjects`: `[]` (Array)

---

## 🚪 Secure Login Portals

This application utilizes separate secure login pages to ensure users enter through the correct authorization channels:

- **Admin Portal**: `/login/admin` (Redirects to `/dashboard` upon confirmation of `admin` role)
- **Account Manager Portal**: `/login/manager` (Redirects to `/dashboard` upon confirmation of `manager` role)
- **Team/Contractor Portal**: `/login/team` (Redirects to `/dashboard` upon confirmation of `team` role)

*Note: Logging in at the wrong portal (e.g., a Team member trying to access the admin portal) triggers a "Wrong portal for this account" validation error and terminates the session.*

---

## 📊 CRM Modules Summary

1. **Dashboard**: Unified KPI cards (active clients, projects, tasks due, weather widgets, ticking clock) and Recharts trend lines. Calculations automatically scope depending on user role permissions.
2. **Clients**: Registry catalog, searching, filters, and client profile detail tabs (Overview, Projects, Payments ledger, Content post agenda, Documents storage file manager, Account links, and a 17-milestone Onboarding checklist).
3. **Projects**: Multi-stage project Kanban board and project details list view.
4. **Tasks**: Workload organizer supporting List tables, Kanban status boards, and a month Calendar grid.
5. **Team Directory**: Personal listing of agency staff, workload capacity metrics, and document storage vaults.
6. **Leads**: Opportunity tracking Kanban pipeline featuring single-click lead-to-client conversion.
7. **Finance Ledger**: Invoice creation trackers, expense registers, payment processing sheets, and cash flow profit metrics. (Blocked completely for Team Members).
8. **Unified Calendar**: Visual agenda compiling shoots, meetings, and invoice due dates, alongside connection setup for Google Calendar sync.
9. **Global Search**: Command palette triggered via `Cmd+K` / `Ctrl+K` shortcuts.

---

## 🤖 Automations & Cron Jobs

Exposed endpoint API routes run tasks automatically on Vercel:

- `/api/cron/recurring-invoices`: Checks active client payment frequencies (weekly, bi-weekly, monthly) and issues recurring invoices when due.
- `/api/cron/check-overdue`: Scans database parameters, flagging unpaid invoices and incomplete tasks past their deadline as overdue, notifying assigned managers.
