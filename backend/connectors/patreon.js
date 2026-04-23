'use strict';
const https = require('https');

const CLIENT_ID     = process.env.PATREON_CLIENT_ID;
const CLIENT_SECRET = process.env.PATREON_CLIENT_SECRET;
const REDIRECT_URI  = process.env.APP_URL + '/api/connect/patreon/callback';

function get(url, token) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { Authorization: `Bearer ${token}` } }, res => {
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
  name: 'Patreon',
  color: '#ff424d',

  getAuthUrl(state) {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id:     CLIENT_ID,
      redirect_uri:  REDIRECT_URI,
      scope:         'identity identity[email] campaigns campaigns.members',
      state,
    });
    return `https://www.patreon.com/oauth2/authorize?${params}`;
  },

  async exchangeCode(code) {
    const tokens = await post('https://www.patreon.com/api/oauth2/token', {
      code, grant_type: 'authorization_code',
      client_id: CLIENT_ID, client_secret: CLIENT_SECRET, redirect_uri: REDIRECT_URI,
    });
    if (tokens.error) throw new Error(tokens.error);
    return tokens;
  },

  async refreshToken(refresh_token) {
    const tokens = await post('https://www.patreon.com/api/oauth2/token', {
      refresh_token, grant_type: 'refresh_token',
      client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
    });
    if (tokens.error) throw new Error(tokens.error);
    return tokens;
  },

  async getStats(access_token) {
    const data = await get(
      'https://www.patreon.com/api/oauth2/v2/campaigns?fields[campaign]=patron_count,pledge_sum',
      access_token
    );
    if (!data.data || !data.data[0]) {
      // Fallback: get identity
      const me = await get(
        'https://www.patreon.com/api/oauth2/v2/identity?fields[user]=full_name',
        access_token
      );
      return { username: me.data?.attributes?.full_name || 'Patreon', followers: 0, revenue: 0 };
    }
    const campaign = data.data[0].attributes;
    return {
      username:  'Patreon Campaign',
      followers: campaign.patron_count || 0,
      revenue:   (campaign.pledge_sum || 0) / 100, // en cents → euros
    };
  },
};
