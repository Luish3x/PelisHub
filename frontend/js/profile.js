
const TMDB_IMG = 'https://image.tmdb.org/t/p/w92';
let allReviews = [];
let currentFilter = 'all';
let editRatings = {};

function starsHtml(n) {
    return '★'.repeat(n) + '☆'.repeat(5 - n);
}

function formatDate(str) {
    return new Date(str).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
}

function timeAgo(str) {
    const diff = Date.now() - new Date(str);
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'ahora';
    if (m < 60) return 'hace ' + m + 'm';
    const h = Math.floor(m / 60);
    if (h < 24) return 'hace ' + h + 'h';
    return 'hace ' + Math.floor(h / 24) + 'd';
}


// ── Perfil ──
async function loadProfile() {
    try {
        const res = await fetch(API + '/profile', { credentials: 'include' });
        if (!res.ok) { window.location.href = '/pages/login.html'; return; }
        const u = await res.json();

        document.getElementById('avatar').textContent = u.username[0].toUpperCase();
        document.getElementById('profileUsername').textContent = u.username;
        document.getElementById('profileEmail').textContent = u.email;
        document.getElementById('profileDate').textContent = formatDate(u.created_at);
        document.getElementById('profileBadge').innerHTML =
            '<span class="badge ' + u.role + '">' + u.role + '</span>';
        document.getElementById('newUsername').placeholder = u.username;
    } catch (e) { window.location.href = '/pages/login.html'; }
}

// ── Reseñas ──
async function loadReviews() {
    try {
        const res = await fetch(API + '/profile/reviews', { credentials: 'include' });
        allReviews = await res.json();
        updateStats();
        renderReviews();
    } catch (e) { }
}

function updateStats() {
    const visible = allReviews.filter(r => !r.is_hidden).length;
    const hidden = allReviews.filter(r => r.is_hidden).length;
    document.getElementById('statTotal').textContent = allReviews.length;
    document.getElementById('statVisible').textContent = visible;
    document.getElementById('statHidden').textContent = hidden;
}

function setFilter(filter, btn) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderReviews();
}

function renderReviews() {
    const filtered = allReviews.filter(r => {
        if (currentFilter === 'visible') return !r.is_hidden;
        if (currentFilter === 'hidden') return r.is_hidden;
        return true;
    });

    document.getElementById('reviewsCount').textContent =
        filtered.length + ' reseña' + (filtered.length !== 1 ? 's' : '');

    const list = document.getElementById('reviewsList');

    if (!filtered.length) {
        list.innerHTML = '<div class="empty"><span>🎬</span>No tienes reseñas en esta categoría</div>';
        return;
    }

    list.innerHTML = filtered.map(function(r) {
        const poster = r.poster_url
            ? '<img class="review-poster" src="' + r.poster_url + '" alt="' + r.movie_title + '" onerror="this.style.display=\'none\'">'
            : '<div class="review-poster-placeholder">🎬</div>';

        const reactionChips = Object.entries(r.reactions || {})
            .filter(([, v]) => v > 0)
            .map(function(entry) {
                const emojis = { like: '👍', dislike: '👎', helpful: '💡', funny: '😂' };
                return '<span class="reaction-chip">' + (emojis[entry[0]] || '') + ' ' + entry[1] + '</span>';
            }).join('');

        const hiddenBadge = r.is_hidden
            ? '<div class="hidden-badge">🔒 Oculta — solo tú la ves</div>' : '';

        return '<div class="review-card" id="pcard-' + r.id + '">' +
            poster +
            '<div class="review-body">' +
            '<div class="review-top">' +
            '<div>' +
            '<a class="review-movie" href="/pages/movie.html?id=' + r.tmdb_id + '">' + r.movie_title + '</a>' +
            '<div class="review-movie-meta">' + timeAgo(r.created_at) + '</div>' +
            '</div>' +
            '<span class="review-stars">' + starsHtml(r.rating) + '</span>' +
            '</div>' +
            hiddenBadge +
            '<p class="review-content" id="pcontent-' + r.id + '">' + r.content + '</p>' +
            (reactionChips ? '<div class="review-reactions">' + reactionChips + '</div>' : '') +
            '<div class="review-actions" id="pactions-' + r.id + '">' +
            '<button class="act-btn" onclick="startEdit(' + r.id + ',' + r.rating + ')">Editar</button>' +
            '<button class="act-btn ' + (r.is_hidden ? 'warn' : '') + '" onclick="toggleHide(' + r.id + ',' + r.is_hidden + ')">' +
            (r.is_hidden ? 'Mostrar' : 'Ocultar') +
            '</button>' +
            '<button class="act-btn danger" onclick="deleteReview(' + r.id + ')">Eliminar</button>' +
            '</div>' +
            '<div id="pedit-' + r.id + '"></div>' +
            '</div>' +
            '</div>';
    }).join('');
}

// ── Editar ──
function startEdit(id, currentRating) {
    editRatings[id] = currentRating;
    const editWrap = document.getElementById('pedit-' + id);
    const contentEl = document.getElementById('pcontent-' + id);
    const actionsEl = document.getElementById('pactions-' + id);

    if (editWrap.innerHTML) { cancelEdit(id); return; }

    const originalText = contentEl.textContent.trim();
    contentEl.style.display = 'none';
    actionsEl.style.display = 'none';

    editWrap.innerHTML =
        '<div class="edit-area">' +
        '<div class="edit-stars">' +
        [1, 2, 3, 4, 5].map(n =>
            '<button class="star-btn ' + (n <= currentRating ? 'active' : '') + '" ' +
            'onclick="setEditRating(' + id + ',' + n + ')">★</button>'
        ).join('') +
        '</div>' +
        '<textarea class="edit-textarea" id="pedit-text-' + id + '">' + originalText + '</textarea>' +
        '<div class="edit-footer">' +
        '<button class="act-btn" onclick="cancelEdit(' + id + ')">Cancelar</button>' +
        '<button class="btn" style="padding:8px 18px;font-size:0.82rem" onclick="saveEdit(' + id + ')">Guardar</button>' +
        '</div>' +
        '</div>';
}

function setEditRating(id, n) {
    editRatings[id] = n;
    const wrap = document.getElementById('pedit-' + id);
    wrap.querySelectorAll('.star-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.n || btn.textContent) <= n);
    });
    // marcar estrellas por posición
    const stars = wrap.querySelectorAll('.star-btn');
    stars.forEach((btn, i) => btn.classList.toggle('active', i < n));
}

function cancelEdit(id) {
    document.getElementById('pedit-' + id).innerHTML = '';
    document.getElementById('pcontent-' + id).style.display = '';
    document.getElementById('pactions-' + id).style.display = '';
}

async function saveEdit(id) {
    const content = document.getElementById('pedit-text-' + id).value.trim();
    const rating = editRatings[id];
    if (!content) { showFlash('La reseña no puede estar vacía', 'error'); return; }
    if (!rating) { showFlash('Selecciona una calificación', 'error'); return; }
    try {
        const res = await fetch(API + '/reviews/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ content, rating })
        });
        if (!res.ok) { showFlash('Error al guardar', 'error'); return; }
        showFlash('Reseña actualizada');
        loadReviews();
    } catch (e) { showFlash('Error al guardar', 'error'); }
}

// ── Ocultar / Mostrar ──
async function toggleHide(id, isHidden) {
    try {
        const res = await fetch(API + '/reviews/' + id, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ is_hidden: !isHidden })
        });
        if (res.ok) { showFlash(isHidden ? 'Reseña visible' : 'Reseña oculta'); loadReviews(); }
    } catch (e) { }
}

// ── Eliminar ──
async function deleteReview(id) {
    if (!confirm('¿Eliminar esta reseña permanentemente?')) return;
    try {
        const res = await fetch(API + '/reviews/' + id, {
            method: 'DELETE', credentials: 'include'
        });
        if (res.ok) { showFlash('Reseña eliminada'); loadReviews(); }
    } catch (e) { }
}

// ── Cambiar username ──
async function changeUsername() {
    const username = document.getElementById('newUsername').value.trim();
    if (!username) { showFlash('Escribe un username', 'error'); return; }
    try {
        const res = await fetch(API + '/profile/username', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username })
        });
        const data = await res.json();
        if (!res.ok) { showFlash(data.error, 'error'); return; }
        showFlash('Username actualizado');
        loadProfile();
        document.getElementById('newUsername').value = '';
    } catch (e) { showFlash('Error', 'error'); }
}

// ── Cambiar contraseña ──
async function changePassword() {
    const current_password = document.getElementById('currentPass').value;
    const new_password = document.getElementById('newPass').value;
    if (!current_password || !new_password) { showFlash('Completa ambos campos', 'error'); return; }
    try {
        const res = await fetch(API + '/profile/password', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ current_password, new_password })
        });
        const data = await res.json();
        if (!res.ok) { showFlash(data.error, 'error'); return; }
        showFlash('Contraseña actualizada');
        document.getElementById('currentPass').value = '';
        document.getElementById('newPass').value = '';
    } catch (e) { showFlash('Error', 'error'); }
}

// ── Init ──
async function init() {
    await loadNav({ activePage: '' });
    await loadProfile();
    await loadReviews();
}

document.addEventListener('DOMContentLoaded', async function() {
    await init();
});
