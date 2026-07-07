# PFA Attendance — VPS Deployment Guide

**Server IP:** `187.127.125.215`

| App | URL | Purpose |
|-----|-----|---------|
| Backend API | `http://187.127.125.215:3000` | REST API for mobile app and dashboards |
| Admin Panel | `http://187.127.125.215:3001` | Admin dashboard |
| Super Admin | `http://187.127.125.215:3002` | Super admin dashboard |

---

## Login Credentials

### Admin Panel — `http://187.127.125.215:3001`
| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@pfa.gov.pk` | `admin1234` |

### Super Admin Panel — `http://187.127.125.215:3002`
| Role | Email | Password |
|------|-------|----------|
| Super Admin | `super@pfa.gov.pk` | `super1234` |

### Mobile App (PFA Staff)
All staff use password: **`PFAStaff@2024!`**

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

---

## Deployment Steps

### Step 1 — Install Node.js and PM2 (SSH)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2
node --version && npm --version
```

Create app directories:
```bash
mkdir -p /opt/pfa/backend /opt/pfa/admin /opt/pfa/superadmin
```

### Step 2 — Open Firewall Ports (HestiaCP)

Go to **HestiaCP → Firewall → Add Rule** and add three rules:

| Port | Protocol | Action |
|------|----------|--------|
| 3000 | TCP | ACCEPT |
| 3001 | TCP | ACCEPT |
| 3002 | TCP | ACCEPT |

IP Address field: `0.0.0.0/0` (allow from anywhere)

### Step 3 — Create MySQL Database (HestiaCP)

Go to **HestiaCP → DB → Add Database**:
- Database name: `attendance`
- Username: `pfa_user`
- Password: choose a strong password — write it down

> HestiaCP auto-prefixes with your panel username.
> Example result: database `user_attendance`, user `user_pfa_user`.
> Note these exact names — you need them for the DATABASE_URL.

### Step 4 — Upload Zips (run on your Mac)

Open a **new terminal on your Mac**:

```bash
cd ~/Developer/PFA-attendance-app
scp dist-zips/backend.zip root@187.127.125.215:/opt/pfa/
scp dist-zips/admin.zip root@187.127.125.215:/opt/pfa/
scp dist-zips/superadmin.zip root@187.127.125.215:/opt/pfa/
```

### Step 5 — Extract and Build Backend (SSH)

```bash
cd /opt/pfa/backend
unzip /opt/pfa/backend.zip
npm install
npm run build
```

### Step 6 — Fix Auth Config Before Building Panels

> **Critical:** Auth.js rejects IP-based hosts by default. Add `trustHost: true`
> directly to auth.ts files before building — env vars alone are not reliable.

```bash
node -e "
const fs = require('fs');
['admin','superadmin'].forEach(app => {
  const path = '/opt/pfa/' + app + '/auth.ts';
  let c = fs.readFileSync(path,'utf8');
  c = c.replace('= NextAuth({', '= NextAuth({\n  trustHost: true,');
  fs.writeFileSync(path, c);
  console.log('Fixed', path);
});
"
```

### Step 7 — Extract and Build Admin Panel

```bash
cd /opt/pfa/admin
unzip /opt/pfa/admin.zip
export NEXT_PUBLIC_BACKEND_URL=http://187.127.125.215:3000
npm install
npm run build
```

### Step 8 — Extract and Build Super Admin Panel

```bash
cd /opt/pfa/superadmin
unzip /opt/pfa/superadmin.zip
export NEXT_PUBLIC_BACKEND_URL=http://187.127.125.215:3000
npm install
npm run build
```

### Step 9 — Create PM2 Ecosystem File

```bash
cat > /opt/pfa/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'backend',
      script: 'dist/main.js',
      cwd: '/opt/pfa/backend',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        DATABASE_URL: 'mysql://DB_USER:DB_PASSWORD@localhost:3306/DB_NAME',
        JWT_SECRET: 'pfa_secret_jwt_lahore_2024_xK9mQ'
      }
    },
    {
      name: 'admin',
      script: 'node_modules/.bin/next',
      args: 'start -p 3001',
      cwd: '/opt/pfa/admin',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        AUTH_TRUST_HOST: 'true',
        AUTH_SECRET: 'pfa_admin_nextauth_secret_2024',
        NEXTAUTH_URL: 'http://187.127.125.215:3001',
        BACKEND_URL: 'http://187.127.125.215:3000',
        NEXT_PUBLIC_BACKEND_URL: 'http://187.127.125.215:3000'
      }
    },
    {
      name: 'superadmin',
      script: 'node_modules/.bin/next',
      args: 'start -p 3002',
      cwd: '/opt/pfa/superadmin',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        AUTH_TRUST_HOST: 'true',
        AUTH_SECRET: 'pfa_superadmin_nextauth_secret_2024',
        NEXTAUTH_URL: 'http://187.127.125.215:3002',
        BACKEND_URL: 'http://187.127.125.215:3000',
        NEXT_PUBLIC_BACKEND_URL: 'http://187.127.125.215:3000'
      }
    }
  ]
}
EOF
```

Edit it to fill in your real database credentials:
```bash
nano /opt/pfa/ecosystem.config.js
```

Replace these three placeholders:
- `DB_USER` → full username (e.g. `user_pfa_user`)
- `DB_PASSWORD` → your password — **if it contains `@`, write it as `%40`**
- `DB_NAME` → full database name (e.g. `user_attendance`)

### Step 10 — Start All Apps

```bash
pm2 start /opt/pfa/ecosystem.config.js
pm2 save
pm2 startup
```

Run the command that `pm2 startup` outputs (looks like `sudo env PATH=...`).

### Step 11 — Set Up Database Tables

```bash
cd /opt/pfa/backend
export DATABASE_URL="mysql://DB_USER:DB_PASSWORD_URLENCODE@localhost:3306/DB_NAME"
npx prisma db push
```

### Step 12 — Seed All Data

```bash
# PFA staff (16 employees) and geofences
node dist/database/seeds/pfa-staff.seed.js
node dist/database/seeds/pfa-geofences.seed.js
```

Create admin and super_admin users (script must be inside backend dir):
```bash
cat > /opt/pfa/backend/seed-admins.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();
async function main() {
  const adminHash = await bcrypt.hash('admin1234', 10);
  const superHash = await bcrypt.hash('super1234', 10);
  await prisma.employee.upsert({
    where: { email: 'admin@pfa.gov.pk' },
    update: { password: adminHash, role: 'admin', name: 'Admin' },
    create: { email: 'admin@pfa.gov.pk', password: adminHash, name: 'Admin', role: 'admin' },
  });
  await prisma.employee.upsert({
    where: { email: 'super@pfa.gov.pk' },
    update: { password: superHash, role: 'super_admin', name: 'Super Admin' },
    create: { email: 'super@pfa.gov.pk', password: superHash, name: 'Super Admin', role: 'super_admin' },
  });
  console.log('Done: admin@pfa.gov.pk / admin1234');
  console.log('Done: super@pfa.gov.pk / super1234');
  await prisma.$disconnect();
}
main().catch(console.error);
EOF

DATABASE_URL="mysql://DB_USER:DB_PASSWORD_URLENCODE@localhost:3306/DB_NAME" node /opt/pfa/backend/seed-admins.js
```

> The seed-admins.js script MUST be run from inside `/opt/pfa/backend/` or placed
> there — it needs `@prisma/client` from the backend's `node_modules`.

### Step 13 — Update Flutter APK

On your Mac, edit [apps/mobile/lib/services/api_service.dart](apps/mobile/lib/services/api_service.dart) line 23:

```dart
static String _baseUrl = 'http://187.127.125.215:3000';
```

Rebuild:
```bash
cd ~/Developer/PFA-attendance-app/apps/mobile
flutter build apk --release
```

New APK: `build/app/outputs/flutter-apk/app-release.apk`

---

## Troubleshooting

### Check logs
```bash
pm2 logs backend --lines 20 --nostream
pm2 logs admin --lines 20 --nostream
pm2 logs superadmin --lines 20 --nostream
```

### Restart an app
```bash
pm2 restart backend
pm2 restart admin
pm2 restart superadmin
pm2 restart all --update-env   # use this after editing ecosystem.config.js
```

---

### Error: `UntrustedHost` on admin/superadmin

Auth.js rejects requests from IP-based hosts in production. Fix by adding
`trustHost: true` to the auth.ts config (not just an env var — must be baked
into the build):

```bash
node -e "
const fs = require('fs');
['admin','superadmin'].forEach(app => {
  const path = '/opt/pfa/' + app + '/auth.ts';
  let c = fs.readFileSync(path,'utf8');
  c = c.replace('= NextAuth({', '= NextAuth({\n  trustHost: true,');
  fs.writeFileSync(path, c);
  console.log('Fixed', path);
});
"
cd /opt/pfa/admin && export NEXT_PUBLIC_BACKEND_URL=http://187.127.125.215:3000 && npm run build
cd /opt/pfa/superadmin && export NEXT_PUBLIC_BACKEND_URL=http://187.127.125.215:3000 && npm run build
pm2 restart all --update-env
```

---

### Error: Backend keeps restarting (201+ restarts)

The DATABASE_URL in ecosystem.config.js is wrong. Check:
- Correct prefix on username and database name (HestiaCP adds it)
- Special characters URL-encoded: `@` → `%40`, `$` → `%24`, `#` → `%23`
- Host must be `localhost` — never an IP

After fixing ecosystem.config.js:
```bash
pm2 restart backend --update-env
pm2 logs backend --lines 10 --nostream
```

---

### Error: `Cannot find module '@prisma/client'` when running seed script

The seed script must be placed inside `/opt/pfa/backend/` to access its
`node_modules`. Running `node /opt/pfa/seed-admins.js` from the backend dir
does not work — the file itself must be in the backend folder.

```bash
# Wrong — script is outside backend dir
cd /opt/pfa/backend && node /opt/pfa/seed-admins.js

# Correct — script is inside backend dir
cd /opt/pfa/backend && node seed-admins.js
```

---

### Error: `Authentication failed` / `P1000` in backend logs

MySQL password authentication failed. Double-check:
1. The password in ecosystem.config.js matches what HestiaCP shows
2. Special characters are URL-encoded in the DATABASE_URL string
3. The database user has access to the correct database

Test the connection manually:
```bash
mysql -u DB_USER -p DB_NAME
# enter password when prompted
```

---

### Error: `Invalid credentials` on admin/superadmin login

The admin or super_admin user doesn't exist in the database yet. Run:
```bash
DATABASE_URL="mysql://DB_USER:DB_PASSWORD_URLENCODE@localhost:3306/DB_NAME" node /opt/pfa/backend/seed-admins.js
```

---

### Error: `500 Internal Server Error` on `/api/auth/session`

Auth.js secret is missing. Make sure `AUTH_SECRET` (not `NEXTAUTH_SECRET`) is
set in ecosystem.config.js for both admin and superadmin, then restart:
```bash
pm2 restart all --update-env
```

---

### Port not reachable from browser

Confirm firewall rules exist in HestiaCP for ports 3000, 3001, 3002 with
IP `0.0.0.0/0`. Then check `pm2 status` — app must be `online`, not `errored`.

---

### Admin/superadmin can't reach backend after URL change

`NEXT_PUBLIC_BACKEND_URL` is baked into the Next.js build. If you change the
server IP or port, you must rebuild:
```bash
cd /opt/pfa/admin
export NEXT_PUBLIC_BACKEND_URL=http://NEW_IP:3000
npm run build
pm2 restart admin
```
