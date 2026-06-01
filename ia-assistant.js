const CA_RESPONSES = {
  bienvenue: `Bonjour ! Je suis **ARIA**, ton assistant IA CRÉA-ACTION. Je suis là pour t'aider à configurer ta plateforme et maximiser tes revenus créateur. Par où veux-tu commencer ?`,
  aide: [
    "👋 **Premiers pas** — Connecte d'abord une plateforme (YouTube, TikTok ou Instagram)",
    "📊 **Dashboard** — Vue d'ensemble de tous tes revenus et stats",
    "🎬 **YouTube** — Gère ta chaîne et tes vidéos",
    "🎵 **TikTok** — Suis tes vues et tendances",
    "📸 **Instagram** — Posts, Reels et Stories",
    "🎯 **Objectifs** — Définis tes cibles mensuelles",
  ],
  commandes: {
    "comment connecter": "Pour connecter une plateforme, dis-moi laquelle : **YouTube**, **TikTok** ou **Instagram** — je t'y emmène directement.",
    "revenus": "Tes revenus s'affichent sur le **Dashboard** une fois tes plateformes connectées. <a href='dashboard.html' style='color:#7c5cfc;'>→ Aller au Dashboard</a>",
    "youtube": "<a href='youtube.html' style='color:#ff4444;font-weight:700;'>→ Ouvrir YouTube Studio</a> — connecte ta chaîne Google pour voir tes stats en temps réel.",
    "tiktok": "<a href='tiktok.html' style='color:#fe2c55;font-weight:700;'>→ Ouvrir TikTok Studio</a> — connecte ton compte TikTok pour suivre tes vues et revenus.",
    "instagram": "<a href='instagram.html' style='color:#dd2a7b;font-weight:700;'>→ Ouvrir Instagram Studio</a> — connecte via Meta pour voir tes posts et reels.",
    "dashboard": "<a href='dashboard.html' style='color:#7c5cfc;font-weight:700;'>→ Aller au Dashboard</a> — vue d'ensemble de toutes tes plateformes.",
    "objectifs": "Tu peux définir tes cibles : abonnés, revenus mensuels, vues. Dis-moi tes objectifs et je t'aide à les configurer.",
    "studio": "Le **Studio Vidéo** centralise toutes tes vidéos. Connecte d'abord une plateforme pour qu'il se remplisse.",
    "bonjour": "Bonjour ! Je suis **ARIA**, ton opérateur CRÉA-ACTION. Dis-moi ce que tu veux faire — je m'occupe de tout. 🚀",
    "merci": "Avec plaisir ! Je suis là 24h/24. 🚀",
    "aide": "Je peux t'emmener sur : <br><a href='youtube.html' style='color:#ff4444;'>🎬 YouTube</a> · <a href='tiktok.html' style='color:#fe2c55;'>🎵 TikTok</a> · <a href='instagram.html' style='color:#dd2a7b;'>📸 Instagram</a> · <a href='dashboard.html' style='color:#7c5cfc;'>📊 Dashboard</a>",
  }
};

function createARIA() {
  const widget = document.createElement('div');
  widget.id = 'aria-widget';
  widget.innerHTML = `
    <div id="aria-bubble" title="Parle à ARIA">
      <span id="aria-avatar">✦</span>
      <span id="aria-notif">1</span>
    </div>
    <div id="aria-panel">
      <div id="aria-header">
        <div id="aria-header-info">
          <div id="aria-status-dot"></div>
          <div>
            <div id="aria-name">ARIA</div>
            <div id="aria-desc">Assistant CRÉA-ACTION</div>
          </div>
        </div>
        <button id="aria-close">✕</button>
      </div>
      <div id="aria-messages">
        <div class="aria-msg aria-bot">
          <div class="aria-bubble-msg">${CA_RESPONSES.bienvenue}</div>
        </div>
        <div class="aria-msg aria-bot">
          <div class="aria-bubble-msg aria-suggestions">
            ${CA_RESPONSES.aide.map(a => `<div class="aria-suggest">${a}</div>`).join('')}
          </div>
        </div>
      </div>
      <div id="aria-input-row">
        <input id="aria-input" type="text" placeholder="Pose ta question à ARIA…" autocomplete="off"/>
        <button id="aria-send">→</button>
      </div>
    </div>
  `;
  document.body.appendChild(widget);
  injectARIAStyles();
  bindARIA();
}

function injectARIAStyles() {
  const s = document.createElement('style');
  s.textContent = `
    #aria-widget { position:fixed; bottom:28px; right:28px; z-index:9999; font-family:'Segoe UI',system-ui,sans-serif; }

    #aria-bubble {
      width:56px; height:56px; border-radius:50%;
      background:linear-gradient(135deg,#7c5cfc,#c45cf6);
      display:flex; align-items:center; justify-content:center;
      cursor:pointer; box-shadow:0 8px 30px rgba(124,92,252,0.5);
      transition:transform 0.2s,box-shadow 0.2s;
      position:relative;
    }
    #aria-bubble:hover { transform:scale(1.1); box-shadow:0 12px 40px rgba(124,92,252,0.7); }
    #aria-avatar { font-size:22px; color:#fff; }
    #aria-notif {
      position:absolute; top:-4px; right:-4px;
      background:#ff4f4f; color:#fff;
      font-size:10px; font-weight:800;
      width:18px; height:18px; border-radius:50%;
      display:flex; align-items:center; justify-content:center;
    }

    #aria-panel {
      display:none; flex-direction:column;
      position:absolute; bottom:70px; right:0;
      width:340px; height:480px;
      background:#12121a; border:1px solid #2a2a3a;
      border-radius:16px; overflow:hidden;
      box-shadow:0 20px 60px rgba(0,0,0,0.6);
      animation:ariaIn 0.25s ease;
    }
    @keyframes ariaIn {
      from { opacity:0; transform:translateY(16px) scale(0.97); }
      to   { opacity:1; transform:translateY(0) scale(1); }
    }
    #aria-panel.open { display:flex; }

    #aria-header {
      display:flex; align-items:center; justify-content:space-between;
      padding:14px 16px;
      background:linear-gradient(135deg,rgba(124,92,252,0.15),rgba(196,92,246,0.08));
      border-bottom:1px solid #2a2a3a;
    }
    #aria-header-info { display:flex; align-items:center; gap:10px; }
    #aria-status-dot { width:8px; height:8px; border-radius:50%; background:#22d3a5; flex-shrink:0; }
    #aria-name { font-size:15px; font-weight:800; color:#e8e8f0; }
    #aria-desc { font-size:11px; color:#7070a0; }
    #aria-close { background:none; border:none; color:#7070a0; font-size:16px; cursor:pointer; transition:color 0.2s; }
    #aria-close:hover { color:#e8e8f0; }

    #aria-messages {
      flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:12px;
      scrollbar-width:thin; scrollbar-color:#2a2a3a transparent;
    }
    .aria-msg { display:flex; }
    .aria-bot { justify-content:flex-start; }
    .aria-user { justify-content:flex-end; }

    .aria-bubble-msg {
      max-width:85%; padding:10px 14px; border-radius:12px;
      font-size:13px; line-height:1.6; color:#e8e8f0;
    }
    .aria-bot .aria-bubble-msg { background:#1a1a24; border:1px solid #2a2a3a; border-bottom-left-radius:4px; }
    .aria-user .aria-bubble-msg { background:linear-gradient(135deg,#7c5cfc,#c45cf6); border-bottom-right-radius:4px; color:#fff; }

    .aria-suggestions { display:flex; flex-direction:column; gap:6px; background:transparent !important; border:none !important; padding:0 !important; }
    .aria-suggest {
      background:#1a1a24; border:1px solid #2a2a3a;
      padding:8px 12px; border-radius:8px; font-size:12px;
      cursor:pointer; transition:border-color 0.2s,background 0.2s;
    }
    .aria-suggest:hover { border-color:#7c5cfc; background:rgba(124,92,252,0.08); }

    #aria-input-row {
      display:flex; gap:8px; padding:12px 14px;
      border-top:1px solid #2a2a3a; background:#0a0a0f;
    }
    #aria-input {
      flex:1; background:#1a1a24; border:1px solid #2a2a3a;
      color:#e8e8f0; border-radius:8px; padding:9px 12px; font-size:13px;
      outline:none; transition:border-color 0.2s;
    }
    #aria-input:focus { border-color:#7c5cfc; }
    #aria-send {
      background:linear-gradient(135deg,#7c5cfc,#c45cf6);
      color:#fff; border:none; border-radius:8px;
      padding:9px 14px; cursor:pointer; font-size:16px;
      transition:opacity 0.2s;
    }
    #aria-send:hover { opacity:0.85; }

    .aria-typing { display:flex; gap:4px; padding:10px 14px; }
    .aria-dot { width:6px; height:6px; border-radius:50%; background:#7c5cfc; animation:ariaDot 1.2s infinite; }
    .aria-dot:nth-child(2) { animation-delay:0.2s; }
    .aria-dot:nth-child(3) { animation-delay:0.4s; }
    @keyframes ariaDot { 0%,80%,100%{transform:scale(0.7);opacity:0.4} 40%{transform:scale(1);opacity:1} }
  `;
  document.head.appendChild(s);
}

function bindARIA() {
  const bubble = document.getElementById('aria-bubble');
  const panel  = document.getElementById('aria-panel');
  const close  = document.getElementById('aria-close');
  const input  = document.getElementById('aria-input');
  const send   = document.getElementById('aria-send');
  const notif  = document.getElementById('aria-notif');
  const msgs   = document.getElementById('aria-messages');

  bubble.addEventListener('click', () => {
    panel.classList.toggle('open');
    notif.style.display = 'none';
  });
  close.addEventListener('click', () => panel.classList.remove('open'));

  document.querySelectorAll('.aria-suggest').forEach(s => {
    s.addEventListener('click', () => handleSuggest(s.textContent));
  });

  send.addEventListener('click', sendMessage);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });

  function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    addMessage(text, 'user');
    input.value = '';
    showTyping();
    setTimeout(() => {
      removeTyping();
      addMessage(getResponse(text), 'bot');
    }, 900);
  }

  function handleSuggest(text) {
    addMessage(text, 'user');
    showTyping();
    setTimeout(() => {
      removeTyping();
      addMessage(getResponse(text), 'bot');
    }, 900);
  }

  function addMessage(text, who) {
    const div = document.createElement('div');
    div.className = `aria-msg aria-${who}`;
    div.innerHTML = `<div class="aria-bubble-msg">${text.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')}</div>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function showTyping() {
    const t = document.createElement('div');
    t.id = 'aria-typing-ind';
    t.className = 'aria-msg aria-bot';
    t.innerHTML = `<div class="aria-bubble-msg aria-typing"><div class="aria-dot"></div><div class="aria-dot"></div><div class="aria-dot"></div></div>`;
    msgs.appendChild(t);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function removeTyping() {
    const t = document.getElementById('aria-typing-ind');
    if (t) t.remove();
  }

  function getResponse(text) {
    const t = text.toLowerCase();
    for (const [key, val] of Object.entries(CA_RESPONSES.commandes)) {
      if (t.includes(key)) return val;
    }
    if (t.includes('sert') || t.includes('quoi') || t.includes('fais') || t.includes('utilit')) {
      return "Je suis **ARIA**, l'assistante de CRÉA-ACTION. Je te guide sur la plateforme : accéder à YouTube, TikTok, Instagram, voir tes revenus, gérer tes vidéos. Dis-moi ce que tu veux faire !";
    }
    if (t.includes('bien') || t.includes('super') || t.includes('top') || t.includes('parfait')) {
      return "Content que ça te plaise ! Qu'est-ce qu'on fait maintenant ? 🚀";
    }
    if (t.includes('qui') || t.includes('tu es') || t.includes('t\'es')) {
      return "Je suis **ARIA**, l'intelligence artificielle de CRÉA-ACTION. Je suis ton opérateur principal — je t'aide à naviguer et gérer toutes tes plateformes créateur.";
    }
    if (t.includes('salut') || t.includes('allo') || t.includes('hello') || t.includes('coucou')) {
      return "Salut ! Je suis **ARIA**. Dis-moi ce que tu veux faire — YouTube, TikTok, Instagram, revenus ou stats ?";
    }
    if (t.includes('plateforme') || t.includes('connecter') || t.includes('lier')) {
      return "Tu veux connecter une plateforme ? Dis-moi laquelle : <a href='youtube.html' style='color:#ff4444;font-weight:700;'>YouTube</a> · <a href='tiktok.html' style='color:#fe2c55;font-weight:700;'>TikTok</a> · <a href='instagram.html' style='color:#dd2a7b;font-weight:700;'>Instagram</a>";
    }
    return "Je n'ai pas compris. Tu peux me demander : **YouTube**, **TikTok**, **Instagram**, **mes revenus**, ou **studio vidéo**.";
  }
}

document.addEventListener('DOMContentLoaded', createARIA);
