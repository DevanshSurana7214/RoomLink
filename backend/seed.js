const bcrypt = require('bcryptjs');
const { getDb } = require('./db');
const { v4: uuidv4 } = require('uuid');

const db = getDb();

// Clear existing data
db.exec('DELETE FROM connections');
db.exec('DELETE FROM people');

const DEFAULT_PASSWORD = bcrypt.hashSync('password123', 10);

// Create people — 10 people in various rooms
const people = [
  { id: uuidv4(), name: 'Alice Chen',   roll_number: 'CS22001', room_no: 'A101' },
  { id: uuidv4(), name: 'Bob Martinez', roll_number: 'CS22002', room_no: 'A101' },
  { id: uuidv4(), name: 'Charlie Kim',  roll_number: 'CS22003', room_no: 'A205' },
  { id: uuidv4(), name: 'Diana Park',   roll_number: 'CS22004', room_no: 'A206' },
  { id: uuidv4(), name: 'Eve Johnson',  roll_number: 'CS22005', room_no: 'A220' },
  { id: uuidv4(), name: 'Frank Lee',    roll_number: 'CS22006', room_no: 'A310' },
  { id: uuidv4(), name: 'Grace Wang',   roll_number: 'CS22007', room_no: 'A310' },
  { id: uuidv4(), name: 'Henry Singh',  roll_number: 'CS22008', room_no: 'B105' },
  { id: uuidv4(), name: 'Ivy Thomas',   roll_number: 'CS22009', room_no: 'B201' },
  { id: uuidv4(), name: 'Jack Brown',   roll_number: 'CS22010', room_no: 'B202' },
];

const insertPerson = db.prepare('INSERT INTO people (id, name, roll_number, room_no, password_hash) VALUES (?, ?, ?, ?, ?)');
for (const p of people) {
  insertPerson.run(p.id, p.name, p.roll_number, p.room_no, DEFAULT_PASSWORD);
}

// Helper to normalize pair ordering
function normalizePair(id1, id2) {
  return id1 < id2 ? { a: id1, b: id2 } : { a: id2, b: id1 };
}

// Create connections with ASYMMETRIC consent to demonstrate the feature
const insertConn = db.prepare(`
  INSERT INTO connections (id, person_a_id, person_b_id, a_to_b_consent, b_to_a_consent, status, requested_by)
  VALUES (?, ?, ?, ?, ?, 'confirmed', ?)
`);

const makeConn = (person1, person2, aToB, bToA, requester) => {
  const p1 = people.find(p => p.name === person1);
  const p2 = people.find(p => p.name === person2);
  const { a, b } = normalizePair(p1.id, p2.id);

  let actualAToB, actualBToA, actualRequester;
  if (a === p1.id) {
    actualAToB = aToB ? 1 : 0;
    actualBToA = bToA ? 1 : 0;
    actualRequester = requester === 'p1' ? 'a' : 'b';
  } else {
    actualAToB = bToA ? 1 : 0;
    actualBToA = aToB ? 1 : 0;
    actualRequester = requester === 'p1' ? 'b' : 'a';
  }

  insertConn.run(uuidv4(), a, b, actualAToB, actualBToA, actualRequester);
};

// Connections and consents (same as before)
makeConn('Alice Chen', 'Bob Martinez', true, true, 'p1');
makeConn('Alice Chen', 'Charlie Kim', true, false, 'p1');
makeConn('Charlie Kim', 'Diana Park', true, true, 'p1');
makeConn('Diana Park', 'Eve Johnson', true, false, 'p1');
makeConn('Bob Martinez', 'Frank Lee', true, true, 'p2');
makeConn('Frank Lee', 'Grace Wang', true, true, 'p1');
makeConn('Charlie Kim', 'Henry Singh', true, true, 'p2');
makeConn('Henry Singh', 'Ivy Thomas', true, false, 'p1');
makeConn('Eve Johnson', 'Jack Brown', true, true, 'p1');
makeConn('Ivy Thomas', 'Jack Brown', true, false, 'p1');

console.log('Seed data inserted successfully!');
console.log('');
console.log('People (default password for all: password123):');
for (const p of people) {
  console.log(`  ${p.name} — ${p.roll_number} — Room ${p.room_no}`);
}

console.log('');
console.log('All connections and their actual consent directions:');
const allConns = db.prepare(`
  SELECT
    pa.name AS a_name, pa.room_no AS a_room,
    pb.name AS b_name, pb.room_no AS b_room,
    c.a_to_b_consent, c.b_to_a_consent, c.status
  FROM connections c
  JOIN people pa ON c.person_a_id = pa.id
  JOIN people pb ON c.person_b_id = pb.id
`).all();

for (const c of allConns) {
  const aArrow = c.a_to_b_consent ? '→ (consented)' : '-/->';
  const bArrow = c.b_to_a_consent ? '→ (consented)' : '-/->';
  console.log(`  ${c.a_name} (${c.a_room}) ${aArrow} ${c.b_name} (${c.b_room})`);
  console.log(`  ${c.b_name} (${c.b_room}) ${bArrow} ${c.a_name} (${c.a_room})`);
  console.log('');
}

console.log('Asymmetric consent examples (visible above):');
console.log('  Alice -> Charlie: Alice ALLOWS routing through her to reach Charlie/A205');
console.log('  Charlie -> Alice: Charlie does NOT allow routing through him to reach Alice/A101');
console.log('');
console.log('  Diana -> Eve: Diana ALLOWS routing through her to reach Eve/A220');
console.log('  Eve -> Diana: Eve does NOT allow routing through him to reach Diana/A206');
console.log('');
console.log('Try searching: Starting from Alice (A101), can you reach A206?');
console.log('  Path: Alice -> Charlie (Alice consents ✅) -> Diana (Charlie consents ✅) -> A206');
console.log('  Alice can also reach A220 via Charlie -> Diana -> Eve');
console.log('');
console.log('Try searching: Starting from Charlie (A205), can you reach A101?');
console.log('  Result: No path! (Charlie did not consent toward Alice)');
