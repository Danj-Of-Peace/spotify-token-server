require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const querystring = require('querystring');

const app = express();
const port = process.env.PORT || 8888;

app.use(cors());

const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  REDIRECT_URI,
  FRONTEND_URI
} = process.env;

const generateRandomString = length => {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

const stateKey = 'spotify_auth_state';

app.get('/login', (req, res) => {
  const state = generateRandomString(16);
  const scope = 'streaming user-read-email user-read-private user-library-read';

  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: SPOTIFY_CLIENT_ID,
      scope: scope,
      redirect_uri: REDIRECT_URI,
      state: state
    }));
});

app.get('/callback', async (req, res) => {
  const code = req.query.code || null;

  try {
    const tokenResponse = await axios.post('https://accounts.spotify.com/api/token',
      querystring.stringify({
        code: code,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')
        }
      });

    const { access_token, refresh_token } = tokenResponse.data;

    // Redirect back to frontend with access and refresh tokens
    res.redirect(`${FRONTEND_URI}/#${querystring.stringify({
      access_token,
      refresh_token
    })}`);

  } catch (err) {
    console.error('Error getting tokens:', err.response?.data || err);
    res.send('Error retrieving access token');
  }
});

app.get('/refresh_token', async (req, res) => {
  const refresh_token = req.query.refresh_token;

  try {
    const response = await axios.post('https://accounts.spotify.com/api/token',
      querystring.stringify({
        grant_type: 'refresh_token',
        refresh_token: refresh_token
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')
        }
      });

    res.json({ access_token: response.data.access_token });
  } catch (err) {
    console.error('Error refreshing token:', err.response?.data || err);
    res.status(400).json({ error: 'Failed to refresh token' });
  }
});

app.listen(port, () => {
  console.log(`Spotify auth server listening on port ${port}`);
});