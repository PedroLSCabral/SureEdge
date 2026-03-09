// ─── GOOGLE AUTH (GIS Token Model) ───────────────────────────────────────────
// Usa Google Identity Services (client-side only, sem redirect).
// Escopo: leitura + escrita na Sheets API.

const CLIENT_ID = '109071945231-8cjn8suelk617jrjpvihmpbfj79tnce1.apps.googleusercontent.com';
const SCOPE     = 'https://www.googleapis.com/auth/spreadsheets';

let _tokenClient = null;
let _token       = null;
let _onSignIn    = null; // callback chamado após login bem-sucedido

// Inicializa o cliente OAuth. Deve ser chamado após o script GSI carregar.
export function initAuth(onSignIn) {
  _onSignIn = onSignIn;
  _tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPE,
    callback: (resp) => {
      if (resp.error) { console.error('Auth error:', resp); return; }
      _token = resp;
      _token._expires = Date.now() + (resp.expires_in - 60) * 1000;
      if (_onSignIn) _onSignIn();
    },
  });
}

// Solicita token (abre popup Google se necessário).
export function signIn() {
  if (!_tokenClient) { console.error('Auth não inicializado'); return; }
  _tokenClient.requestAccessToken({ prompt: '' });
}

// Retorna o access token atual (ou null se expirado/ausente).
export function getToken() {
  if (!_token) return null;
  if (Date.now() > _token._expires) { _token = null; return null; }
  return _token.access_token;
}

export function isSignedIn() { return !!getToken(); }