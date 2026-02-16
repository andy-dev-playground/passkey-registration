import 'dotenv/config';
import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

const rpName = 'Passkey Login Demo';
const rpID = 'localhost';
const origin = `http://${rpID}:${PORT}`;
const usersFile = path.join(__dirname, 'users.json');
const pendingRegistrations = new Map();

// Email transporter setup
let transporter;
const isDevelopment = !process.env.EMAIL_USER || !process.env.EMAIL_PASS; // || process.env.EMAIL_USER === 'andymacatbluestack@gmail.com';

if (isDevelopment) {
  console.log('⚠️  Running in DEVELOPMENT mode - emails will be logged to console instead of sent');
  transporter = {
    sendMail: async (mailOptions) => {
      console.log('\n📧 EMAIL SIMULATION:');
      console.log('To:', mailOptions.to);
      console.log('Subject:', mailOptions.subject);
      console.log('Content:', mailOptions.html.replace(/<[^>]*>/g, ''));
      console.log('---\n');
      return { messageId: 'dev-mode-' + Date.now() };
    }
  };
} else {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
  });
}

async function loadUsers() {
  try {
    const data = await fs.readFile(usersFile, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveUsers(users) {
  await fs.writeFile(usersFile, JSON.stringify(users, null, 2));
}

function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

app.post('/register/request', async (req, res) => {
  const { username, email, mobile } = req.body;
  
  if (!username || !email || !mobile) {
    return res.status(400).json({ error: 'Username, email, and mobile are required' });
  }

  const users = await loadUsers();
  if (users[username]) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  const verificationCode = generateVerificationCode();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  pendingRegistrations.set(username, {
    username,
    email,
    mobile,
    verificationCode,
    expiresAt,
  });

  try {
    if (isDevelopment) {
      console.log(`\n🔐 VERIFICATION CODE FOR ${username}: ${verificationCode}\n`);
    }
    
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@example.com',
      to: email,
      subject: 'Your Verification Code',
      html: `
        <h2>Welcome to Passkey Login Demo!</h2>
        <p>Your verification code is:</p>
        <h1 style="color: #667eea; font-size: 32px; letter-spacing: 5px;">${verificationCode}</h1>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
      `,
    });

    res.json({ 
      success: true, 
      message: isDevelopment 
        ? `Verification code: ${verificationCode} (Check server console)` 
        : 'Verification code sent to your email' 
    });
  } catch (error) {
    console.error('Email error:', error);
    
    if (isDevelopment) {
      console.log(`\n⚠️  Email sending failed, but here's your code: ${verificationCode}\n`);
      res.json({ 
        success: true, 
        message: `Development mode - Your code is: ${verificationCode}` 
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to send verification email. Error: ' + error.message 
      });
    }
  }
});

app.post('/register/verify', async (req, res) => {
  const { username, code } = req.body;

  const pending = pendingRegistrations.get(username);
  if (!pending) {
    return res.status(400).json({ error: 'No pending registration found' });
  }

  if (Date.now() > pending.expiresAt) {
    pendingRegistrations.delete(username);
    return res.status(400).json({ error: 'Verification code expired' });
  }

  if (pending.verificationCode !== code) {
    return res.status(400).json({ error: 'Invalid verification code' });
  }

  pendingRegistrations.delete(username);
  res.json({ success: true, verified: true });
});

app.post('/passkeys/list', async (req, res) => {
  const { username } = req.body;
  const users = await loadUsers();
  const user = users[username];

  if (!user) {
    return res.status(400).json({ error: 'User not found' });
  }

  res.json({ passkeys: user.passkeys || [] });
});

app.post('/passkeys/add/start', async (req, res) => {
  const { username } = req.body;
  const users = await loadUsers();
  const user = users[username];

  if (!user) {
    return res.status(400).json({ error: 'User not found' });
  }

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: new Uint8Array(Buffer.from(username)),
    userName: username,
    attestationType: 'none',
    excludeCredentials: user.passkeys.map(passkey => ({
      id: passkey.id,
      transports: passkey.transports,
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });

  user.challenge = options.challenge;
  await saveUsers(users);

  res.json(options);
});

app.post('/passkeys/add/finish', async (req, res) => {
  const { username, credential } = req.body;
  const users = await loadUsers();
  const user = users[username];

  if (!user) {
    return res.status(400).json({ error: 'User not found' });
  }

  try {
    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: user.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (verification.verified && verification.registrationInfo) {
      const { credential: cred, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
      user.passkeys.push({
        id: cred.id,
        publicKey: Array.from(cred.publicKey),
        counter: cred.counter,
        transports: cred.transports,
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
        createdAt: new Date().toISOString(),
      });
      delete user.challenge;
      await saveUsers(users);
      res.json({ verified: true });
    } else {
      res.status(400).json({ error: 'Verification failed' });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/passkeys/delete', async (req, res) => {
  const { username, passkeyId } = req.body;
  const users = await loadUsers();
  const user = users[username];

  if (!user) {
    return res.status(400).json({ error: 'User not found' });
  }

  const initialLength = user.passkeys.length;
  user.passkeys = user.passkeys.filter(p => p.id !== passkeyId);

  if (user.passkeys.length === initialLength) {
    return res.status(400).json({ error: 'Passkey not found' });
  }

  if (user.passkeys.length === 0) {
    return res.status(400).json({ error: 'Cannot delete the last passkey' });
  }

  await saveUsers(users);
  res.json({ success: true });
});

app.post('/register/start', async (req, res) => {
  const { username } = req.body;
  const users = await loadUsers();
  
  const user = users[username] || {
    id: Buffer.from(username).toString('base64url'),
    username,
    passkeys: []
  };

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: new Uint8Array(Buffer.from(username)),
    userName: username,
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });

  user.challenge = options.challenge;
  users[username] = user;
  await saveUsers(users);

  res.json(options);
});

app.post('/register/finish', async (req, res) => {
  const { username, credential } = req.body;
  const users = await loadUsers();
  const user = users[username];

  if (!user) {
    return res.status(400).json({ error: 'User not found' });
  }

  try {
    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: user.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (verification.verified && verification.registrationInfo) {
      const { credential: cred, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
      user.passkeys.push({
        id: cred.id,
        publicKey: Array.from(cred.publicKey),
        counter: cred.counter,
        transports: cred.transports,
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
        createdAt: new Date().toISOString(),
      });
      delete user.challenge;
      await saveUsers(users);
      res.json({ verified: true });
    } else {
      res.status(400).json({ error: 'Verification failed' });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/login/start', async (req, res) => {
  const { username } = req.body;
  const users = await loadUsers();
  const user = users[username];

  if (!user || user.passkeys.length === 0) {
    return res.status(400).json({ error: 'User not found or no passkeys registered' });
  }

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: user.passkeys.map(passkey => ({
      id: passkey.id,
      transports: passkey.transports,
    })),
    userVerification: 'preferred',
  });

  user.challenge = options.challenge;
  await saveUsers(users);

  res.json(options);
});

app.post('/login/finish', async (req, res) => {
  const { username, credential } = req.body;
  const users = await loadUsers();
  const user = users[username];

  if (!user) {
    return res.status(400).json({ error: 'User not found' });
  }

  const passkey = user.passkeys.find(p => p.id === credential.id);
  if (!passkey) {
    return res.status(400).json({ error: 'Passkey not found' });
  }

  try {
    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: user.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: passkey.id,
        publicKey: new Uint8Array(passkey.publicKey),
        counter: passkey.counter,
        transports: passkey.transports,
      },
    });

    if (verification.verified) {
      passkey.counter = verification.authenticationInfo.newCounter;
      delete user.challenge;
      await saveUsers(users);
      res.json({ verified: true, user: { username: user.username, id: user.id } });
    } else {
      res.status(400).json({ error: 'Verification failed' });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
