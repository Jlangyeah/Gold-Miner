export interface SaveData {
  v: 1;
  level: number;
  money: number;
  high: number;
  mute: boolean;
  pending: { coffee: number; speed: number; tnt: number };
  perm: { compass: boolean; ball: boolean; clover: boolean };
}

const KEY = 'gold-miner-save-v1';

export const defaultSave = (): SaveData => ({
  v: 1,
  level: 1,
  money: 0,
  high: 0,
  mute: false,
  pending: { coffee: 0, speed: 0, tnt: 0 },
  perm: { compass: false, ball: false, clover: false },
});

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    const d = JSON.parse(raw);
    if (d?.v !== 1) return defaultSave();
    return { ...defaultSave(), ...d, pending: { ...defaultSave().pending, ...d.pending }, perm: { ...defaultSave().perm, ...d.perm } };
  } catch {
    return defaultSave();
  }
}

export function writeSave(d: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* storage unavailable */
  }
}

export function clearProgress(d: SaveData): SaveData {
  const keep = defaultSave();
  keep.high = d.high;
  keep.mute = d.mute;
  writeSave(keep);
  return keep;
}
