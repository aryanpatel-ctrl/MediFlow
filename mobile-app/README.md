# MediFlow Mobile

This folder is a separate React Native starter for iOS and Android using Expo. It is intentionally scoped as an MVP foundation, not a full port of the current web app.

## What is already reusable from the current codebase

- The existing backend in `server/` and its `/api` endpoints.
- Business flows such as login, appointments, doctors, queues, notifications, and chat.
- Existing user roles: patient, doctor, hospital admin, and super admin.

## What is not directly reusable

- Web UI in `client/` built with React DOM, Vite, browser routing, and desktop layouts.
- Browser storage patterns based on `localStorage`.
- Desktop admin tables and wide dashboard screens.

## Realistic estimate

- 1 hour: bootstrap the mobile workspace, connect auth, define navigation and API layer.
- 1 day: login, role-based landing screens, appointment list, basic profile session handling.
- 3 to 5 days: patient MVP with login, doctor list, book appointment, my appointments, queue status.
- 5 to 8 days: doctor MVP with dashboard, today queue, next patient, pause and resume queue.
- 8 to 12 days: hospital admin mobile MVP with compact dashboard, doctors, appointments, notifications.
- 2 to 3 weeks: fuller parity with the current web app across all roles.

## Recommended delivery approach

Do not try to port every web screen first. Build the mobile app role by role.

1. Phase 1
   Patient mobile MVP.
   Login, doctors, booking, my appointments, queue status.
2. Phase 2
   Doctor mobile tools.
   Today schedule, queue controls, patient details, notes.
3. Phase 3
   Hospital admin mobile tools.
   Appointments, doctor status, notifications, lightweight analytics.
4. Phase 4
   Advanced modules.
   Chat, prescriptions, inventory, super admin analytics.

## Immediate next steps

1. Install dependencies in this folder with `npm install`.
2. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL`.
3. Run `npm run start`.
4. Add navigation and role-based home screens.
5. Move shared backend calls into feature modules for auth, appointments, doctors, and queue.

## Current files

- `App.tsx`
- `src/config/env.ts`
- `src/lib/api.ts`
- `src/lib/storage.ts`
- `src/screens/LoginScreen.tsx`

## Important constraint

The current web client is not something that can be "converted" to React Native in one hour. The backend can be reused immediately, but the mobile UI must be rebuilt screen by screen for native layouts and navigation.
