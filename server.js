'use strict';
require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;
const CONTACT_TO = process.env.CONTACT_TO || 'dipti@yuktitec.com';

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'script-src': ["'self'", "'unsafe-inline'"],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
        'img-src': ["'self'", 'data:'],
        'connect-src': ["'self'"],
        'upgrade-insecure-requests': null,
      },
    },
  })
);
app.use(compression());
app.use(express.json({ limit: '10kb' }));

// --- Contact form -> email (needs SMTP_* settings, see .env.example) ---
const smtpReady = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
const transporter = smtpReady
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: String(process.env.SMTP_SECURE || 'true') === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false });
const clean = (v, max) => String(v || '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);

app.post('/api/contact', limiter, async (req, res) => {
  const { name, message, topics, website } = req.body || {};
  if (website) return res.json({ ok: true }); // honeypot: bots fill this hidden field
  const n = clean(name, 100);
  const m = String(message || '').trim().slice(0, 4000);
  const t = Array.isArray(topics) ? topics.map((x) => clean(x, 40)).slice(0, 6) : [];
  if (!n || !m) return res.status(400).json({ ok: false, error: 'Please add your name and a short message.' });
  if (!transporter) return res.status(503).json({ ok: false, error: 'Email is not configured on the server.' });
  try {
    await transporter.sendMail({
      from: `"Yuktitec website" <${process.env.SMTP_USER}>`,
      to: CONTACT_TO,
      subject: `New enquiry from ${n}`,
      text: `Name: ${n}\nTopics: ${t.join(', ') || '-'}\n\n${m}`,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('Mail error:', err.message);
    res.status(502).json({ ok: false, error: 'Could not send right now.' });
  }
});

app.get('/healthz', (_req, res) => res.json({ ok: true }));

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'], maxAge: '1h' }));
app.use((_req, res) => res.status(404).sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`Yuktitec running on http://localhost:${PORT} (email ${smtpReady ? 'on' : 'off'})`));
