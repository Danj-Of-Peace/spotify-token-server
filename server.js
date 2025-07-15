require('dotenv').config();
const express = require('express');
const request = require('request');
const cors = require('cors');
const querystring = require('querystring');
// const { initializeApp, getDatabase, ref, set } = require('firebase-admin'); // Optional: for auto-updating Firebase

const app = express();
app.use(cors());
app.use(express.json());

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI;
const frontend_uri = process.env.FRONTEND_URI;

// OPTIONAL: Uncomment if you want the backend to update Firebase
/*
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL
});

const db = admin.database();
*/

// === ✅ Health check route (for Wake Server button) ===
app.get('/', (req, res) => {
  res.status(200).send('🎵 Spotify Token Server is awake');
});

// === STEP 1: Login Callback ===
app.get('/callback', (req, res) => {
  const code = req.query.code;

  if (!code) return res.status(400).send('Missing authorization code.');

  const authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    form: {
      code,
      redirect_uri,
      grant_type: 'authorization_code',
    },
    headers: {
      Authorization: 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
    },
    json: true,
  };

  request.post(authOptions, (error, response, body) => {
    if (error || response.statusCode !== 200) {
      console.error('Callback token exchange failed:', body);
      return res.status(500).send('Token exchange failed.');
    }

    const { access_token, refresh_token } = body;

    res.redirect(`${frontend_uri}#${querystring.stringify({
      access_token,
      refresh_token,
    })}`);
  });
});

// === STEP 2: Refresh Token Endpoint ===
app.get('/refresh', (req, res) => {
  const refresh_token = req.query.refresh_token;
  if (!refresh_token) return res.status(400).json({ error: 'Missing refresh_token' });

  const authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: {
      Authorization: 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
    },
    form: {
      grant_type: 'refresh_token',
      refresh_token,
    },
    json: true,
  };

  request.post(authOptions, async (error, response, body) => {
    if (error || response.statusCode !== 200) {
      console.error('🔴 Refresh token failed:', body || error);
      return res.status(500).json({ error: 'Failed to refresh token' });
    }

    const access_token = body.access_token;
    res.json({ access_token });

    // OPTIONAL: Auto-update Firebase with the new token
    /*
    try {
      await db.ref('spotifyAccessToken').set(access_token);
      console.log('✅ Updated spotifyAccessToken in Firebase');
    } catch (err) {
      console.error('🔴 Failed to update Firebase token:', err);
    }
    */
  });
});

// === Start Server ===
const PORT = process.env.PORT || 8888;
app.listen(PORT, () => {
  console.log(`✅ Backend listening on port ${PORT}`);
});