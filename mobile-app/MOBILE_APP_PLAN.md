# Mobile App Build Plan

## Goal

Build a React Native app in `mobile-app/` that reuses the existing backend and follows the same visual language as the web app, while adapting layouts properly for mobile screens.

## Design Rule

The target is not raw HTML-to-native conversion. The target is visual parity:

- same colors
- same card language
- same spacing rhythm
- same hierarchy
- same role flows

Where desktop layouts do not fit mobile, the screen should be reinterpreted natively without breaking the brand.

## Phase 1

Status: implemented baseline

- Expo mobile workspace
- API environment setup
- Async token persistence
- auth bootstrap from `/api/auth/me`
- shared theme tokens based on web CSS
- reusable mobile primitives
- simple role-aware root shell

## Phase 2

Patient MVP

1. Patient home
2. Doctor list
3. Doctor details
4. Book appointment
5. My appointments
6. Queue status
7. Profile

API mapping

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/hospitals/:id/doctors`
- `GET /api/doctors/:id`
- `GET /api/doctors/:id/slots`
- `POST /api/appointments`
- `GET /api/appointments`
- `GET /api/queue/:doctorId/patient-status`

## Phase 3

Doctor MVP

1. Doctor home
2. Today appointments
3. Queue dashboard
4. Call next
5. Complete current
6. Pause and resume queue
7. Profile

API mapping

- `GET /api/doctors/:id/appointments`
- `GET /api/doctors/:id/queue`
- `PUT /api/queue/:doctorId/call-next`
- `PUT /api/queue/:doctorId/complete-current`
- `PUT /api/queue/:doctorId/pause`
- `PUT /api/queue/:doctorId/resume`

## Phase 4

Hospital admin MVP

1. Admin dashboard
2. Doctors list
3. Appointments list
4. Notifications
5. Hospital settings

API mapping

- `GET /api/hospitals/:id/stats`
- `GET /api/hospitals/:id/doctors`
- `GET /api/appointments`
- `GET /api/notifications`
- `PUT /api/notifications/:id/read`
- `PUT /api/hospitals/:id`

## Shared Screen Workflow

For each screen:

1. inspect matching web screen
2. extract API usage and business rules
3. build static mobile layout
4. apply shared mobile theme
5. connect API
6. add loading and empty states
7. verify role permissions
8. test on Android and iOS

## Folder Direction

Recommended next structure:

- `src/features/auth`
- `src/features/patient`
- `src/features/doctor`
- `src/features/admin`
- `src/components`
- `src/navigation`
- `src/services`
- `src/theme`

## Immediate Next Build Order

1. patient home screen
2. doctor list screen
3. book appointment screen
4. my appointments screen
5. queue status screen

## Constraint

Pixel-perfect parity is achievable at the design-system level, but not through direct web CSS reuse. Every mobile screen still needs native layout work.
