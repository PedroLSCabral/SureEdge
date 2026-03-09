// ─── GOOGLE AUTH (GIS Token Model) ───────────────────────────────────────────
// Usa Google Identity Services (client-side only, sem redirect).
// Escopo: leitura + escrita na Sheets API.

const CLIENT_ID   = '109071945231-8cjn8suelk617jrjpvihmpbfj79tnce1.apps.googleusercontent.com';
const SCOPE       = 'https://www.googleapis.com/auth/spreadsheets';
const SESSION_KEY = 'surebetAuthToken';

let _tokenClient = null;
let _token       = null;
let _onSignIn    = null;

// ─── PERSISTÊNCIA ─────────────────────────────────────────────────────────────
function saveToken(resp) {
  _token = { ...resp, _expires: Date.now() + (resp.expires_in - 60) * 1000 };
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(_token));
  } catch {}
}

function restoreToken() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const t = JSON.parse(raw);
    if (Date.now() > t._expires) { sessionStorage.removeItem(SESSION_KEY); return false; }
    _token = t;
    return true;
  } catch { return false; }
}

export function clearAuthToken() {
  _token = null;
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
export function initAuth(onSignIn) {
  _onSignIn = onSignIn;
  if (typeof google === 'undefined' || !google.accounts) {
    window.addEventListener('load', () => initAuth(onSignIn), { once: true });
    return;
  }

  _tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPE,
    callback: (resp) => {
      if (resp.error) { console.error('Auth error:', resp); return; }
      saveToken(resp);
      if (_onSignIn) _onSignIn();
    },
  });

  // Tenta restaurar token da sessão atual
  if (restoreToken()) {
    if (_onSignIn) _onSignIn();
    return;
  }

  // Token não encontrado — tenta silent refresh (sem popup) se usuário já autorizou antes
  const hadAuth = localStorage.getItem('surebetHadAuth');
  if (hadAuth) {
    _tokenClient.requestAccessToken({ prompt: '' });
  }
}

// ─── SIGN IN ──────────────────────────────────────────────────────────────────
export function signIn() {
  if (!_tokenClient) { console.error('Auth não inicializado'); return; }
  localStorage.setItem('surebetHadAuth', '1');
  _tokenClient.requestAccessToken({ prompt: '' });
}

// ─── TOKEN ────────────────────────────────────────────────────────────────────
export function getToken() {
  if (!_token) return null;
  if (Date.now() > _token._expires) {
    clearAuthToken();
    return null;
  }
  return _token.access_token;
}

export function isSignedIn() { return !!getToken(); }