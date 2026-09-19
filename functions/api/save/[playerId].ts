import { cleanNick, Env, json, validPlayerId } from '../../_shared/util';

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const id = String(params.playerId ?? '');
  if (!validPlayerId(id)) return json({ error: 'bad id' }, 400);
  const row = await env.DB.prepare(
    'SELECT data, nickname, updated_at FROM saves WHERE player_id = ?'
  )
    .bind(id)
    .first();
  return json({ save: row ?? null });
};

export const onRequestPost: PagesFunction<Env> = async ({ env, params, request }) => {
  const id = String(params.playerId ?? '');
  if (!validPlayerId(id)) return json({ error: 'bad id' }, 400);
  const body = (await request.json().catch(() => null)) as {
    nickname?: string;
    data?: string;
  } | null;
  if (!body || typeof body.data !== 'string' || body.data.length > 8192)
    return json({ error: 'bad data' }, 400);
  try {
    const d = JSON.parse(body.data);
    if (d?.v !== 1) return json({ error: 'bad schema' }, 400);
  } catch {
    return json({ error: 'bad json' }, 400);
  }
  await env.DB.prepare(
    'INSERT OR REPLACE INTO saves (player_id, nickname, data, updated_at) VALUES (?, ?, ?, ?)'
  )
    .bind(id, cleanNick(body.nickname), body.data, Date.now())
    .run();
  return json({ ok: true });
};
