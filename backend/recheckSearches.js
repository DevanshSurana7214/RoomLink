const { getDb } = require('./db');
const { normalizeRoom } = require('./roomUtils');

/**
 * Re-run BFS for every 'watching' saved search.
 *
 * Called whenever the directed consent graph could have changed:
 *   - A consent flag is toggled (PUT /api/connections/:id/consent)
 *   - A swap is accepted (rooms change, updating that node's room_no)
 *
 * Simplest correct approach: just re-run all watching searches.
 * The graph is tiny (≤10 people in seed data), so this is cheap.
 */
function recheckAllSavedSearches() {
  const db = getDb();

  const watching = db.prepare(`
    SELECT s.id, s.person_id, s.target_rooms
    FROM saved_searches s
    WHERE s.status = 'watching'
  `).all();

  for (const search of watching) {
    const targetRooms = JSON.parse(search.target_rooms);
    const result = runBfs(search.person_id, targetRooms, db);

    if (result.found) {
      db.prepare(`
        UPDATE saved_searches
        SET status = 'found', found_at = ?, last_result = ?
        WHERE id = ? AND status = 'watching'
      `).run(new Date().toISOString(), JSON.stringify(result), search.id);
    }
  }
}

/**
 * Core BFS pathfinding over the directed consent graph.
 * Duplicates logic from routes/search.js so it can be called
 * outside of HTTP request context.
 */
function runBfs(personId, targetRooms, db) {
  const sourcePerson = db.prepare('SELECT id, name, room_no FROM people WHERE id = ?').get(personId);
  if (!sourcePerson) return { found: false };

  const visited = new Set([personId]);
  const queue = [{ id: personId, path: [] }];
  let foundPaths = [];

  const normalizedTargets = targetRooms.map(r => normalizeRoom(r) || r.trim().toUpperCase());
  const targetLower = normalizedTargets.map(r => r.toLowerCase());

  let nodesInCurrentLevel = 1;
  let nodesInNextLevel = 0;

  while (queue.length > 0) {
    const current = queue.shift();
    nodesInCurrentLevel--;

    const currentPerson = current.id === sourcePerson.id
      ? sourcePerson
      : db.prepare('SELECT id, name, room_no FROM people WHERE id = ?').get(current.id);

    if (currentPerson && targetLower.includes(currentPerson.room_no.toLowerCase().trim())) {
      const fullPath = [...current.path, {
        id: currentPerson.id,
        name: currentPerson.name,
        room_no: currentPerson.room_no
      }];
      foundPaths.push({ path: fullPath, target_room: currentPerson.room_no, length: fullPath.length });
    }

    const outgoing = db.prepare(`
      SELECT
        c.a_to_b_consent, c.b_to_a_consent,
        c.person_a_id, c.person_b_id,
        pa.id AS a_id, pb.id AS b_id,
        pa.name AS a_name, pa.room_no AS a_room,
        pb.name AS b_name, pb.room_no AS b_room
      FROM connections c
      JOIN people pa ON c.person_a_id = pa.id
      JOIN people pb ON c.person_b_id = pb.id
      WHERE (c.person_a_id = ? OR c.person_b_id = ?) AND c.status = 'confirmed'
    `).all(current.id, current.id);

    for (const edge of outgoing) {
      let neighborId = null;
      if (edge.person_a_id === current.id && edge.a_to_b_consent === 1) neighborId = edge.b_id;
      else if (edge.person_b_id === current.id && edge.b_to_a_consent === 1) neighborId = edge.a_id;

      if (neighborId && !visited.has(neighborId)) {
        visited.add(neighborId);
        nodesInNextLevel++;
        queue.push({
          id: neighborId,
          path: [...current.path, { id: currentPerson.id, name: currentPerson.name, room_no: currentPerson.room_no }]
        });
      }
    }

    if (nodesInCurrentLevel === 0) {
      if (foundPaths.length > 0) break;
      nodesInCurrentLevel = nodesInNextLevel;
      nodesInNextLevel = 0;
    }
  }

  if (foundPaths.length === 0) return { found: false };

  foundPaths.sort((a, b) => a.length - b.length);
  const shortest = foundPaths[0];
  const otherTargets = foundPaths.slice(1).filter(p => p.target_room !== shortest.target_room);

  return {
    found: true,
    path: shortest.path,
    target_room: shortest.target_room,
    path_length: shortest.length - 1,
    alternative_targets: otherTargets.map(t => ({ room: t.target_room, path_length: t.length - 1 }))
  };
}

module.exports = { recheckAllSavedSearches };
