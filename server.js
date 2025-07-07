// server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

const clientId = '4595aa31219c4fbabf83fe388bf55682';
const clientSecret = '69c9de26bf1c48899e5e933f53dd5b90';

app.use(cors());

let cachedToken = null;
let tokenExpiresAt = 0;

async function getSpotifyToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const response = await axios.post(
    'https://accounts.spotify.com/api/token',
    new URLSearchParams({ grant_type: 'client_credentials' }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization:
          'Basic ' +
          Buffer.from(clientId + ':' + clientSecret).toString('base64'),
      },
    }
  );

  cachedToken = response.data.access_token;
  tokenExpiresAt = Date.now() + response.data.expires_in * 1000 - 10000;
  return cachedToken;
}

app.get('/token', async (req, res) => {
  try {
    const token = await getSpotifyToken();
    res.json({ access_token: token });
  } catch (error) {
    console.error('Error fetching token:', error.message);
    res.status(500).json({ error: 'Failed to fetch token' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🎧 Spotify Token Server running on port ${PORT}`));