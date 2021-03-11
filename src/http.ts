import { Http, Response, useRequestInfo } from 'farrow-http';
import _ from 'lodash';
import { v4 as uuid } from 'uuid';
import * as z from 'zod';
import * as crypto from 'crypto';

import * as db from './db';
import { resolveSync } from './resolve';
import { SessionContext, session_middleware, require_login } from './session';

export const http = Http();

http.serve('/', resolveSync('web/dist/'));
http.use(session_middleware);

http.get('/ping').use(r => {
  return Response.text('pong');
});

// z.object({ status: z.number().optional(), err: z.string() });
http.use(async (r, next) => {
  try {
    return next(r);
  } catch (err) {
    if (typeof err === 'string') {
      return Response.json({ err });
    }
    throw err;
  }
});

const login_z = z.object({
  username: z.string(),
  password: z.string(),
});
http.put('/login').use(async r => {
  const req = useRequestInfo();
  const { username, password } = login_z.parse(req.body);
  const user = await db.conn
    .selectFrom(db.users)
    .where(db.users.name.equals(username))
    .select(_.pick(db.users, 'id', 'name', 'salt', 'hmac'))
    .executeSelectNoneOrOne();
  if (crypto.createHmac('sha256', user?.salt || '').update(password).digest('hex') !== user?.hmac) {
    throw '用户名或密码不正确';
  }
  const session = SessionContext.use().value;
  session.username = username;
  return Response.json({ data: _.omit(user, 'salt', 'hmac') });
});
http.put('/save_user').use(async r => {
  require_login();
  const req = useRequestInfo();
  const { username, password } = login_z.parse(req.body);
  const salt = crypto.randomBytes(16).toString('hex');
  const hmac = crypto.createHmac('sha256', salt).update(password).digest('hex');
  const user = db.sqlite3.transaction(() => {
    let user = db.run(db.conn
      .selectFrom(db.users)
      .where(db.users.name.equals(username))
      .select(_.pick(db.users, 'id', 'name', 'salt', 'hmac')))[0];
    if (user) {
      db.run(db.conn.update(db.users).set({salt, hmac}).where(db.users.id.equals(user.id)));
    } else {
      user = { id: uuid(), name: username, salt, hmac };
      db.run(db.conn.insertInto(db.users).values(user));
    }
    return user;
  })();
  return Response.json({ data: _.omit(user, 'salt', 'hmac') });
});

http.get('/configs').use(async r => {
  require_login();
  const configs = await db.conn.selectFrom(db.configs).select(_.pick(db.configs, 'key', 'value')).executeSelectMany();
  return Response.json({ data: configs });
});

const save_config_z = z.object({
  key: z.string(),
  value: z.string(),
});
http.put('/save_config').use(async r => {
  require_login();
  const req = useRequestInfo();
  const config = save_config_z.parse(req.body);
  const row_num = await db.conn.update(db.configs).set({ value: config.value }).where(db.configs.key.equals(config.key)).executeUpdate();
  if (row_num === 0) {
    await db.conn.insertInto(db.configs).values(config).executeInsert();
  }
  db.refresh_configs();
  return Response.json({});
});

http.get('/pushers').use(async r => {
  require_login();
  const pushers = await db.conn.selectFrom(db.pushers).select(_.pick(db.pushers, '_typ', 'id', 'name', 'meta', 'tags')).executeSelectMany();
  return Response.json({ data: pushers });
});

const save_pusher_z = z.object({
  id: z.string().optional(),
  name: z.string(),
  _typ: z.enum(['EMAIL', 'SMS']),
  meta: z.string(),
  tags: z.string(),
});
http.put('/save_pusher').use(async r => {
  require_login();
  const req = useRequestInfo();
  const pusher = save_pusher_z.parse(req.body);
  if (pusher.id) {
    const row_num = await db.conn.update(db.pushers).set(pusher).where(db.pushers.id.equals(pusher.id)).executeUpdate();
    return Response.json({ data: row_num });
  }
  const values = { ...pusher, id: uuid() };
  await db.conn.insertInto(db.pushers).values(values).executeInsert();
  return Response.json({ data: values });
});

http.get('/projects').use(async r => {
  require_login();
  const pushers = await db.conn.selectFrom(db.pushers).select(_.pick(db.pushers, 'id', 'name', '_typ', 'meta', 'tags')).executeSelectMany();
  const projects = await db.conn
    .selectFrom(db.projects)
    .select(_.pick(db.projects, 'id', 'name', 'interval', 'setup_script', 'pusher_ids', 'started'))
    .executeSelectMany();
  const plans = await db.conn
    .selectFrom(db.plans)
    .select(_.pick(db.plans, 'id', 'project_id', 'name', 'interval', 'check_script', 'pusher_ids', 'started'))
    .executeSelectMany();
  const plans_d = plans.map(plan => ({
    ...plan,
    pusher_ids: plan.pusher_ids.split(','),
    pushers: pushers.filter(it => plan.pusher_ids.indexOf(it.id) > -1),
  }));
  const projects_d = projects.map(project => ({
    ...project,
    pusher_ids: project.pusher_ids.split(','),
    pushers: pushers.filter(it => project.pusher_ids.indexOf(it.id) > -1),
    plans: plans_d.filter(plan => plan.project_id === project.id),
  }));
  return Response.json({ data: projects_d });
});

const save_project_z = z.object({
  id: z.string().optional(),
  name: z.string(),
  interval: z
    .number()
    .int()
    .min(1e3 * 60),
  setup_script: z.string(),
  script_timeout: z.number(),
  pusher_ids: z.string(),
  started: z.boolean(),
});
http.put('/save_project').use(async r => {
  require_login();
  const req = useRequestInfo();
  const project = save_project_z.parse(req.body);
  if (project.id) {
    const row_num = await db.conn.update(db.projects).set(project).where(db.projects.id.equals(project.id)).executeUpdate();
    return Response.json({ data: row_num });
  }
  const values = { ...project, id: uuid() };
  await db.conn.insertInto(db.projects).values(values).executeInsert();
  return Response.json({ data: values });
});

const save_plan_z = z.object({
  id: z.string().optional(),
  project_id: z.string(),
  name: z.string(),
  interval: z
    .number()
    .int()
    .min(1e3 * 60),
  check_script: z.string(),
  script_timeout: z.number(),
  pusher_ids: z.string(),
  started: z.boolean(),
});
http.put('/save_plan').use(async r => {
  require_login();
  const req = useRequestInfo();
  const plan = save_plan_z.parse(req.body);
  if (plan.id) {
    const row_num = await db.conn.update(db.plans).set(plan).where(db.plans.id.equals(plan.id)).executeUpdate();
    return Response.json({ data: row_num });
  }
  const values = { ...plan, id: uuid() };
  await db.conn.insertInto(db.plans).values(values).executeInsert();
  return Response.json({ data: values });
});

http.get('/export').use(async r => {
  require_login();
  const configs = await db.conn.selectFrom(db.configs).select(_.pick(db.configs, 'key', 'value')).executeSelectMany();
  const pushers = await db.conn.selectFrom(db.pushers).select(_.pick(db.pushers, 'id', 'name', '_typ', 'meta', 'tags')).executeSelectMany();
  const projects = await db.conn
    .selectFrom(db.projects)
    .select(_.pick(db.projects, 'id', 'interval', 'name', 'pusher_ids', 'setup_script', 'script_timeout', 'started'))
    .executeSelectMany();
  const plans = await db.conn
    .selectFrom(db.plans)
    .select(_.pick(db.plans, 'check_script', 'id', 'interval', 'name', 'project_id', 'script_timeout', 'pusher_ids', 'started'))
    .executeSelectMany();
  return Response.json({ data: { configs, pushers, projects, plans } });
});

const import_id_z = z.object({
  id: z.string(),
});
const import_z = z
  .object({
    configs: z.array(save_config_z),
    pushers: z.array(z.intersection(save_pusher_z, import_id_z)),
    projects: z.array(z.intersection(save_project_z, import_id_z)),
    plans: z.array(z.intersection(save_plan_z, import_id_z)),
  })
  .partial();
http.put('/import').use(async r => {
  require_login();
  const req = useRequestInfo();
  const force = req.query?.force;
  const { configs, pushers, projects, plans } = import_z.parse(req.body);
  // 似乎 ts-sql-query 暂时 transaction 有 bug
  // await db.conn.beginTransaction();
  if (configs) {
    if (force) {
      await db.conn
        .deleteFrom(db.configs)
        .where(db.configs.key.in(configs.map(it => it.key)))
        .executeDelete();
    }
    await db.conn.insertInto(db.configs).values(configs).executeInsert();
  }
  if (pushers) {
    if (force) {
      await db.conn
        .deleteFrom(db.pushers)
        .where(db.pushers.id.in(pushers.map(it => it.id)))
        .executeDelete();
    }
    await db.conn.insertInto(db.pushers).values(pushers).executeInsert();
  }
  if (projects) {
    if (force) {
      await db.conn
        .deleteFrom(db.projects)
        .where(db.projects.id.in(projects.map(it => it.id)))
        .executeDelete();
    }
    await db.conn.insertInto(db.projects).values(projects).executeInsert();
  }
  if (plans) {
    if (force) {
      await db.conn
        .deleteFrom(db.plans)
        .where(db.plans.id.in(plans.map(it => it.id)))
        .executeDelete();
    }
    await db.conn.insertInto(db.plans).values(plans).executeInsert();
  }
  return Response.json({});
});
