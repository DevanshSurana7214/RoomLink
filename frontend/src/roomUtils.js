/**
 * Room number utilities for RoomLink
 *
 * Room format: Wing (A/B) + Floor(1-8) + Room(01-30)
 * Normalized format: e.g., "A101", "B205", "A220", "B830"
 */

const ROOM_REGEX = /^([AB])([1-8])(0[1-9]|1[0-9]|2[0-9]|30)$/i;

/**
 * Normalize a raw room input to standard format.
 * Strips dashes, spaces, and uppercases the wing letter.
 * Returns null if the input can't be normalized to a valid room.
 *
 * Examples:
 *   "a-101"  → "A101"
 *   "B 205"  → "B205"
 *   "A2-05"  → "A205"
 *   "C101"   → null (invalid wing)
 *   "A999"   → null (invalid room number)
 */
export function normalizeRoom(raw) {
  if (!raw || typeof raw !== 'string') return null;

  // Strip dashes, spaces, dots, underscores
  const cleaned = raw.replace(/[\s\-._]+/g, '').toUpperCase();

  const match = cleaned.match(ROOM_REGEX);
  if (!match) return null;

  // Return in canonical form: "A101"
  return match[1] + match[2] + match[3];
}

/**
 * Returns an error message if the room is invalid, or null if valid.
 */
export function validateRoom(raw) {
  const normalized = normalizeRoom(raw);
  if (!normalized) {
    return `Invalid room number "${raw}". Expected format: Wing (A/B) + Floor (1-8) + Room (01-30), e.g. "A101" or "B205".`;
  }
  return null;
}
