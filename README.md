# MediFlow - Smart Healthcare Management System

A comprehensive healthcare management platform with AI-powered features for hospitals, doctors, and patients.

## Features

### For Hospitals
- **Dashboard** - Real-time overview of appointments, queue status, and analytics
- **Appointment Management** - Create, reschedule, and cancel appointments
- **Doctor Management** - Manage doctor profiles, schedules, and availability
- **Patient Management** - Track patient records and history
- **Queue Management** - Real-time queue tracking with live updates
- **Google Calendar Integration** - Sync appointments to Google Calendar

### For Doctors
- **Doctor Dashboard** - View today's appointments and queue
- **Queue Control** - Start queue, call next patient, mark complete/no-show
- **Prescription Writing** - Digital prescription generation
- **Patient History** - Access patient medical history

### For Patients
- **AI Chatbot** - Symptom assessment and appointment booking
- **Appointment Booking** - Book appointments with preferred doctors
- **Queue Status** - Real-time queue position updates
- **Notifications** - SMS, email, and in-app notifications

### AI Features
- **Vapi AI Voice Calls** - Automated appointment confirmation calls
- **AI Triage** - Symptom assessment and urgency scoring
- **Smart Scheduling** - Predictive no-show detection
- **Pre-visit Summaries** - AI-generated patient summaries for doctors

## Tech Stack

### Frontend
- React 18 + Vite
- React Router v6
- Socket.io Client (real-time updates)
- Axios (API calls)

### Backend
- Node.js + Express
- MongoDB + Mongoose
- Socket.io (WebSockets)
- JWT Authentication

### Integrations
- **Vapi AI** - Voice AI for automated calls
- **Twilio** - SMS notifications
- **Google Calendar API** - Calendar sync
- **Cloudinary** - Image uploads
- **OpenAI** - AI chatbot and triage

## Project Structure

```
crafton/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── hooks/          # Custom hooks
│   │   └── layouts/        # Layout components
│   └── package.json
│
├── server/                 # Node.js backend
│   ├── config/             # Database & app config
│   ├── middleware/         # Auth & error middleware
│   ├── models/             # Mongoose models
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   └── package.json
│
└── ml-service/             # Python ML service
    └── ...
```

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/aryanpatel-ctrl/MediFlow.git
cd MediFlow
```

2. **Install server dependencies**
```bash
cd server
npm install
```

3. **Install client dependencies**
```bash
cd ../client
npm install
```

4. **Configure environment variables**
```bash
cd ../server
cp .env.example .env
# Edit .env with your credentials
```

5. **Start the development servers**

Terminal 1 - Backend:
```bash
cd server
npm run dev
```

Terminal 2 - Frontend:
```bash
cd client
npm run dev
```

## Environment Variables

Create a `.env` file in the server directory:

```env
# MongoDB
MONGODB_URI=your_mongodb_connection_string

# JWT
JWT_SECRET=your_jwt_secret

# Server
PORT=5002
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Vapi AI (Voice Calls)
VAPI_API_KEY=your_vapi_api_key
VAPI_PHONE_NUMBER_ID=your_phone_number_id

# Twilio (SMS)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE=your_twilio_phone

# Google Calendar
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# OpenAI
OPENAI_API_KEY=your_openai_key

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email
EMAIL_PASS=your_app_password
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Appointments
- `GET /api/appointments` - Get appointments
- `POST /api/appointments` - Create appointment
- `POST /api/appointments/manual` - Manual booking (hospital admin)
- `PUT /api/appointments/:id/check-in` - Check-in patient

### Doctors
- `GET /api/doctors` - Get doctors
- `GET /api/doctors/:id/queue` - Get doctor's queue
- `PUT /api/doctors/:id/queue/start` - Start queue
- `PUT /api/doctors/:id/queue/next` - Call next patient

### AI Calls
- `POST /api/ai-calls/webhook/vapi` - Vapi webhook
- `POST /api/ai-calls/appointments/:id/trigger` - Trigger reminder call

## Real-time Features

The application uses Socket.io for real-time updates:

- **Queue Updates** - Live queue position changes
- **New Appointments** - Instant notification when booked
- **Patient Check-in** - Real-time check-in alerts
- **Status Changes** - Live appointment status updates

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Contact

Aryan Patel - [@aryanpatel-ctrl](https://github.com/aryanpatel-ctrl)

Project Link: [https://github.com/aryanpatel-ctrl/MediFlow](https://github.com/aryanpatel-ctrl/MediFlow)
