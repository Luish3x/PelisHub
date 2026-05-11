/* ═══════════════════════════════════════════
   PELISHUB — NAV.JS
   Funciones compartidas: navbar y logout
═══════════════════════════════════════════ */

const API = 'http://localhost:3000/api';

async function loadNav(options = {}) {
    const {
        activePage = '',       // 'home' | 'about' | 'contact'
        transparent = false    // true para el home (navbar transparente)
    } = options;

    const navbar = document.getElementById('navbar');
    if (transparent) navbar.classList.add('transparent');

    // Links activos
    const links = [
        { href: '/', label: 'Inicio', key: 'home' },
        { href: '/pages/about.html', label: 'Nosotros', key: 'about' },
        { href: '/pages/contact.html', label: 'Contacto', key: 'contact' },
    ];

    const navLinksHtml = links.map(l =>
        '<a href="' + l.href + '" class="nav-link' + (activePage === l.key ? ' active' : '') + '">' + l.label + '</a>'
    ).join('');

    document.getElementById('navLinks').innerHTML = navLinksHtml;

    // Usuario
    try {
        const res = await fetch(API + '/auth/me', { credentials: 'include' });
        const navRight = document.getElementById('navRight');

        if (res.ok) {
            const user = await res.json();
            navRight.innerHTML =
                '<a href="/pages/profile.html" class="nav-user">Hola, <span class="nav-username">' + user.username + '</span></a>' +
                (user.role === 'admin' ? '<a href="/pages/admin.html" class="nav-btn ghost">Admin</a>' : '') +
                '<button class="nav-btn ghost" onclick="logout()">Salir</button>';
        } else {
            const redirect = encodeURIComponent(window.location.href);
            navRight.innerHTML =
                '<a href="/pages/login.html?redirect=' + redirect + '" class="nav-btn ghost">Iniciar sesión</a>' +
                '<a href="/pages/register.html" class="nav-btn">Registrarse</a>';
        }
    } catch (e) {
        document.getElementById('navRight').innerHTML =
            '<a href="/pages/login.html" class="nav-btn ghost">Iniciar sesión</a>' +
            '<a href="/pages/register.html" class="nav-btn">Registrarse</a>';
    }
}

async function logout() {
    await fetch(API + '/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/';
}

// Flash compartido
function showFlash(msg, type = 'success') {
    const el = document.getElementById('flash');
    if (!el) return;
    el.textContent = msg;
    el.className = 'flash ' + type + ' show';
    setTimeout(() => el.classList.remove('show'), 3000);
}

// Scroll navbar
window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;
    navbar.classList.toggle('scrolled', window.scrollY > 20);
});
