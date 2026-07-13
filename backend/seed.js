const { getDb } = require('./db');
const { v4: uuidv4 } = require('uuid');

const db = getDb();

// Clear existing data
db.exec('DELETE FROM connections');
db.exec('DELETE FROM people');

// Create people — 8 people in various rooms
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

const insertPerson = db.prepare('INSERT INTO people (id, name, roll_number, room_no) VALUES (?, ?, ?, ?)');
for (const p of people) {
  insertPerson.run(p.id, p.name, p.roll_number, p.room_no);
}

// Helper to normalize pair ordering
function normalizePair(id1, id2) {
  return id1 < id2 ? { a: id1, b: id2 } : { a: id2, b: id1 };
}

// Create connections with ASYMMETRIC consent to demonstrate the feature
// Normalize pairs: smaller UUID = person_a

const insertConn = db.prepare(`
  INSERT INTO connections (id, person_a_id, person_b_id, a_to_b_consent, b_to_a_consent, status, requested_by)
  VALUES (?, ?, ?, ?, ?, 'confirmed', ?)
`);

const makeConn = (person1, person2, aToB, bToA, requester) => {
  const p1 = people.find(p => p.name === person1);
  const p2 = people.find(p => p.name === person2);
  const { a, b } = normalizePair(p1.id, p2.id);

  // a_to_b_consent: A allows routing through them toward B
  // b_to_a_consent: B allows routing through them toward A
  // requester matches who requested (a or b)

  // Map the specified consent to the correct normalized positions
  let actualAToB, actualBToA, actualRequester;
  if (a === p1.id) {
    // p1 is person_a
    actualAToB = aToB ? 1 : 0;
    actualBToA = bToA ? 1 : 0;
    actualRequester = requester === 'p1' ? 'a' : 'b';
  } else {
    // p1 is person_b, p2 is person_a
    actualAToB = bToA ? 1 : 0;
    actualBToA = aToB ? 1 : 0;
    actualRequester = requester === 'p1' ? 'b' : 'a';
  }

  insertConn.run(uuidv4(), a, b, actualAToB, actualBToA, actualRequester);
};

// Connections and consents:
//
// Alice (A101) <-> Bob (A101) — roommates, mutual consent
//   Alice -> Bob: YES (Alice lets people route through her to reach Bob/A101)
//   Bob -> Alice: YES (Bob lets people route through him to reach Alice/A101)
//
makeConn('Alice Chen', 'Bob Martinez', true, true, 'p1');

// Alice (A101) <-> Charlie (A205) — Alice consents, Charlie does NOT
//   Alice -> Charlie: YES (Alice lets people route through her to reach Charlie/A205)
//   Charlie -> Alice: NO (Charlie does NOT want to be a bridge to Alice/A101)
//   This is the ASYMMETRIC example from the spec!
makeConn('Alice Chen', 'Charlie Kim', true, false, 'p1');

// Charlie (A205) <-> Diana (A206) — mutual consent
makeConn('Charlie Kim', 'Diana Park', true, true, 'p1');

// Diana (A206) <-> Eve (A220) — Diana consents, Eve does NOT
//   Diana -> Eve: YES
//   Eve -> Diana: NO
makeConn('Diana Park', 'Eve Johnson', true, false, 'p1');

// Bob (A101) <-> Frank (A310) — mutual consent
makeConn('Bob Martinez', 'Frank Lee', true, true, 'p2');

// Frank (A310) <-> Grace (A310) — roommates, mutual consent
makeConn('Frank Lee', 'Grace Wang', true, true, 'p1');

// Charlie (A205) <-> Henry (B105) — mutual consent
makeConn('Charlie Kim', 'Henry Singh', true, true, 'p2');

// Henry (B105) <-> Ivy (B201) — Henry consents, Ivy does NOT
makeConn('Henry Singh', 'Ivy Thomas', true, false, 'p1');

// Eve (A220) <-> Jack (B202) — mutual consent
makeConn('Eve Johnson', 'Jack Brown', true, true, 'p1');

// Ivy (B201) <-> Jack (B202) — mutual consent
makeConn('Ivy Thomas', 'Jack Brown', true, false, 'p1');

// Print actual consent values from the DB for verification
console.log('Seed data inserted successfully!');
console.log('');
console.log('People:');
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
