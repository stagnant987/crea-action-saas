'use strict';
const https = require('https');

const CLIENT_ID     = process.env.INSTAGRAM_CLIENT_ID;
const CLIENT_SECRET = process.env.INSTAGRAM_CLIENT_SECRET;
const REDIRECT_URI  = process.env.APP_URL + '/api/connect/instagram/callback';

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    }).on('error', reject);
  });
}

function post(url, body) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(new URLSearchParams(body).toString());
    const u = new URL(url);
    const opts = { hostname: u.hostname, path: u.pathname, method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': data.length } };
    const req = https.request(opts, res => {
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
  name: 'Instagram',
  color: '#e1306c',

  getAuthUrl(state) {
    const params = new URLSearchParams({
      client_id:     CLIENT_ID,
      redirect_uri:  REDIRECT_URI,
      scope:         'user_profile,user_media',
      response_type: 'code',
      state,
    });
    return `https://api.instagram.com/oauth/authorize?${params}`;
  },

  async exchangeCode(code) {
    // Step 1: short-lived token
    const short = await post('https://api.instagram.com/oauth/access_token', {
      client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
      grant_type: 'authorization_code', redirect_uri: REDIRECT_URI, code,
    });
    if (short.error_type) throw new Error(short.error_message || short.error_type);

    // Step 2: long-lived token (60 days)
    const long = await get(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${CLIENT_SECRET}&access_token=${short.access_token}`
    );
    return { access_token: long.access_token || short.access_token, expires_in: long.expires_in || 5183944 };
  },

  async getStats(access_token) {
    const data = await get(
      `https://graph.instagram.com/me?fields=id,username,followers_count,media_count&access_token=${access_token}`
    );
    if (data.error) throw new Error(data.error.message);
    return {
      username:    data.username,
      followers:   data.followers_count || 0,
      media_count: data.media_count     || 0,
      revenue:     null,
    };
  },
};
