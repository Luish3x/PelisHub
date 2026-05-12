/* ═══════════════════════════════════════════
   PELISHUB — NAV.JS
   Funciones compartidas: navbar y logout
═══════════════════════════════════════════ */

const API = 'http://localhost:3000/api';

async function loadNav(options = {}) {
    const {
        activePage = '',
        transparent = false
    } = options;

    const navbar = document.getElementById('navbar');
    if (transparent) navbar.classList.add('transparent');

    // Links de navegación
    const links = [
        { href: '/',                   label: 'Inicio',   key: 'home' },
        { href: '/pages/about.html',   label: 'Nosotros', key: 'about' },
        { href: '/pages/contact.html', label: 'Contacto', key: 'contact' },
    ];

    const navLinksHtml = links.map(l =>
        '<a href="' + l.href + '" class="nav-link' + (activePage === l.key ? ' active' : '') + '">' + l.label + '</a>'
    ).join('');

    // Usuario
    let userHtml = '';
    try {
        const res = await fetch(API + '/auth/me', { credentials: 'include' });
        const navRight = document.getElementById('navRight');

        if (res.ok) {
            const user = await res.json();
            userHtml =
                '<a href="/pages/profile.html" class="nav-user">Hola, <span class="nav-username">' + user.username + '</span></a>' +
                (user.role === 'admin' ? '<a href="/pages/admin.html" class="nav-btn ghost">Admin</a>' : '') +
                '<button class="nav-btn ghost" onclick="logout()">Salir</button>';
        } else {
            const redirect = encodeURIComponent(window.location.href);
            userHtml =
                '<a href="/pages/login.html?redirect=' + redirect + '" class="nav-btn ghost">Iniciar sesión</a>' +
                '<a href="/pages/register.html" class="nav-btn">Registrarse</a>';
        }
        navRight.innerHTML = userHtml;
    } catch(e) {
        const redirect = encodeURIComponent(window.location.href);
        userHtml =
            '<a href="/pages/login.html?redirect=' + redirect + '" class="nav-btn ghost">Iniciar sesión</a>' +
            '<a href="/pages/register.html" class="nav-btn">Registrarse</a>';
        document.getElementById('navRight').innerHTML = userHtml;
    }

    // Llenar navLinks + agregar userHtml al final para móvil
    document.getElementById('navLinks').innerHTML =
        navLinksHtml +
        '<div class="nav-mobile-user">' + userHtml + '</div>';

    initHamburger();
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

// ── Hamburguesa ──
function initHamburger() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;

    // Crear botón hamburguesa
    const btn = document.createElement('button');
    btn.className = 'nav-hamburger';
    btn.id = 'hamburger';
    btn.innerHTML = '<span></span><span></span><span></span>';
    btn.addEventListener('click', toggleMenu);
    navbar.appendChild(btn);
}

function toggleMenu() {
    const links = document.getElementById('navLinks');
    const burger = document.getElementById('hamburger');
    if (!links || !burger) return;
    links.classList.toggle('open');
    burger.classList.toggle('open');
}

// Cerrar menú al hacer click en un link
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('nav-link')) {
        const links = document.getElementById('navLinks');
        const burger = document.getElementById('hamburger');
        if (links) links.classList.remove('open');
        if (burger) burger.classList.remove('open');
    }
});
