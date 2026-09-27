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

export const DEFAULT_NICK = '无名矿工';
export const NICK_MAX = 12;

/** 按码点截断，避免把 emoji 等代理对切成半个字符 */
const cut = (s: string, max: number) => Array.from(s).slice(0, max).join('');

/** localStorage 是唯一事实来源；存档里的昵称仅作跨设备恢复 */
export function nickname(): string {
  return localStorage.getItem(NICK_KEY) || '';
}

export function setNickname(n: string) {
  localStorage.setItem(NICK_KEY, cut(n.trim(), NICK_MAX));
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

export const displayNick = (n: string) => n || DEFAULT_NICK;

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
  playerId?: string | null;
  nickname: string | null;
  level: number;
  money: number;
  updatedAt?: number | null;
}

export async function fetchLeaderboard(): Promise<BoardRow[] | null> {
  try {
    const r = await fetch('/api/leaderboard').then((x) => x.json());
    return Array.isArray(r?.list) ? r.list : null;
  } catch {
    return null;
  }
}

/** 排行榜时间列：今天显示时分，更早显示日期 */
export function formatWhen(ts?: number | null): string {
  if (!ts || !Number.isFinite(ts)) return '—';
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  return sameDay
    ? `今天 ${p(d.getHours())}:${p(d.getMinutes())}`
    : `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
