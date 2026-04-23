'use strict';
const https = require('https');

const CLIENT_ID     = process.env.YOUTUBE_CLIENT_ID;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const REDIRECT_URI  = process.env.APP_URL + '/api/connect/youtube/callback';

function get(url, token) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { Authorization: `Bearer ${token}` } }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
  });
}

function post(url, body) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(new URLSearchParams(body).toString());
    const u = new URL(url);
    const options = { hostname: u.hostname, path: u.pathname + u.search, method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': data.length } };
    const req = https.request(options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

module.exports = {
  name: 'YouTube',
  color: '#ff0000',

  getAuthUrl(state) {
    const params = new URLSearchParams({
      client_id:     CLIENT_ID,
      redirect_uri:  REDIRECT_URI,
      response_type: 'code',
      scope:         'https://www.googleapis.com/auth/youtube.readonly',
      access_type:   'offline',
      prompt:        'consent',
      state,
    });
    return `https://accounts.google.com/o/oauth2/auth?${params}`;
  },

  async exchangeCode(code) {
    const tokens = await post('https://oauth2.googleapis.com/token', {
      code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI, grant_type: 'authorization_code',
    });
    if (tokens.error) throw new Error(tokens.error_description || tokens.error);
    return tokens;
  },

  async refreshToken(refresh_token) {
    const tokens = await post('https://oauth2.googleapis.com/token', {
      refresh_token, client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
      grant_type: 'refresh_token',
    });
    if (tokens.error) throw new Error(tokens.error_description || tokens.error);
    return tokens;
  },

  async getStats(access_token) {
    const data = await get(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
      access_token
    );
    if (!data.items || !data.items[0]) throw new Error('Aucune chaîne YouTube trouvée');
    const ch = data.items[0];
    return {
      username:    ch.snippet.title,
      followers:   parseInt(ch.statistics.subscriberCount) || 0,
      views:       parseInt(ch.statistics.viewCount)        || 0,
      video_count: parseInt(ch.statistics.videoCount)       || 0,
      revenue:     null, // YouTube ne donne pas les revenus via API
    };
  },
};
