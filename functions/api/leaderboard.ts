import { Env, json } from '../_shared/util';

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare(
    'SELECT nickname, level, money FROM scores ORDER BY level DESC, money DESC LIMIT 20'
  ).all();
  return json({ list: results ?? [] });
};
