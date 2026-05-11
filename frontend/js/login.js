// Generar partículas
const sparks = document.getElementById('sparks');
for (let i = 0; i < 20; i++) {
  const s = document.createElement('div');
  s.className = 'spark';
  s.style.cssText = 'left:' + (Math.random()*100) + '%;--d:' + (5+Math.random()*8) + 's;--delay:' + (Math.random()*6) + 's;--dx:' + ((Math.random()-0.5)*60) + 'px';
  sparks.appendChild(s);
}

document.addEventListener('keydown', e => {
  if (e.key === 'Enter') handleLogin();
});

async function handleLogin() {
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const btn      = document.getElementById('loginBtn');

  document.getElementById('errorMsg').classList.remove('visible');

  if (!email || !password) {
    showError('Por favor completa todos los campos'); return;
  }

  btn.classList.add('loading');
  btn.disabled = true;

  try {
    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) { showError(data.error || 'Error al iniciar sesión'); return; }
    const redirect = new URLSearchParams(window.location.search).get('redirect');
    window.location.href = redirect || '/';
  } catch(err) {
    showError('No se pudo conectar al servidor');
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

function showError(msg) {
  const el = document.getElementById('errorMsg');
  el.textContent = msg;
  el.classList.add('visible');
}
