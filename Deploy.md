# PFA Attendance — Hostinger Deployment Guide

---

## Step 1 — Create MySQL Database

1. Go to **hPanel → Databases → MySQL Databases**
2. Fill in:
   - **MySQL database name:** `attendance_db`
   - **MySQL username:** `pfa_db_user`
   - **Password:** choose a strong password and write it down
3. Click **Create**

> Hostinger will prefix your account ID automatically.
> Your actual values will look like:
> - Database: `u259446585_attendance_db`
> - Username: `u259446585_pfa_db_user`
> - Host: `localhost`

---

## Step 2 — Create 3 Subdomains

Go to **hPanel → Domains → Subdomains** and create:

| Subdomain | Purpose |
|-----------|---------|
| `api.yourdomain.com` | Backend API |
| `admin.yourdomain.com` | Admin panel |
| `superadmin.yourdomain.com` | Super admin panel |

Replace `yourdomain.com` with your actual domain.

---

## Step 3 — Deploy Backend (backend.zip)

### 3.1 Create Node.js Website
Go to **hPanel → Websites → Add Website**
- Domain: `api.yourdomain.com`
- Type: **Node.js**

### 3.2 Upload backend.zip
Upload `dist-zips/backend.zip` when prompted.

### 3.3 Deployment Settings

| Field | Value |
|-------|-------|
| **Framework preset** | `NestJS` |
| **Build command** | `npm run build` |
| **Output directory** | `./` |
| **Package manager** | `npm` |
| **Entry file / Start command** | `node dist/main.js` |

> Hostinger automatically runs `npm install` before the build command, so you only need `npm run build`.

### 3.4 Environment Variables

Click **Add** and enter each one:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | `mysql://u259446585_pfa_db_user:YOURPASSWORD@localhost:3306/u259446585_attendance_db` |
| `JWT_SECRET` | `pfa_secret_jwt_lahore_2024_xK9mQ` |
| `NODE_ENV` | `production` |

> Replace `YOURPASSWORD` with the password you set in Step 1.
> Replace the prefix `u259446585` with your actual Hostinger account prefix.
> **Special characters in passwords:** If your password contains `$`, you MUST percent-encode it as `%24` in the URL.
> Example: password `Arsham$123` → `Arsham%24123` in the DATABASE_URL.

### 3.5 Run Database Migrations
After the backend is deployed and running, go to **hPanel → Websites → api.yourdomain.com → Terminal** and run:

```bash
cd ~/htdocs/api.yourdomain.com
npx prisma db push
```

This creates all the database tables.

### 3.6 Seed PFA Staff (optional)
Still in the terminal:

```bash
node dist/database/seeds/pfa-staff.seed.js
node dist/database/seeds/pfa-geofences.seed.js
```

### 3.7 Verify
Visit `https://api.yourdomain.com` — you should see `{"message":"Hello World!"}` or similar JSON.

---

## Step 4 — Deploy Admin Panel (admin.zip)

### 4.1 Create Node.js Website
Go to **hPanel → Websites → Add Website**
- Domain: `admin.yourdomain.com`
- Type: **Node.js**

### 4.2 Upload admin.zip
Upload `dist-zips/admin.zip` when prompted.

### 4.3 Deployment Settings

| Field | Value |
|-------|-------|
| **Framework preset** | `Next.js` |
| **Build command** | `npm run build` |
| **Output directory** | `.next` |
| **Package manager** | `npm` |
| **Entry file / Start command** | `npm run start` |

### 4.4 Environment Variables

| Key | Value |
|-----|-------|
| `NEXTAUTH_URL` | `https://admin.yourdomain.com` |
| `NEXTAUTH_SECRET` | `pfa_admin_nextauth_secret_2024` |
| `AUTH_SECRET` | `pfa_admin_nextauth_secret_2024` |
| `BACKEND_URL` | `https://api.yourdomain.com` |
| `NEXT_PUBLIC_BACKEND_URL` | `https://api.yourdomain.com` |
| `NODE_ENV` | `production` |

### 4.5 Verify
Visit `https://admin.yourdomain.com` — the login page should load.
Login with: `admin@pfa.gov.pk` / `admin1234`

---

## Step 5 — Deploy Super Admin Panel (superadmin.zip)

### 5.1 Create Node.js Website
Go to **hPanel → Websites → Add Website**
- Domain: `superadmin.yourdomain.com`
- Type: **Node.js**

### 5.2 Upload superadmin.zip
Upload `dist-zips/superadmin.zip` when prompted.

### 5.3 Deployment Settings

| Field | Value |
|-------|-------|
| **Framework preset** | `Next.js` |
| **Build command** | `npm run build` |
| **Output directory** | `.next` |
| **Package manager** | `npm` |
| **Entry file / Start command** | `npm run start` |

### 5.4 Environment Variables

| Key | Value |
|-----|-------|
| `NEXTAUTH_URL` | `https://superadmin.yourdomain.com` |
| `NEXTAUTH_SECRET` | `pfa_superadmin_nextauth_secret_2024` |
| `BACKEND_URL` | `https://api.yourdomain.com` |
| `NEXT_PUBLIC_BACKEND_URL` | `https://api.yourdomain.com` |
| `NODE_ENV` | `production` |

### 5.5 Verify
Visit `https://superadmin.yourdomain.com` — the login page should load.
Login with: `super@pfa.gov.pk` / `super1234`

---

## Step 6 — Update Mobile APK for Production

Once the backend is live at `https://api.yourdomain.com`, update the Flutter app:

1. Open `apps/mobile/lib/services/api_service.dart`
2. Change line 23:
```dart
// Before
static String _baseUrl = 'http://172.20.10.4:3000';

// After
static String _baseUrl = 'https://api.yourdomain.com';
```
3. Rebuild the APK:
```bash
cd ~/Developer/PFA-attendance-app/apps/mobile
flutter build apk --release
```
4. The new APK in `build/app/outputs/flutter-apk/app-release.apk` works on any Android device worldwide.

---

## Quick Reference

### All Credentials

| Account | Email | Password |
|---------|-------|----------|
| Super Admin | `super@pfa.gov.pk` | `super1234` |
| Admin | `admin@pfa.gov.pk` | `admin1234` |
| All PFA Staff | see list below | `PFAStaff@2024!` |

### PFA Staff Logins

| Name | Email |
|------|-------|
| Dr. Muhammad Asim Ijaz Sidhu | `asim.sidhu@pfa.gov.pk` |
| Madeeha Sajjad | `madeeha.sajjad@pfa.gov.pk` |
| Hafiza Bushra Tariq | `hafiza.tariq@pfa.gov.pk` |
| Madiha Komal | `madiha.komal@pfa.gov.pk` |
| Akbar Sultan | `akbar.sultan@pfa.gov.pk` |
| Anam Harfi | `anam.harfi@pfa.gov.pk` |
| Nighat Latif | `nighat.latif@pfa.gov.pk` |
| Awais Akram | `awais.akram@pfa.gov.pk` |
| Asif Ali | `asif.ali@pfa.gov.pk` |
| Muhammad Husnain Muzafer | `husnain.muzafer@pfa.gov.pk` |
| Fahad Ghafoor | `fahad.ghafoor@pfa.gov.pk` |
| Ali Raza | `ali.raza@pfa.gov.pk` |
| Muhammad Awais | `awais.muhammad@pfa.gov.pk` |
| Sufyan Arif | `sufyan.arif@pfa.gov.pk` |
| Anbreena | `anbreena@pfa.gov.pk` |
| Mehran Rasheed | `mehran.rasheed@pfa.gov.pk` |

### URLs After Deployment

```
https://api.yourdomain.com          Backend API
https://admin.yourdomain.com        Admin Panel
https://superadmin.yourdomain.com   Super Admin Panel
```

---

## Troubleshooting

**Backend shows "Application Error"**
→ Check env variables — `DATABASE_URL` is the most common culprit.
→ Make sure you ran `npx prisma db push` after first deploy.

**Admin/Superadmin can't reach backend**
→ `NEXT_PUBLIC_BACKEND_URL` must be `https://api.yourdomain.com` (public HTTPS, not localhost).
→ Rebuild after changing this env var — it gets baked in at build time.

**Login fails on admin panel**
→ Backend must be deployed and running first before admin panel can authenticate.

**Hostinger build fails for admin/superadmin**
→ Try setting build command to `npm install --legacy-peer-deps && npm run build`

**Database connection refused**
→ On Hostinger shared hosting, the host is always `localhost` — never an IP address.
→ Double-check the `u259446585_` prefix on both database name and username.
→ If your password has `$`, URL-encode it: `$` → `%24` in the DATABASE_URL string.

**Backend crashes immediately / "Application Error" on startup**
→ Almost always a bad DATABASE_URL. Check all three things: correct prefix on db name and username, correct password (with `%24` if password contains `$`), host is `localhost`.
→ The app will also fail if `npx prisma db push` was never run — but that causes query errors, not startup crashes.
