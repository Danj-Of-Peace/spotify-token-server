require('dotenv').config();
const express = require('express');
const request = require('request');
const cors = require('cors');
const querystring = require('querystring');

const app = express();
app.use(cors());

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI;
const frontend_uri = process.env.FRONTEND_URI;

app.get('/callback', (req, res) => {
  const code = req.query.code || null;

  const authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    form: {
      code,
      redirect_uri,
      grant_type: 'authorization_code'
    },
    headers: {
      'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64')
    },
    json: true
  };

  app.get('/refresh', (req, res) => {
    const refresh_token = req.query.refresh_token;
    if (!refresh_token) return res.status(400).json({ error: 'Missing refresh_token' });
  
    const authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64')
      },
      form: {
        grant_type: 'refresh_token',
        refresh_token: refresh_token
      },
      json: true
    };
  
    request.post(authOptions, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        res.json({
          access_token: body.access_token
        });
      } else {
        console.error('Refresh failed:', body);
        res.status(500).json({ error: 'Failed to refresh token' });
      }
    });
  });

  request.post(authOptions, (error, response, body) => {
    if (!error && response.statusCode === 200) {
      const access_token = body.access_token;
      const refresh_token = body.refresh_token;
      res.redirect(`${frontend_uri}#${querystring.stringify({
        access_token,
        refresh_token
      })}`);
    } else {
      res.send('Login failed');
    }
  });
});

const PORT = process.env.PORT || 8888;
app.listen(PORT, () => {
  console.log(`✅ Backend listening on port ${PORT}`);
});