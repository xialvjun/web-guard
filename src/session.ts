import { HttpMiddleware, Response } from 'farrow-http';
import { createContext } from 'farrow-pipeline';
import LRUCache from 'lru-cache';
import { v4 as uuid } from 'uuid';

export type SessionType = {
  username?: string;
};

export const SessionContext = createContext<SessionType>(null!);

const SESSION_MAP = new LRUCache<string, SessionType>({
  maxAge: 1e3 * 60 * 60 * 24,
  updateAgeOnGet: true,
});

export const session_middleware: HttpMiddleware = async (req, next) => {
  const sid = req.cookies?.sid || uuid();
  const is_old = SESSION_MAP.has(sid);
  SessionContext.use().value = SESSION_MAP.get(req.cookies?.sid) || {};
  const res = await next();
  if (is_old) {
    return res;
  }
  return res.cookie('sid', sid);
};

export const require_login = () => {
  const session = SessionContext.use().value;
  if (!session.username) {
    throw '请先登录';
  }
  return session.username;
};
