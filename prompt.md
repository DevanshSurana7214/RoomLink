Build a full-stack web app called "RoomLink" — a consent-based friend-of-friend
path finder for hostel/dorm rooms.

CONCEPT:
Users register with their room number. Instead of a simple mutual friendship
graph, this app uses a DIRECTED "bridging consent" model: knowing someone does
NOT automatically mean you're willing to be used as a stepping stone to reach
your room/friends. Each person independently controls whether they're willing
to be routed through, and by whom.

Example this must support:

- Person X is friends with Person Y in room A220
- Person X is happy to be introduced/routed to reach A220 (X consents outbound)
- BUT Person Y is NOT willing to let people be routed further through them to
  reach Y's own room A121 (Y does not consent inbound for that direction)
- So a path can flow X -> Y but NOT assume Y -> X automatically. Consent is
  directional and must be explicitly granted per connection, not assumed from
  mutual friendship.

TECH STACK:

- Frontend: React + Tailwind CSS (single page app)
- Backend: Node.js + Express
- Database: SQLite (file-based, no external DB setup needed)
- No external auth provider — identity via name + unique roll number/email

DATA MODEL:
Table `people`: id, name, roll_number (unique), room_no

Table `connections`:
person_a_id, person_b_id,
a_to_b_consent (boolean), -- can requests be routed FROM a's side THROUGH b, i.e. b vouches to let a's contacts reach b's room
b_to_a_consent (boolean), -- the reverse direction
status (pending/confirmed)

IMPORTANT: a_to_b_consent and b_to_a_consent are set INDEPENDENTLY by each
person and can differ. A confirmed connection just means both people
acknowledge knowing each other — it does NOT mean both consent flags are
automatically true. Each person must explicitly opt in to being a bridge in
each direction. Default both consent flags to FALSE until explicitly granted.

GRAPH INTERPRETATION FOR PATHFINDING:
Build a DIRECTED graph, not an undirected one. An edge exists from node A to
node B only if the connection is confirmed AND the consent flag in that
specific direction is true. A confirmed mutual friendship might produce zero,
one, or two directional edges depending on each person's consent settings.

CORE FEATURES (MVP):

1. Registration form: name, roll number, room number

2. "Add connection" flow: search existing people by name/room/roll number,
   send a connection request. Other person must confirm. AFTER confirming,
   EACH person separately sets their own consent toggle: "Allow people to be
   routed through me to reach [other person]'s side" — this is asymmetric and
   must be a clearly separate UI control for each direction, not one shared
   toggle.

3. Search page: enter your name/roll number + ONE OR MORE target rooms
   (support multiple preferences, e.g. "A206 or A310, in order of preference")
   -> Backend runs BFS over the DIRECTED consent graph starting from the user
   -> At each node popped from the queue, check if that person's room matches
   ANY of the target rooms — if so, stop immediately (this guarantees
   shortest path) and return which target was hit
   -> If multiple target rooms are given, try them as a preference-ordered
   list: report the first target room reached via the shortest path;
   optionally also show if a lower-preference target would have been
   reachable via a shorter path, so the user can decide
   -> If no path exists to ANY target room, show "No consented path found"

4. Path display: show the chain as connected cards with ONE-DIRECTION arrows
   (Person Name — Room No) confirming the path only uses edges where consent
   was explicitly granted in that direction

5. Handle multiple people per room (room != person, roommates exist)

NICE-TO-HAVE (if time permits):

- Show top 2-3 shortest consented paths, not just one
- Let a person revoke a consent direction at any time (edge disappears from
  future searches immediately)
- Admin/debug view showing the full directed graph for testing
- Notification when someone requests to route through you, so you can
  consciously grant/deny that specific direction rather than a blanket default

ALGORITHM DETAIL:
Standard BFS, but edge traversal is direction-aware: from node N, only follow
edges where N is the source AND that specific outbound consent flag is true.
Track visited nodes to avoid cycles. Multiple target rooms = treat as a
target SET; success condition is "current person's room is in target set",
checked at pop-time not push-time (so shortest path guarantee holds).

UI/UX:

- Clean, minimal, mobile-friendly (students will use this on phones)
- Landing page explains the consent concept in 2-3 lines — this is the
  differentiating feature, make sure it's understandable ("just because
  you're friends doesn't mean you're both okay bridging in both directions")
- Consent toggles must be visually distinct per direction (e.g. two separate
  switches labeled clearly with names, not one ambiguous toggle)
- Loading state while path is computed
- Clear error states: person not found, no consented path exists, pending
  connection not yet confirmed, etc.

DELIVERABLE:
Single repo with /frontend and /backend folders, README with setup
instructions (npm install, npm run dev for both), and a seed script with
8-10 fake people/connections — include at least one asymmetric consent
example in the seed data so the directional logic is visible on first run.
