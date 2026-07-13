# 🔗 RoomLink

**Consent-based friend-of-friend path finder for hostel/dorm rooms.**

RoomLink lets you find a path through your dorm's social network to reach someone in another room — but only using connections where people have **explicitly consented** to be a bridge in that direction.

> Just because you're friends doesn't mean you're both okay bridging in both directions.

## How It Works

1. **Register** with your name, roll number, room number, and password
2. **Sign in** with your roll number and password to get a JWT token
3. **Add connections** — people you know in the dorm
4. **Set consent** — for each connection, independently decide if you're willing to be a bridge toward that person's room
5. **Search** — enter a target room (or multiple, in preference order) and RoomLink runs BFS over the directed consent graph to find the shortest consented path

## Key Feature: Directional Consent

Unlike a mutual friendship graph, RoomLink uses a **directed "bridging consent" model**:

- Knowing someone does NOT automatically mean you're willing to be used as a stepping stone
- Each person independently controls whether they're willing to be routed through, and in which direction
- A confirmed connection just means both people acknowledge knowing each other — **consent is set separately per direction**

## Tech Stack

- **Frontend:** React + Tailwind CSS (SPA via Vite)
- **Backend:** Node.js + Express
- **Database:** SQLite (file-based, no external setup)
- **Auth:** JWT-based authentication with bcrypt password hashing

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm

### Backend

```bash
cd backend
cp ../.env.example .env    # Copy and edit with your secret
npm install
npm run seed                # Creates sample data with 10 people and asymmetric consent
npm run dev                 # Starts API server on http://localhost:3001
```

> **Important:** Edit `.env` and set a strong `JWT_SECRET` before running in any shared environment.
> Generate one with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### Frontend

```bash
cd frontend
npm install
npm run dev     # Starts dev server on http://localhost:5173
```

Then open **http://localhost:5173** in your browser.

### Seed Data

The seed script creates 10 people with default password `password123` for all users.

| Person | Room | Roll Number | Password |
|--------|------|-------------|----------|
| Alice Chen | A101 | CS22001 | password123 |
| Bob Martinez | A101 | CS22002 | password123 |
| Charlie Kim | A205 | CS22003 | password123 |
| Diana Park | A206 | CS22004 | password123 |
| Eve Johnson | A220 | CS22005 | password123 |
| Frank Lee | A310 | CS22006 | password123 |
| Grace Wang | A310 | CS22007 | password123 |
| Henry Singh | B105 | CS22008 | password123 |
| Ivy Thomas | B201 | CS22009 | password123 |
| Jack Brown | B202 | CS22010 | password123 |

### Authentication

All API endpoints (except registration at `POST /api/people` and health check) require a JWT token.
The token must be sent as an `Authorization: Bearer <token>` header on every request.

#### How to Register

```bash
curl -X POST http://localhost:3001/api/people \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","roll_number":"TEST001","room_no":"A999","password":"mypassword"}'
```

Response includes a JWT token and person object:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "person": {
    "id": "uuid-here",
    "name": "Test User",
    "roll_number": "TEST001",
    "room_no": "A999"
  }
}
```

#### How to Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"roll_number":"CS22001","password":"password123"}'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "person": {
    "id": "uuid-here",
    "name": "Alice Chen",
    "roll_number": "CS22001",
    "room_no": "A101"
  }
}
```

#### Using the Token

Once you have a token, include it in all subsequent API calls:

```bash
curl http://localhost:3001/api/connections/person \
  -H "Authorization: Bearer <your-token>"
```

### Try These Searches

1. **Starting from Alice (A101), search for A206**
   - Path: Alice → Charlie (Alice consents ✅) → Diana (Charlie consents ✅) → A206

2. **Starting from Alice (A101), search for A220**
   - Path: Alice → Charlie → Diana (Diana consents toward Eve ✅) → A220

3. **Starting from Charlie (A205), search for A101**
   - Result: No path found! (Charlie didn't consent toward Alice)

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/people` | No | Register a new person (returns token + person) |
| GET | `/api/people/me` | Yes | Get your own full profile (includes room_no) |
| GET | `/api/people/search?q=` | Yes | Search people by name/roll (no room_no in results) |
| GET | `/api/people/:id` | Yes | Get person by ID (public info only) |
| POST | `/api/auth/login` | No | Login with roll_number + password (rate-limited) |
| POST | `/api/connections` | Yes | Send connection request (to_id only) |
| PUT | `/api/connections/:id/confirm` | Yes | Confirm a pending connection |
| PUT | `/api/connections/:id/consent` | Yes | Set consent direction |
| GET | `/api/connections/person` | Yes | Get your connections |
| GET | `/api/connections/pending` | Yes | Get pending requests |
| POST | `/api/search` | Yes | Find shortest consented path |

## Project Structure

```
/
├── .env.example          # Environment variable template
├── .gitignore
├── backend/
│   ├── middleware/
│   │   └── auth.js       # JWT verification middleware
│   ├── routes/
│   │   ├── auth.js        # Login endpoint with rate limiting
│   │   ├── people.js      # People CRUD & search
│   │   ├── connections.js # Connection management & consent
│   │   └── search.js      # BFS pathfinding
│   ├── db.js              # SQLite setup & schema
│   ├── seed.js            # Seed data script
│   └── server.js          # Express entry point
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Landing.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── AddConnection.jsx
│   │   │   ├── MyConnections.jsx
│   │   │   ├── Search.jsx
│   │   │   └── PathDisplay.jsx
│   │   ├── api.js          # API client with JWT handling
│   │   ├── App.jsx         # Root component with routing
│   │   ├── main.jsx        # Entry point
│   │   └── index.css       # Tailwind styles
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
└── README.md
```
