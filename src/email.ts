import nodemailer from 'nodemailer';
import { promisify } from 'util';

export const transporter = nodemailer.createTransport({
  sendmail: true,
  newline: 'unix',
  path: '/usr/sbin/sendmail',
});

// export const send_email = promisify(transporter.sendMail);
export const send_email = promisify(transporter.sendMail.bind(transporter) as typeof transporter.sendMail);

// transporter.sendMail({
//   from: 'sender@example.com',
//   to: 'recipient@example.com',
//   subject: 'Message',
//   text: 'I hope this message gets delivered!'
// }, (err, info) => {
//   console.log(info.envelope);
//   console.log(info.messageId);
// });
