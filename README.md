# Vec-Doc 🏍️

> Your bike's digital companion - Vehicle Document & Maintenance Tracking Platform

Vec-Doc is a mobile-first application for tracking motorbike documents, maintenance schedules, and providing AI-powered assistance. Built with React Native (Expo) and Node.js.

## Features

### 📄 Document Tracking
- Store insurance, PUC, license, and service records
- Automatic expiry alerts (30, 7, 1 day before)
- Upload document images/PDFs
- Optional OCR for date extraction

### 🛢️ Oil Change Tracking
- Distance-based reminders (default 2500 km)
- Customizable intervals per bike
- Visual progress indicator
- Overdue alerts

### 📍 Distance Tracking
- GPS-based automatic tracking
- Battery-optimized background location
- Daily/monthly/lifetime statistics

### 🔔 Smart Notifications
- Background push notifications
- Quiet hours support
- User preference controls

### 🛒 Quick Shop (Coming Soon)
- Part compatibility matching
- Price comparison across sellers

### 🤖 AI Features (Coming Soon)
- Image-based part identification
- RAG-powered maintenance chatbot

---

## Project Structure

```
Vec-Doc/
├── backend/                 # Node.js REST API
│   ├── prisma/              # Database schema
│   ├── src/
│   │   ├── config/          # Environment config
│   │   ├── middleware/      # Auth, error handling
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Business logic
│   │   ├── jobs/            # Background workers
│   │   └── utils/           # Helpers
│   └── package.json
│
├── mobile/                  # React Native (Expo)
│   ├── src/
│   │   ├── api/             # Axios client
│   │   ├── navigation/      # React Navigation
│   │   ├── screens/         # UI screens
│   │   └── store/           # Zustand state
│   ├── App.tsx
│   └── package.json
│
└── README.md
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Expo CLI (`npm install -g expo-cli`)

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your database URL and secrets

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Start development server
npm run dev
```

Server runs at `http://localhost:3000`

### Mobile Setup

```bash
cd mobile

# Install dependencies
npm install

# Start Expo
npm start

# Scan QR with Expo Go app (Android/iOS)
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/refresh` | Refresh tokens |
| POST | `/api/v1/auth/logout` | Logout |

### Bikes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/bikes` | List user's bikes |
| POST | `/api/v1/bikes` | Add bike |
| GET | `/api/v1/bikes/:id` | Get bike details |
| PUT | `/api/v1/bikes/:id` | Update bike |
| DELETE | `/api/v1/bikes/:id` | Remove bike |

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/documents/expiring` | Get expiring docs |
| POST | `/api/v1/documents/bike/:bikeId` | Add document |
| GET | `/api/v1/documents/:id` | Get document |

### Maintenance
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/maintenance/upcoming` | Upcoming service |
| POST | `/api/v1/maintenance/bike/:bikeId` | Log maintenance |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Mobile | React Native (Expo) |
| State | Zustand |
| Navigation | React Navigation |
| Backend | Node.js + Express |
| Database | PostgreSQL + Prisma |
| Auth | JWT + Refresh Tokens |
| Notifications | Firebase Cloud Messaging |

---

## Environment Variables

```bash
# Backend (.env)
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
```

---

## License

MIT © Vec-Doc
