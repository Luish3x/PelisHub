// Partículas
const sparks = document.getElementById('sparks');
for (let i = 0; i < 20; i++) {
  const s = document.createElement('div');
  s.className = 'spark';
  s.style.cssText = 'left:' + (Math.random()*100) + '%;--d:' + (5+Math.random()*8) + 's;--delay:' + (Math.random()*6) + 's;--dx:' + ((Math.random()-0.5)*60) + 'px';
  sparks.appendChild(s);
}

function checkStrength(val) {
  const fill = document.getElementById('strengthFill');
  const text = document.getElementById('strengthText');
  if (!val) { fill.style.width = '0'; text.textContent = ''; return; }

  const criteria = [
    val.length >= 6,
    /[a-z]/.test(val),
    /[A-Z]/.test(val),
    /[0-9]/.test(val),
    /[^a-zA-Z0-9]/.test(val)
  ];
  const score = criteria.filter(Boolean).length;

  const levels = [
    { w: '20%', bg: '#e50914', label: 'Muy débil' },
    { w: '40%', bg: '#e57809', label: 'Débil' },
    { w: '60%', bg: '#e5c009', label: 'Regular' },
    { w: '80%', bg: '#9bc53d', label: 'Buena' },
    { w: '100%', bg: '#46d369', label: 'Excelente' },
  ];
  const l = levels[score - 1] || levels[0];
  fill.style.width = l.w;
  fill.style.background = l.bg;
  text.textContent = l.label;
  text.style.color = l.bg;
}

document.addEventListener('keydown', e => {
  if (e.key === 'Enter') handleRegister();
});

async function handleRegister() {
  const username = document.getElementById('username').value.trim();
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const btn      = document.getElementById('registerBtn');

  document.getElementById('errorMsg').classList.remove('visible');

  if (!username || !email || !password) {
    showError('Por favor completa todos los campos'); return;
  }

  const passErrors = [];
  if (password.length < 6)            passErrors.push('mínimo 6 caracteres');
  if (!/[a-z]/.test(password))        passErrors.push('una minúscula');
  if (!/[A-Z]/.test(password))        passErrors.push('una mayúscula');
  if (!/[0-9]/.test(password))        passErrors.push('un número');
  if (!/[^a-zA-Z0-9]/.test(password)) passErrors.push('un símbolo');

  if (passErrors.length) {
    showError('La contraseña debe tener: ' + passErrors.join(', ')); return;
  }

  btn.classList.add('loading');
  btn.disabled = true;

  try {
    const res = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();
    if (!res.ok) { showError(data.error || 'Error al registrar'); return; }
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
