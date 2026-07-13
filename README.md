# 🔗 RoomLink

**Consent-based friend-of-friend path finder for hostel/dorm rooms.**

RoomLink lets you find a path through your dorm's social network to reach someone in another room — but only using connections where people have **explicitly consented** to be a bridge in that direction.

> Just because you're friends doesn't mean you're both okay bridging in both directions.

## How It Works

1. **Register** with your name, roll number, and room number
2. **Add connections** — people you know in the dorm
3. **Set consent** — for each connection, independently decide if you're willing to be a bridge toward that person's room
4. **Search** — enter a target room (or multiple, in preference order) and RoomLink runs BFS over the directed consent graph to find the shortest consented path

## Key Feature: Directional Consent

Unlike a mutual friendship graph, RoomLink uses a **directed "bridging consent" model**:

- Knowing someone does NOT automatically mean you're willing to be used as a stepping stone
- Each person independently controls whether they're willing to be routed through, and in which direction
- A confirmed connection just means both people acknowledge knowing each other — **consent is set separately per direction**

## Tech Stack

- **Frontend:** React + Tailwind CSS (SPA via Vite)
- **Backend:** Node.js + Express
- **Database:** SQLite (file-based, no external setup)
- **Auth:** Simple roll-number-based identity (no external auth provider)

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm

### Backend

```bash
cd backend
npm install
npm run seed    # Creates sample data with 10 people and asymmetric consent
npm run dev     # Starts API server on http://localhost:3001
```

### Frontend

```bash
cd frontend
npm install
npm run dev     # Starts dev server on http://localhost:5173
```

Then open **http://localhost:5173** in your browser.

## Seed Data

The seed script creates 10 people with connections and demonstrates **asymmetric consent**:

| Person | Room | Role |
|--------|------|------|
| Alice Chen | A101 | Consents to bridge toward Charlie |
| Bob Martinez | A101 | Alice's roommate |
| Charlie Kim | A205 | Does NOT consent to bridge toward Alice |
| Diana Park | A206 | Consents to bridge toward Eve |
| Eve Johnson | A220 | Does NOT consent to bridge toward Diana |
| Frank Lee | A310 | Roommate with Grace |
| Grace Wang | A310 | Roommate with Frank |
| Henry Singh | B105 | Connected to Charlie and Ivy |
| Ivy Thomas | B201 | Connected to Henry (no reverse consent) |
| Jack Brown | B202 | Connected to Eve and Ivy |

### Try These Searches

1. **Starting from Alice (A101), search for A206**
   - Path: Alice → Charlie (Alice consents ✅) → Diana (Charlie consents ✅) → A206

2. **Starting from Alice (A101), search for A220**
   - Path: Alice → Charlie → Diana (Diana consents toward Eve ✅) → A220

3. **Starting from Charlie (A205), search for A101**
   - Result: No path found! (Charlie didn't consent toward Alice)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/people` | Register a new person |
| GET | `/api/people/search?q=` | Search people by name/room/roll |
| GET | `/api/people/:id` | Get person by ID |
| GET | `/api/people/roll/:roll_number` | Get person by roll number |
| POST | `/api/connections` | Send connection request |
| PUT | `/api/connections/:id/confirm` | Confirm a connection |
| PUT | `/api/connections/:id/consent` | Set consent direction |
| GET | `/api/connections/person/:person_id` | Get all connections for a person |
| GET | `/api/connections/pending/:person_id` | Get pending requests |
| POST | `/api/search` | Find shortest consented path |

## Project Structure

```
/
├── backend/
│   ├── routes/
│   │   ├── people.js       # People CRUD & search
│   │   ├── connections.js  # Connection management & consent
│   │   └── search.js       # BFS pathfinding
│   ├── db.js               # SQLite setup & schema
│   ├── seed.js             # Seed data script
│   └── server.js           # Express entry point
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
│   │   ├── api.js          # API client
│   │   ├── App.jsx         # Root component with routing
│   │   ├── main.jsx        # Entry point
│   │   └── index.css       # Tailwind styles
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
└── README.md
```
