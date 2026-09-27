import { Env, json } from '../_shared/util';

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare(
    'SELECT player_id, nickname, level, money, updated_at FROM scores ORDER BY level DESC, money DESC LIMIT 20'
  ).all();
  const list = (results ?? []).map((r: any) => ({
    // player_id 用于前端判断「哪一行是我」，昵称可能重复或被改写
    playerId: r.player_id,
    nickname: r.nickname,
    level: r.level,
    money: r.money,
    updatedAt: r.updated_at,
  }));
  return json({ list });
};
