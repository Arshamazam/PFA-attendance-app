# PFA Attendance — Hostinger Deployment Guide

## Do the three apps get separate websites?

**Yes — three subdomains, each a separate Node.js website in hPanel.**

| App | Subdomain | Hostinger website |
|-----|-----------|-------------------|
| NestJS Backend | `api.yourdomain.com` | Website 1 |
| Admin Panel | `admin.yourdomain.com` | Website 2 |
| Super Admin | `superadmin.yourdomain.com` | Website 3 |
| Flutter Mobile | APK/IPA file — no server | — |

No VPS needed. **Hostinger Business or Cloud Startup plan** supports multiple
Node.js websites through hPanel. Each one is its own deployment.

---

## Part 1 — One-Time Server Setup

### 1.1 Buy a hosting plan

Hostinger **Business Shared** or **Cloud Startup** — either supports multiple
Node.js websites and includes a MySQL database.

### 1.2 Create a MySQL database

In hPanel → **Databases → MySQL Databases**:

- Database name: `attendance_db`
- Username: `attendance_prod`
- Password: pick a strong one, write it down

Note the **database host** shown on that page (usually something like
`localhost` or a specific hostname like `mysql.yourdomain.com`).

### 1.3 Add three subdomains

In hPanel → **Domains → Subdomains**, create:

- `api.yourdomain.com`
- `admin.yourdomain.com`
- `superadmin.yourdomain.com`

Each one will get its own document root folder on the server.

---

## Part 2 — Deploy Website 1: Backend API

### 2.1 Create the Node.js website

In hPanel → **Websites → Add Website**:

- Domain: `api.yourdomain.com`
- Type: **Node.js**
- Node.js version: **20.x**

Hostinger will create the website and show you an **SSH / FTP** credentials panel.

### 2.2 Upload the backend code

On your Mac, build first:

```bash
cd ~/Developer/PFA-attendance-app/apps/backend
npm install
npx prisma generate
npm run build
```

This produces a `dist/` folder. Upload these to the website's root on Hostinger:

```
dist/           ← compiled NestJS output
prisma/         ← schema needed for db push
node_modules/   ← or run npm install on server (see below)
package.json
.env
```

**Easiest upload method — Git:**

```bash
# On the VPS/SSH terminal Hostinger gives you
cd ~/domains/api.yourdomain.com/public_html
git clone https://github.com/Arshamazam/PFA-attendance-app.git .
cd apps/backend
npm install
npx prisma generate
npx prisma db push
npm run build
```

### 2.3 Set environment variables

In hPanel → your API website → **Node.js** tab → **Environment Variables**, add:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | `mysql://attendance_prod:PASSWORD@localhost:3306/attendance_db` |
| `JWT_SECRET` | a random 64-character string (generate with `openssl rand -base64 64`) |
| `NODE_ENV` | `production` |

### 2.4 Set the startup file

In hPanel → your API website → **Node.js** tab:

- **Application root**: `/home/youraccount/domains/api.yourdomain.com/public_html/apps/backend`
- **Application startup file**: `dist/main.js`
- **Node.js version**: 20.x

Click **Save & Restart**.

### 2.5 Run DB migrations via SSH

```bash
# In Hostinger SSH terminal
cd ~/domains/api.yourdomain.com/public_html/apps/backend
npx prisma db push
```

This creates all the tables. You only need to do this once (or after schema changes).

### 2.6 Verify

```bash
curl https://api.yourdomain.com/auth/login \
  -X POST -H "Content-Type: application/json" \
  -d '{"email":"admin@pfa.gov.pk","password":"admin1234"}'
```

Expected: a JSON response with a `token` field.

---

## Part 3 — Deploy Website 2: Admin Panel

### 3.1 Create the Node.js website

In hPanel → **Websites → Add Website**:

- Domain: `admin.yourdomain.com`
- Type: **Node.js**
- Node.js version: **20.x**

### 3.2 Upload and build

```bash
# In Hostinger SSH terminal
cd ~/domains/admin.yourdomain.com/public_html
git clone https://github.com/Arshamazam/PFA-attendance-app.git .
cd apps/admin
npm install
npm run build
```

### 3.3 Set environment variables

In hPanel → admin website → **Node.js** → **Environment Variables**:

| Key | Value |
|-----|-------|
| `NEXTAUTH_URL` | `https://admin.yourdomain.com` |
| `NEXTAUTH_SECRET` | another random 64-char string |
| `AUTH_URL` | `https://admin.yourdomain.com` |
| `AUTH_SECRET` | same as NEXTAUTH_SECRET |
| `BACKEND_URL` | `https://api.yourdomain.com` |
| `NEXT_PUBLIC_BACKEND_URL` | `https://api.yourdomain.com` |
| `NODE_ENV` | `production` |

### 3.4 Set the startup file

In hPanel → admin website → **Node.js** tab:

- **Application root**: `/home/youraccount/domains/admin.yourdomain.com/public_html/apps/admin`
- **Application startup file**: `node_modules/.bin/next`
- **Application startup command**: `next start` (or leave blank, `npm start` works too)

> If hPanel only accepts a single `.js` file as startup, create a `server.js` in
> `apps/admin/`:
>
> ```js
> const { createServer } = require('http');
> const { parse } = require('url');
> const next = require('next');
> const app = next({ dev: false });
> const handle = app.getRequestHandler();
> app.prepare().then(() => {
>   createServer((req, res) => {
>     handle(req, res, parse(req.url, true));
>   }).listen(process.env.PORT || 3001);
> });
> ```
>
> Then set startup file to `server.js`.

### 3.5 Verify

Open `https://admin.yourdomain.com` in a browser — the login page should load.

---

## Part 4 — Deploy Website 3: Super Admin Panel

### 4.1 Create the Node.js website

In hPanel → **Websites → Add Website**:

- Domain: `superadmin.yourdomain.com`
- Type: **Node.js**
- Node.js version: **20.x**

### 4.2 Upload and build

```bash
# In Hostinger SSH terminal
cd ~/domains/superadmin.yourdomain.com/public_html
git clone https://github.com/Arshamazam/PFA-attendance-app.git .
cd apps/superadmin
npm install
npm run build
```

### 4.3 Set environment variables

| Key | Value |
|-----|-------|
| `NEXTAUTH_URL` | `https://superadmin.yourdomain.com` |
| `NEXTAUTH_SECRET` | another random 64-char string |
| `BACKEND_URL` | `https://api.yourdomain.com` |
| `NEXT_PUBLIC_BACKEND_URL` | `https://api.yourdomain.com` |
| `NEXT_PUBLIC_APP_NAME` | `PFA Super Admin Portal` |
| `NODE_ENV` | `production` |

### 4.4 Set the startup file

Same as admin panel — either `node_modules/.bin/next` with command `next start`,
or create a `server.js` with the same template as above.

### 4.5 Verify

Open `https://superadmin.yourdomain.com` — login with `super@pfa.gov.pk / super1234`.

---

## Part 5 — Seed the Production Database

After all three websites are up and the backend is running, SSH in and seed:

```bash
cd ~/domains/api.yourdomain.com/public_html/apps/backend

# Seed PFA staff (16 employees)
npx ts-node --transpile-only src/database/seeds/pfa-staff.seed.ts

# Seed geofence zones (7 Lahore offices)
npx ts-node --transpile-only src/database/seeds/pfa-geofences.seed.ts
```

---

## Part 6 — Update Mobile App for Production

Wherever the API base URL is defined in the Flutter code, change it to the
production backend:

```dart
// Before (local dev)
const String baseUrl = 'http://localhost:3000';

// After (production)
const String baseUrl = 'https://api.yourdomain.com';
```

Rebuild:

```bash
flutter build apk --release     # Android → share the APK with staff
flutter build ipa               # iOS (requires Mac + Xcode + Apple account)
```

---

## Redeployment After Code Changes

When you update code and push to GitHub, redeploy via SSH:

```bash
# Backend
cd ~/domains/api.yourdomain.com/public_html
git pull origin main
cd apps/backend && npm run build
# Then click "Restart" in hPanel Node.js tab for this website

# Admin panel
cd ~/domains/admin.yourdomain.com/public_html
git pull origin main
cd apps/admin && npm run build
# Restart in hPanel

# Super admin
cd ~/domains/superadmin.yourdomain.com/public_html
git pull origin main
cd apps/superadmin && npm run build
# Restart in hPanel
```

---

## SSL / HTTPS

Hostinger includes **free Let's Encrypt SSL** for all websites — it's enabled by
default for every subdomain you create. No manual steps needed.

---

## Quick Reference

```
https://api.yourdomain.com           Backend API (NestJS)
https://admin.yourdomain.com         Admin panel
https://superadmin.yourdomain.com    Super admin panel

Credentials:
  super@pfa.gov.pk     / super1234
  admin@pfa.gov.pk     / admin1234
  employee@pfa.gov.pk  / pfa12345
  PFA staff            / PFAStaff@2024!

Database (via hPanel):
  Name: attendance_db
  User: attendance_prod
```

---

## Troubleshooting

**App shows "Application Error" after deploy**
→ Check hPanel → Node.js tab → Error logs. Usually a missing env variable or
the build wasn't run before restart.

**`prisma db push` fails**
→ Confirm `DATABASE_URL` in the environment variables exactly matches your
Hostinger MySQL credentials. The host is often `localhost` on shared hosting.

**Admin panel can't reach backend**
→ `NEXT_PUBLIC_BACKEND_URL` must be `https://api.yourdomain.com` (public HTTPS
URL), not `localhost`. Rebuild the Next.js app after changing this — it gets
baked into the client bundle at build time.

**hPanel only accepts a `.js` startup file**
→ Use the `server.js` wrapper shown in Part 3, Step 4. Place it in the
`apps/admin/` or `apps/superadmin/` folder before building.
