# PFA-attendance-app

Geofence-based attendance tracking app with photo verification and leave management — built for iOS &amp; Android with a web admin panel.

## Repo layout

| App | Path | Stack | Local port |
| --- | --- | --- | --- |
| Backend API | `apps/backend` | NestJS + Prisma (MySQL) | 3000 |
| Admin panel | `apps/admin` | Next.js 16 + NextAuth | 3001 |
| Superadmin panel | `apps/superadmin` | Next.js 16 + NextAuth | 3002 |
| Mobile | `apps/mobile` | React Native | — |
| MySQL | `docker-compose-mysql.yml` | MySQL 8.0 | 3306 |

There is no root `package.json` and no workspace runner — each app is installed and
started independently, from its own directory, in its own terminal.

## Prerequisites

- Node.js 20+
- Docker (for the local MySQL instance)

## 1. Start the database

From the repo root:

```bash
docker compose -f docker-compose-mysql.yml up -d
```

This exposes MySQL 8.0 on port **3306** with database `attendance_db` and user
`attendance_dev` / `devpassword`, matching the default `DATABASE_URL` below.

## 2. Backend — port 3000

```bash
cd apps/backend
npm install
```

Create `apps/backend/.env`:

```env
DATABASE_URL="mysql://attendance_dev:devpassword@localhost:3306/attendance_db"
JWT_SECRET="<any-long-random-string>"
```

Apply the schema and generate the Prisma client:

```bash
npx prisma migrate dev
npx prisma generate
```

Optionally seed dropdowns, staff, and geofences:

```bash
npx ts-node prisma/seed.ts
npx ts-node src/database/seeds/pfa-staff.seed.ts
npx ts-node src/database/seeds/pfa-geofences.seed.ts
```

Run it:

```bash
npm run start:dev     # watch mode, http://localhost:3000
```

The port comes from `process.env.PORT` and falls back to 3000
([src/main.ts](apps/backend/src/main.ts#L16)). To move it:

```bash
PORT=4000 npm run start:dev
```

Other scripts: `npm run start` (no watch), `npm run build`, `npm run start:prod`
(runs the compiled `dist/main.js`).

## 3. Admin — port 3001

```bash
cd apps/admin
npm install
```

Create `apps/admin/.env.local`:

```env
AUTH_URL=http://localhost:3001
AUTH_SECRET=<any-long-random-string>
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=<same-as-AUTH_SECRET>
BACKEND_URL=http://localhost:3000
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
```

Run it:

```bash
npm run dev -- -p 3001    # http://localhost:3001
```

> **The `-- -p 3001` is required.** The `dev` script is a bare `next dev`, which
> defaults to port 3000 and will collide with the backend. The app's own
> `NEXTAUTH_URL` expects 3001, so starting it on any other port breaks the auth
> callback. Either always pass the flag, or change the script in
> [package.json](apps/admin/package.json#L6) to `"dev": "next dev -p 3001"`.

## 4. Superadmin — port 3002

```bash
cd apps/superadmin
npm install
```

Create `apps/superadmin/.env.local`:

```env
# Backend API
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3000

# NextAuth — change NEXTAUTH_SECRET before deploying to production
NEXTAUTH_URL=http://localhost:3002
NEXTAUTH_SECRET=<any-long-random-string>

# App config
NEXT_PUBLIC_APP_NAME=PFA Superadmin
```

Run it:

```bash
npm run dev    # http://localhost:3002
```

The port is already pinned in the `dev` script (`next dev -p 3002`), so no extra
flag is needed here.

## All three at once

Three terminals, from the repo root:

```bash
# terminal 1 — API on :3000
cd apps/backend && npm run start:dev

# terminal 2 — admin on :3001
cd apps/admin && npm run dev -- -p 3001

# terminal 3 — superadmin on :3002
cd apps/superadmin && npm run dev
```

## Notes on environment files

- The committed `.env` / `.env.local` values point `BACKEND_URL` and
  `NEXT_PUBLIC_BACKEND_URL` at the **deployed VPS IP**, not localhost. Both
  frontends will talk to production until you change them to
  `http://localhost:3000`.
- `NEXT_PUBLIC_*` variables are inlined into the browser bundle at build time —
  restart the dev server after changing them.
- Never commit real secrets; the values above are local-development placeholders.

## Deployment

See [Deploy.md](Deploy.md) for the KVM/VPS deployment guide and
[Deployment.md](Deployment.md) for the earlier notes.
