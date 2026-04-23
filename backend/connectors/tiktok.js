'use strict';
const https = require('https');

const CLIENT_KEY    = process.env.TIKTOK_CLIENT_KEY;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const REDIRECT_URI  = process.env.APP_URL + '/api/connect/tiktok/callback';

function post(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(JSON.stringify(body));
    const u = new URL(url);
    const opts = { hostname: u.hostname, path: u.pathname + u.search, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length, ...headers } };
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
  name: 'TikTok',
  color: '#010101',

  getAuthUrl(state) {
    const params = new URLSearchParams({
      client_key:    CLIENT_KEY,
      redirect_uri:  REDIRECT_URI,
      response_type: 'code',
      scope:         'user.info.basic,user.info.stats',
      state,
    });
    return `https://www.tiktok.com/v2/auth/authorize/?${params}`;
  },

  async exchangeCode(code) {
    const res = await post('https://open.tiktokapis.com/v2/oauth/token/', {
      client_key: CLIENT_KEY, client_secret: CLIENT_SECRET,
      code, grant_type: 'authorization_code', redirect_uri: REDIRECT_URI,
    });
    if (res.error) throw new Error(res.error_description || res.error);
    return res;
  },

  async getStats(access_token) {
    const res = await post(
      'https://open.tiktokapis.com/v2/user/info/?fields=display_name,follower_count,following_count,likes_count,video_count',
      {},
      { Authorization: `Bearer ${access_token}` }
    );
    if (res.error?.code !== 'ok') throw new Error(res.error?.message || 'TikTok API error');
    const u = res.data?.user;
    return {
      username:  u?.display_name || '',
      followers: u?.follower_count || 0,
      likes:     u?.likes_count    || 0,
      videos:    u?.video_count    || 0,
      revenue:   null,
    };
  },
};
