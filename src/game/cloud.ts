import { SaveData } from './save';

const ID_KEY = 'gm-pid';
const NICK_KEY = 'gm-nick';

export function playerId(): string {
  let id = localStorage.getItem(ID_KEY);
  if (!id || !/^[a-f0-9]{8,64}$/.test(id)) {
    id = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    localStorage.setItem(ID_KEY, id);
  }
  return id;
}

export function nickname(): string {
  return localStorage.getItem(NICK_KEY) || '无名矿工';
}

export function setNickname(n: string) {
  localStorage.setItem(NICK_KEY, n.slice(0, 12));
}

export async function cloudUpload(save: SaveData, nick: string): Promise<boolean> {
  try {
    const r = await fetch(`/api/save/${playerId()}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nickname: nick, data: JSON.stringify(save) }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

export async function cloudDownload(): Promise<SaveData | null> {
  try {
    const r = await fetch(`/api/save/${playerId()}`).then((x) => x.json());
    const data = r?.save?.data;
    if (typeof data !== 'string') return null;
    const d = JSON.parse(data);
    return d?.v === 1 ? (d as SaveData) : null;
  } catch {
    return null;
  }
}

export async function submitScore(level: number, money: number, nick: string) {
  try {
    await fetch('/api/score', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ playerId: playerId(), nickname: nick, level, money }),
    });
  } catch {
    /* offline */
  }
}

export interface BoardRow {
  nickname: string | null;
  level: number;
  money: number;
}

export async function fetchLeaderboard(): Promise<BoardRow[] | null> {
  try {
    const r = await fetch('/api/leaderboard').then((x) => x.json());
    return Array.isArray(r?.list) ? r.list : null;
  } catch {
    return null;
  }
}
