import { cleanNick, Env, json, validPlayerId } from '../_shared/util';

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const body = (await request.json().catch(() => null)) as {
    playerId?: string;
    nickname?: string;
    level?: number;
    money?: number;
  } | null;
  if (!body || !validPlayerId(String(body.playerId))) return json({ error: 'bad id' }, 400);
  const level = Math.floor(Number(body.level));
  const money = Math.floor(Number(body.money));
  if (!Number.isFinite(level) || level < 1 || level > 9999) return json({ error: 'bad level' }, 400);
  if (!Number.isFinite(money) || money < 0 || money > 1e9) return json({ error: 'bad money' }, 400);

  const id = String(body.playerId);
  const cur = await env.DB.prepare('SELECT level, money FROM scores WHERE player_id = ?')
    .bind(id)
    .first<{ level: number; money: number }>();
  if (cur && (cur.level > level || (cur.level === level && cur.money >= money)))
    return json({ ok: true, kept: true });

  await env.DB.prepare(
    'INSERT OR REPLACE INTO scores (player_id, nickname, level, money, updated_at) VALUES (?, ?, ?, ?, ?)'
  )
    .bind(id, cleanNick(body.nickname), level, money, Date.now())
    .run();
  return json({ ok: true });
};
