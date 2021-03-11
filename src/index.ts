import _ from 'lodash';

import * as db from './db';
// import { robot } from './puppeteer';
// import { http } from './http';

async function main() {
  // const pushers = await db.conn.selectFrom(db.pushers).select(_.pick(db.pushers, 'id', 'name', '_typ', 'meta')).executeSelectMany();
  // const projects = await db.conn
  //   .selectFrom(db.projects)
  //   .select(_.pick(db.projects, 'id', 'interval', 'name', 'pusher_ids', 'setup_script', 'started'))
  //   .executeSelectMany();
  // const plans = await db.conn
  //   .selectFrom(db.plans)
  //   .select(_.pick(db.plans, 'id', 'interval', 'name', 'project_id', 'pusher_ids', 'check_script', 'started'))
  //   .executeSelectMany();

  // await robot.setup();
  // robot.pushers = pushers;
  // robot.projects = projects;
  // robot.plans = plans;
  // robot.start();

  // http.listen(3000);
  await db.setup();
  // const n = await db.conn
  //   .insertInto(db.configs)
  //   .values([
  //     { key: 'abc', value: 'yasf' },
  //     { key: 'efg', value: 'y67267812' },
  //   ])
  //   .executeInsert();
  // console.log('insert', n);
  // const configs = db.run(db.conn.selectFrom(db.configs).select(_.pick(db.configs, 'key', 'value')));
  process.exit();
}

main();

// const setup = async () => null;
// setup().then(() => http.listen(3000));
