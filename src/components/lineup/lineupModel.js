import { FORMATIONS } from './formations';

// Lineups aren't stored anywhere yet. This is the shape a saved teamsheet
// could take (e.g. GET /api/v1/fixtures/{id}/lineup), referencing players by
// id so it stays small and always shows the squad's current name/photo:
//
//   {
//     fixtureId: '6710f…',
//     formation: '4-3-3',
//     starters: [{ playerId: '66f2…', slot: 'GK' }, …],   // 11 entries
//     substitutes: ['66f9…', …],
//     publishedAt: '2026-10-25T13:45:00Z'                  // null = draft
//   }
//
// resolveLineup() joins that document against the squad list so the reveal
// component only ever deals with full player objects.
export function resolveLineup(lineupDoc, squad) {
  const byId = new Map((squad || []).map((p) => [p.id, p]));
  const slots = FORMATIONS[lineupDoc.formation] || [];
  const slotOrder = new Map(slots.map((s, i) => [s.slot, i]));

  const starters = (lineupDoc.starters || [])
    .map(({ playerId, slot }) => ({ slot, player: byId.get(playerId) }))
    .filter((s) => s.player && slotOrder.has(s.slot))
    .sort((a, b) => slotOrder.get(a.slot) - slotOrder.get(b.slot));

  const substitutes = (lineupDoc.substitutes || [])
    .map((id) => byId.get(id))
    .filter(Boolean);

  return { formation: lineupDoc.formation, starters, substitutes };
}

// Demo helper: picks an XI straight from the squad so the prototype works
// before any lineup is saved. Fills each slot from the matching position
// group (most appearances first), borrows from any group if one runs short,
// and puts the next five on the bench.
export function autoPickLineup(squad, formation, benchSize = 5) {
  const slots = FORMATIONS[formation] || FORMATIONS['4-4-2'];
  const pool = [...(squad || [])].sort(
    (a, b) => (b.appearances ?? 0) - (a.appearances ?? 0)
  );
  const used = new Set();
  const take = (predicate) => {
    const player = pool.find((p) => !used.has(p.id) && predicate(p));
    if (player) used.add(player.id);
    return player;
  };

  const starters = slots
    .map(({ slot, group }) => ({
      slot,
      player: take((p) => p.position === group) || take(() => true),
    }))
    .filter((s) => s.player);

  const substitutes = pool.filter((p) => !used.has(p.id)).slice(0, benchSize);

  return { formation, starters, substitutes };
}

export function splitName(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { first: '', last: parts[0] || 'Unnamed' };
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] };
}
