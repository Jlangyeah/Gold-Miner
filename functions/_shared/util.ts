export interface Env {
  DB: D1Database;
}

export const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' },
  });

export const validPlayerId = (id: string) => /^[a-f0-9]{8,64}$/i.test(id);

/** 按码点截断，避免把 emoji 等代理对切成半个字符 */
export const cutChars = (s: string, max: number) => Array.from(s).slice(0, max).join('');

export const cleanNick = (v: unknown) =>
  typeof v === 'string' ? cutChars(v.replace(/[\u0000-\u001f<>]/g, ''), 12).trim() : '';
