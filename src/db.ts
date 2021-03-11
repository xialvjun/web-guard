import betterSqlite3 from 'better-sqlite3';
import _ from 'lodash';
import * as crypto from 'crypto';
import { v4 as uuid } from 'uuid';

import { Table } from 'ts-sql-query/Table';
import { SqliteConnection } from 'ts-sql-query/connections/SqliteConnection';
import { BetterSqlite3QueryRunner } from 'ts-sql-query/queryRunners/BetterSqlite3QueryRunner';

class DBConnection extends SqliteConnection<'DBConnection'> {}

// // 简单的 key value 配置管理
// export const configs = new (class extends Table<DBConnection, 'configs'> {
//   key = this.primaryKey('key', 'string');
//   value = this.column<any>('value', 'custom', 'any', { transformValueFromDB: v => v, transformValueToDB: v => v });
//   constructor() {
//     super('configs');
//   }
// })();

// 用户表，可以是多个用户，为将来升级（例如记录操作记录）留下空间
export const users = new (class extends Table<DBConnection, 'users'> {
  id = this.primaryKey('id', 'string');
  name = this.column('name', 'string');
  salt = this.column('salt', 'string');
  hmac = this.column('hmac', 'string');
  constructor() {
    super('users');
  }
})();

// 提醒方式，出现一个监控报错，可以多个提醒方式都提醒
export const pushers = new (class extends Table<DBConnection, 'pushers'> {
  id = this.primaryKey('id', 'string');
  name = this.column('name', 'string');
  _typ = this.column<'EMAIL' | 'SMS'>('_typ', 'enum', 'PusherType' /** no_custom_adapter_means_ident_adapter */);
  meta = this.column('meta', 'string');
  // tags = this.column<string[]>('tags', 'custom', 'whatever_just_for_custom_adapter_functions_second_param', {
  //   transformValueFromDB: v => (v as string).split(','),
  //   transformValueToDB: v => (v as string[]).join(','),
  // });
  tags = this.column('tags', 'string');
  constructor() {
    super('pushers');
  }
})();

// 采取 “项目 1-n 计划” 的模型，类似测试，来做分组。同时也有 项目的 script 是 setup 部分
export const projects = new (class extends Table<DBConnection, 'projects'> {
  id = this.primaryKey('id', 'string');
  name = this.column('name', 'string');
  interval = this.column('interval', 'int');
  script_id = this.column('script_id', 'string');
  // setup_script = this.column('setup_script', 'string');
  // script_timeout = this.column('script_timeout', 'int');
  // pusher_ids = this.column('pusher_ids', 'string');
  // started = this.column('started', 'boolean');
  constructor() {
    super('projects');
  }
})();
export const projects_f = projects.forUseInLeftJoin();

export const plans = new (class extends Table<DBConnection, 'plans'> {
  id = this.primaryKey('id', 'string');
  project_id = this.column('project_id', 'string');
  name = this.column('name', 'string');
  interval = this.column('interval', 'int');
  script_id = this.column('script_id', 'string');
  // check_script = this.column('check_script', 'string');
  // script_timeout = this.column('script_timeout', 'int');
  // pusher_ids = this.column('pusher_ids', 'string');
  // started = this.column('started', 'boolean');
  constructor() {
    super('plans');
  }
})();
export const plans_f = plans.forUseInLeftJoin();

export const scripts = new (class extends Table<DBConnection, 'scripts'> {
  id = this.primaryKey('id', 'string');
  code = this.column('code', 'string');
  timeout = this.column('timeout', 'int');
  pusher_ids = this.column('pusher_ids', 'string');
  started = this.column('started', 'boolean');
  constructor() {
    super('scripts');
  }
})();

export const tasks = new (class extends Table<DBConnection, 'tasks'> {
  id = this.primaryKey('id', 'string');
  script_id = this.column('script_id', 'string');
  created_at = this.column('created_at', 'int');
  canceled_at = this.optionalColumn('canceled_at', 'int');
  started_at = this.optionalColumn('started_at', 'int');
  stopped_at = this.optionalColumn('stopped_at', 'int');
  result = this.column('result', 'string');
  error = this.column('error', 'string');
  constructor() {
    super('tasks');
  }
})();

// export const script_logs = new (class extends Table<DBConnection, 'script_logs'> {
//   id = this.primaryKey('id', 'string');
//   project_id = this.column('project_id', 'string');
//   plan_id = this.optionalColumn('plan_id', 'string');
//   start_at = this.column('start_at', 'int');
//   stop_at = this.optionalColumn('stop_at', 'int');
//   result = this.optionalColumn('result', 'string');
//   error = this.optionalColumn('error', 'string');
//   constructor() {
//     super('script_logs');
//   }
// })();

// --------------

export const sqlite3 = betterSqlite3('sqlite3.db');

export const conn = new DBConnection(new BetterSqlite3QueryRunner(sqlite3));

// --------------

import { ExecutableInsert } from 'ts-sql-query/expressions/insert';
import { ExecutableSelect } from 'ts-sql-query/expressions/select';
import { ExecutableUpdate } from 'ts-sql-query/expressions/update';
import { ExecutableDelete } from 'ts-sql-query/expressions/delete';

type ExecutableSelectResult<E extends ExecutableSelect<any, any, any>> = E extends ExecutableSelect<any, infer R, any> ? R : never;
export function run<Q extends ExecutableSelect<any, any, any>>(query: Q): ExecutableSelectResult<Q>[];
export function run<Q extends ExecutableInsert<any> | ExecutableUpdate<any> | ExecutableDelete<any>>(query: Q): betterSqlite3.RunResult;
export function run(query: any) {
  if (!!query.executeSelectMany) {
    return sqlite3.prepare(query.query()).all();
  }
  return sqlite3.prepare(query.query()).run();
}

// ---------------

export const setup = async () => {
  try {
    sqlite3.transaction(() => {
      sqlite3.pragma(`foreign_keys = ON`);
      sqlite3.exec(`
CREATE TABLE "configs" (
  "key" text PRIMARY KEY,
  "value",
);
CREATE TABLE "users" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL UNIQUE,
  "salt" text NOT NULL,
  "hmac" text NOT NULL,
);
CREATE TABLE "pushers" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL UNIQUE,
  "_typ" text NOT NULL,
  "meta" text NOT NULL,
  "tags" text NOT NULL,
);
CREATE TABLE "projects" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL UNIQUE,
  "interval" int NOT NULL,
  "setup_script" text NOT NULL,
  "script_timeout" int NOT NULL,
  "pusher_ids" text NOT NULL,
  "started" boolean NOT NULL,
);
CREATE TABLE "plans" (
  "id" text PRIMARY KEY,
  "project_id" text NOT NULL REFERENCES "projects" ("id"),
  "name" text NOT NULL,
  "interval" int NOT NULL,
  "check_script" text NOT NULL,
  "script_timeout" int NOT NULL,
  "pusher_ids" text NOT NULL,
  "started" boolean NOT NULL,
);
CREATE TABLE "script_logs" (
  "id" text PRIMARY KEY,
  "project_id" text NOT NULL REFERENCES "projects" ("id") ON DELETE CASCADE,
  "plan_id" text REFERENCES "projects" ("id") ON DELETE CASCADE,
  "start_at" int NOT NULL,
  "stop_at" int,
  "result" text,
  "error" text,
);
      `);
      // run(conn.insertInto(configs).values({ key: 'DEFAULT_SCRIPT_TIMEOUT', value: 3e5 as any }));
      // run(conn.insertInto(configs).values({ key: 'DEFAULT_PASSWORD', value: '123456' }));
      // run(conn.insertInto(configs).values({ key: 'MAX_PARALLEL', value: 8 as any }));
      // const salt = crypto.randomBytes(16).toString('hex');
      // const pass = 'admin';
      // const hmac = crypto.createHmac('sha256', salt).update(pass).digest('hex');
      // run(conn.insertInto(users).values({ id: uuid(), name: 'admin', salt, hmac }));
    })();
  } catch (error) {}

  // refresh_configs();
  run(conn.update(tasks).set({ canceled_at: Date.now()-1 }).where(tasks.canceled_at.isNull().or(tasks.stopped_at.isNull())));

};

// let CONFIGS = {
//   DEFAULT_SCRIPT_TIMEOUT: 3e5,
//   DEFAULT_USER_PASSWORD: '123456',
//   MAX_PARALLEL: 8,
// };
// export const get_configs = () => CONFIGS;
// export const refresh_configs = () => {
//   const _configs = Object.fromEntries(run(conn.selectFrom(configs).select(_.pick(configs, 'key', 'value'))).map(it => [it.key, it.value]));
//   CONFIGS = { ...CONFIGS, ..._configs };
//   return CONFIGS;
// };

// var bs = require('better-sqlite3')
// var db = bs(':memory:')
// db.exec(`
// create table a (id integer primary key, name string);
// create table b (id integer primary key, bname string, aid integer not null references a(id) on update set default);
// `)
// // db.prepare(`insert into a values (?)`).run('xia')
// // Uncaught SqliteError: table a has 2 columns but 1 values were supplied
// var insert_a = db.prepare(`insert into a values (?, ?)`)
// insert_a.run(1, 'xia')
// insert_a.run(2, 'lv')
// var insert_b = db.prepare(`insert into b values (?, ?, ?)`)
// insert_b.run(1, 'qwe', 1)
// insert_b.run(2, 'asd', 1)
// insert_b.run(3, 'zxc', 2)
// var sa = db.prepare(`select * from a`)
// var sb = db.prepare(`select * from b`)
// sa.all()
// sb.all()
// // -------
// db.prepare(`delete from a where id=1`).run()
// Uncaught SqliteError: FOREIGN KEY constraint failed
// db.prepare(`update a set id = 10 where id = 1`).run()
// Uncaught SqliteError: FOREIGN KEY constraint failed

// var _ = require('lodash');
// var bs = require('better-sqlite3')
// var db = bs(':memory:')
// db.exec(`create table m (id integer primary key, a integer, b text, c numeric, d custom, e)`);
// var im = db.prepare(`insert into m values (?,?,?,?,?,?)`);
// var sm = db.prepare(`select * from m`);
// im.run(1, _.range(5).map(_ => 3));
// im.run(2, _.range(5).map(_ => 03));
// im.run(3, _.range(5).map(_ => 0x3));
// im.run(4, _.range(5).map(_ => '3'));
// im.run(5, _.range(5).map(_ => '03'));
// im.run(6, _.range(5).map(_ => '0x3'));
// im.run(7, _.range(5).map(_ => '123'));
// im.run(8, _.range(5).map(_ => '0x123'));
// im.run(9, _.range(5).map(_ => 0x123));
// im.run(10, _.range(5).map(_ => 'abcde'));

// sm.all();
// [
//   { id: 1, a: 3, b: '3.0', c: 3, d: 3, e: 3 },
//   { id: 2, a: 3, b: '3.0', c: 3, d: 3, e: 3 },
//   { id: 3, a: 3, b: '3.0', c: 3, d: 3, e: 3 },
//   { id: 4, a: 3, b: '3', c: 3, d: 3, e: '3' },
//   { id: 5, a: 3, b: '03', c: 3, d: 3, e: '03' },
//   { id: 6, a: '0x3', b: '0x3', c: '0x3', d: '0x3', e: '0x3' },
//   { id: 7, a: 123, b: '123', c: 123, d: 123, e: '123' },
//   { id: 8, a: '0x123', b: '0x123', c: '0x123', d: '0x123', e: '0x123' },
//   { id: 9, a: 291, b: '291.0', c: 291, d: 291, e: 291 },
//   {
//     id: 10,
//     a: 'abcde',
//     b: 'abcde',
//     c: 'abcde',
//     d: 'abcde',
//     e: 'abcde'
//   }
// ]
