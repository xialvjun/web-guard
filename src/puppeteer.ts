import puppeteer from 'puppeteer-core';
import _ from 'lodash';

import { send_email } from './email';
import * as db from './db';
import { CONFIG } from './config';

const executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const timeout = (ms: number, msg?: string) =>
  new Promise((res, rej) => setTimeout(() => rej(new Error('Timeout Error' + (msg ? ': ' + msg : ''))), ms));

// interface ScriptTask {
//   project_id: string;
//   plan_id?: string;
//   provider?:
// }

const page_eval = async (page: puppeteer.Page, code: string) => eval(code);

class PagePool {
  private browser?: puppeteer.Browser;
  private pages: puppeteer.Page[] = [];
  private max_parallel = 1;
  async setup() {
    this.max_parallel = CONFIG.SCRIPT_PARALLEL;
    this.browser = await puppeteer.launch({ executablePath, headless: false });
    this.pages = await Promise.all(_.range(this.max_parallel).map(_ => this.browser!.newPage()));
    this.start_interval_clear();
  }
  private interval?: NodeJS.Timeout;
  start_interval_clear() {
    this.stop_interval_clear();
    this.interval = setInterval(() => this.try_clear(), 1e3 * 60 * 60);
  }
  stop_interval_clear() {
    this.interval && clearInterval(this.interval);
  }
  private need_clear?: NodeJS.Timeout;
  private try_clear() {
    !!this.need_clear && clearTimeout(this.need_clear);
    this.need_clear = setTimeout(async () => {
      if (this.pages.length === this.max_parallel) {
        (await Promise.all(this.browser!.targets().map(it => it.page()))).forEach(it => it?.close());
        this.pages = await Promise.all(_.range(this.max_parallel).map(_ => this.browser!.newPage()));
        this.need_clear = undefined;
        this.schedule();
      } else {
        this.try_clear();
      }
    }, 100);
  }
  private tasks: any[] = [];
  private schedule() {
    while (this.tasks.length && this.pages.length && !this.need_clear) {
      const task = this.tasks.shift();
      const page = this.pages.shift()!;
      Promise.race([page_eval(page, task.code), timeout(task.timeout)])
        .then(
          res => task.res(res),
          rej => task.rej(rej),
        )
        .finally(() => this.pages.push(page));
    }
  }
  async run(code: string, opts?: { timeout?: number; first?: boolean }) {
    return new Promise((res, rej) => {
      const task = { res, rej, code, timeout: opts?.timeout || CONFIG.DEFAULT_SCRIPT_TIMEOUT };
      opts?.first ? this.tasks.unshift(task) : this.tasks.push(task);
      this.schedule();
    });
  }
}

export const pool = new PagePool();
export const setup = async () => {
  await pool.setup();
  db.conn.selectFrom(db.projects)
};

interface Project {

}

// ! ???????????????task ????????????????????? ???????????? ?????????????????????????????????setInterval ????????? task ???????????????????????????????????????????????????????????? browser ???????????? task ??????????????????

class Robot {
// ??? setTimeout ?????? setInterval ?????????????????????
// ????????????????????? projects??? plans ?????????
}

// const a = async () => {
//   let urls: string[] = [];
//   let reqs: any[] = [];
//   let para = 0;
//   for (const url of urls) {
//     if (para < 8) {
//       para++;
//       Promise.resolve(url).finally(() => {para--;});
//     } else {

//     }
//   }
// }
