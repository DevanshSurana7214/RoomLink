const express = require('express');
const { getDb } = require('../db');

const router = express.Router();

// BFS pathfinding over the directed consent graph
// Body: { person_id, target_rooms: ["A206", "A310", ...] }
router.post('/', (req, res) => {
  const { person_id, target_rooms } = req.body;

  if (!person_id || !target_rooms || !Array.isArray(target_rooms) || target_rooms.length === 0) {
    return res.status(400).json({ error: 'person_id and target_rooms (non-empty array) are required' });
  }

  const db = getDb();

  // Verify source person exists
  const sourcePerson = db.prepare('SELECT id, name, room_no FROM people WHERE id = ?').get(person_id);
  if (!sourcePerson) {
    return res.status(404).json({ error: 'Source person not found' });
  }

  // Check if source person is already in one of the target rooms
  if (target_rooms.some(r => r.toLowerCase() === sourcePerson.room_no.toLowerCase())) {
    return res.json({
      found: true,
      path: [{
        id: sourcePerson.id,
        name: sourcePerson.name,
        room_no: sourcePerson.room_no
      }],
      target_room: sourcePerson.room_no,
      message: 'You are already in one of the target rooms!'
    });
  }

  // Build the directed graph on the fly
  // For each confirmed connection, we have directional edges where consent is true
  // Edge from A to B exists if a_to_b_consent = 1 AND status = 'confirmed'
  // Edge from B to A exists if b_to_a_consent = 1 AND status = 'confirmed'

  // BFS state
  const visited = new Set([person_id]);
  const queue = [{ id: person_id, path: [] }];
  let foundPaths = [];

  const targetLower = target_rooms.map(r => r.toLowerCase().trim());

  // Track the current BFS depth for level-drained early exit
  let nodesInCurrentLevel = 1;
  let nodesInNextLevel = 0;

  while (queue.length > 0) {
    const current = queue.shift();
    nodesInCurrentLevel--;

    // Check if current node is in a target room
    const currentPerson = current.id === sourcePerson.id
      ? sourcePerson
      : db.prepare('SELECT id, name, room_no FROM people WHERE id = ?').get(current.id);

    if (currentPerson && targetLower.includes(currentPerson.room_no.toLowerCase().trim())) {
      const fullPath = [...current.path, {
        id: currentPerson.id,
        name: currentPerson.name,
        room_no: currentPerson.room_no
      }];
      foundPaths.push({
        path: fullPath,
        target_room: currentPerson.room_no,
        length: fullPath.length
      });
    }

    // Find outgoing edges from current node
    const outgoing = db.prepare(`
      SELECT
        c.id AS conn_id,
        c.a_to_b_consent,
        c.b_to_a_consent,
        c.person_a_id,
        c.person_b_id,
        pa.id AS a_id, pa.name AS a_name, pa.room_no AS a_room,
        pb.id AS b_id, pb.name AS b_name, pb.room_no AS b_room
      FROM connections c
      JOIN people pa ON c.person_a_id = pa.id
      JOIN people pb ON c.person_b_id = pb.id
      WHERE (c.person_a_id = ? OR c.person_b_id = ?) AND c.status = 'confirmed'
    `).all(current.id, current.id);

    for (const edge of outgoing) {
      let neighborId = null;

      if (edge.person_a_id === current.id && edge.a_to_b_consent === 1) {
        neighborId = edge.b_id;
      } else if (edge.person_b_id === current.id && edge.b_to_a_consent === 1) {
        neighborId = edge.a_id;
      }

      if (neighborId && !visited.has(neighborId)) {
        visited.add(neighborId);
        nodesInNextLevel++;
        queue.push({
          id: neighborId,
          path: [...current.path, {
            id: currentPerson.id,
            name: currentPerson.name,
            room_no: currentPerson.room_no
          }]
        });
      }
    }

    // When current level is drained, check if we found any paths
    if (nodesInCurrentLevel === 0) {
      if (foundPaths.length > 0) {
        // Found all shortest paths at this depth. Stop early.
        break;
      }
      // Move to next level
      nodesInCurrentLevel = nodesInNextLevel;
      nodesInNextLevel = 0;
    }
  }

  // Sort by path length (shortest first)
  foundPaths.sort((a, b) => a.length - b.length);

  if (foundPaths.length === 0) {
    return res.json({
      found: false,
      message: 'No consented path found to any target room'
    });
  }

  // Return the shortest path, and mention if other targets were reachable
  const shortest = foundPaths[0];
  const otherTargets = foundPaths.slice(1).filter(p => p.target_room !== shortest.target_room);

  res.json({
    found: true,
    path: shortest.path,
    target_room: shortest.target_room,
    path_length: shortest.length - 1, // number of hops
    alternative_targets: otherTargets.map(t => ({
      room: t.target_room,
      path_length: t.length - 1
    }))
  });
});

module.exports = router;
