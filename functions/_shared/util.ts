export interface Env {
  DB: D1Database;
}

export const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' },
  });

export const validPlayerId = (id: string) => /^[a-f0-9]{8,64}$/i.test(id);

export const cleanNick = (v: unknown) =>
  typeof v === 'string' ? v.replace(/[\u0000-\u001f<>]/g, '').slice(0, 24) : '';
