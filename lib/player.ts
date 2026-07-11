/**
 * Anonymous player identity — no auth. A random ID minted on first visit
 * lives in localStorage; the display name is user-editable. The ID lets
 * the leaderboard upsert (keep each player's best) instead of duplicating.
 */
const ID_KEY = 'mgh_player_id';
const NAME_KEY = 'mgh_player_name';

export function getPlayerId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(ID_KEY, id);
  }
  return id;
}

export function getPlayerName(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(NAME_KEY) ?? '';
}

export function setPlayerName(name: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(NAME_KEY, name.trim().slice(0, 20));
}
