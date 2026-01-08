import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: '192.168.2.110',
  port: 25,
  secure: false,
  tls: {
    rejectUnauthorized: false
  }
});

export default {
  send: (options) => transporter.sendMail({
    from: 'no-reply@leonilso.com.br',
    ...options
  })
};