
let allUsers = [];
let allReviews = [];

function formatDate(str) {
    return new Date(str).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function starsHtml(n) {
    return '★'.repeat(n) + '☆'.repeat(5 - n);
}

// ── Verificar que es admin ──
async function checkAdmin() {
    const res = await fetch(API + '/auth/me', { credentials: 'include' });
    if (!res.ok) { window.location.href = '/pages/login.html'; return; }
    const user = await res.json();
    if (user.role !== 'admin') { window.location.href = '/'; }
}

// ── Tabs ──
function switchTab(name, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + name).classList.add('active');
}

// ── Stats ──
async function loadStats() {
    try {
        const res = await fetch(API + '/admin/stats', { credentials: 'include' });
        const s = await res.json();
        const cards = document.querySelectorAll('.stat-card');
        const values = [s.users, s.reviews, s.movies, s.hidden];
        cards.forEach((card, i) => {
            card.querySelector('.stat-value').textContent = values[i];
        });
    } catch (e) { }
}

// ── Usuarios ──
async function loadUsers() {
    try {
        const res = await fetch(API + '/admin/users', { credentials: 'include' });
        allUsers = await res.json();
        renderUsers(allUsers);
    } catch (e) { }
}

function renderUsers(users) {
    document.getElementById('usersCount').textContent = users.length + ' usuarios';
    const body = document.getElementById('usersBody');

    if (!users.length) {
        body.innerHTML = '<tr><td colspan="8"><div class="empty"><span>👤</span>Sin usuarios</div></td></tr>';
        return;
    }

    body.innerHTML = users.map(u => {
        return '<tr>' +
            '<td style="color:var(--muted)">#' + u.id + '</td>' +
            '<td><strong>' + u.username + '</strong></td>' +
            '<td style="color:var(--muted)">' + u.email + '</td>' +
            '<td><span class="badge ' + u.role + '">' + u.role + '</span></td>' +
            '<td><span class="badge ' + (u.is_active ? 'active' : 'inactive') + '">' + (u.is_active ? 'Activo' : 'Inactivo') + '</span></td>' +
            '<td style="color:var(--muted)">' + u.review_count + '</td>' +
            '<td style="color:var(--muted)">' + formatDate(u.created_at) + '</td>' +
            '<td><div class="actions">' +
            '<button class="act-btn" onclick="toggleRole(' + u.id + ',\'' + u.role + '\')">' +
            (u.role === 'admin' ? 'Quitar admin' : 'Hacer admin') +
            '</button>' +
            '<button class="act-btn ' + (u.is_active ? 'danger' : 'success') + '" onclick="toggleStatus(' + u.id + ',' + u.is_active + ')">' +
            (u.is_active ? 'Desactivar' : 'Activar') +
            '</button>' +
            '</div></td>' +
            '</tr>';
    }).join('');
}

function filterUsers(q) {
    const filtered = allUsers.filter(u =>
        u.username.toLowerCase().includes(q.toLowerCase()) ||
        u.email.toLowerCase().includes(q.toLowerCase())
    );
    renderUsers(filtered);
}

async function toggleRole(id, currentRole) {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
        const res = await fetch(API + '/admin/users/' + id + '/role', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ role: newRole })
        });
        const data = await res.json();
        if (!res.ok) { showFlash(data.error, 'error'); return; }
        showFlash('Rol actualizado');
        loadUsers();
    } catch (e) { showFlash('Error', 'error'); }
}

async function toggleStatus(id, currentStatus) {
    try {
        const res = await fetch(API + '/admin/users/' + id + '/status', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ is_active: !currentStatus })
        });
        const data = await res.json();
        if (!res.ok) { showFlash(data.error, 'error'); return; }
        showFlash(data.message);
        loadUsers();
        loadStats();
    } catch (e) { showFlash('Error', 'error'); }
}

// ── Reseñas ──
async function loadReviews() {
    try {
        const res = await fetch(API + '/admin/reviews', { credentials: 'include' });
        allReviews = await res.json();
        renderReviews(allReviews);
    } catch (e) { }
}

function renderReviews(reviews) {
    document.getElementById('reviewsCount').textContent = reviews.length + ' reseñas';
    const body = document.getElementById('reviewsBody');

    if (!reviews.length) {
        body.innerHTML = '<tr><td colspan="8"><div class="empty"><span>📝</span>Sin reseñas</div></td></tr>';
        return;
    }

    body.innerHTML = reviews.map(r => {
        return '<tr>' +
            '<td style="color:var(--muted)">#' + r.id + '</td>' +
            '<td><strong>' + r.username + '</strong></td>' +
            '<td>' +
            '<a class="movie-link" href="/pages/movie.html?id=' + r.imdb_id + '" target="_blank">' +
            r.movie_title +
            '</a>' +
            '</td>' +
            '<td><span class="stars-small">' + starsHtml(r.rating) + '</span></td>' +
            '<td><div class="review-text">' + r.content + '</div></td>' +
            '<td><span class="badge ' + (r.is_hidden ? 'hidden' : 'visible') + '">' + (r.is_hidden ? 'Oculta' : 'Visible') + '</span></td>' +
            '<td style="color:var(--muted)">' + formatDate(r.created_at) + '</td>' +
            '<td><div class="actions">' +
            '<button class="act-btn" onclick="toggleReviewVisibility(' + r.id + ',' + r.is_hidden + ')">' +
            (r.is_hidden ? 'Mostrar' : 'Ocultar') +
            '</button>' +
            '<button class="act-btn danger" onclick="deleteReview(' + r.id + ')">Eliminar</button>' +
            '</div></td>' +
            '</tr>';
    }).join('');
}

function filterReviews(q) {
    const filtered = allReviews.filter(r =>
        r.username.toLowerCase().includes(q.toLowerCase()) ||
        r.movie_title.toLowerCase().includes(q.toLowerCase()) ||
        r.content.toLowerCase().includes(q.toLowerCase())
    );
    renderReviews(filtered);
}

async function toggleReviewVisibility(id, isHidden) {
    try {
        const res = await fetch(API + '/admin/reviews/' + id + '/visibility', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ is_hidden: !isHidden })
        });
        if (res.ok) { showFlash('Visibilidad actualizada'); loadReviews(); loadStats(); }
    } catch (e) { showFlash('Error', 'error'); }
}

async function deleteReview(id) {
    if (!confirm('¿Eliminar esta reseña permanentemente?')) return;
    try {
        const res = await fetch(API + '/admin/reviews/' + id, {
            method: 'DELETE', credentials: 'include'
        });
        if (res.ok) { showFlash('Reseña eliminada'); loadReviews(); loadStats(); }
    } catch (e) { showFlash('Error', 'error'); }
}

async function loadMessages() {
    try {
        const res = await fetch(API + '/admin/messages', { credentials: 'include' });
        const messages = await res.json();
        const unread = messages.filter(m => !m.is_read).length;
        document.getElementById('messagesCount').textContent = messages.length + ' mensajes';
        document.getElementById('unreadBadge').textContent = unread ? ' (' + unread + ' nuevos)' : '';

        const body = document.getElementById('messagesBody');
        if (!messages.length) {
            body.innerHTML = '<tr><td colspan="8"><div class="empty"><span>✉️</span>Sin mensajes</div></td></tr>';
            return;
        }
        body.innerHTML = messages.map(m =>
            '<tr style="' + (!m.is_read ? 'background:rgba(229,9,20,0.04)' : '') + '">' +
            '<td style="color:var(--muted)">#' + m.id + '</td>' +
            '<td><strong>' + m.name + '</strong></td>' +
            '<td style="color:var(--muted)">' + m.email + '</td>' +
            '<td>' + m.subject + '</td>' +
            '<td><div class="review-text">' + m.message + '</div></td>' +
            '<td><span class="badge ' + (m.is_read ? 'active' : 'hidden') + '">' + (m.is_read ? 'Leído' : 'Nuevo') + '</span></td>' +
            '<td style="color:var(--muted)">' + formatDate(m.created_at) + '</td>' +
            '<td><div class="actions">' +
            (!m.is_read ? '<button class="act-btn success" onclick="markRead(' + m.id + ')">Marcar leído</button>' : '') +
            '<button class="act-btn danger" onclick="deleteMessage(' + m.id + ')">Eliminar</button>' +
            '</div></td>' +
            '</tr>'
        ).join('');
    } catch (e) { }
}

async function markRead(id) {
    await fetch(API + '/admin/messages/' + id + '/read', { method: 'PATCH', credentials: 'include' });
    showFlash('Marcado como leído');
    loadMessages();
}

async function deleteMessage(id) {
    if (!confirm('¿Eliminar este mensaje?')) return;
    await fetch(API + '/admin/messages/' + id, { method: 'DELETE', credentials: 'include' });
    showFlash('Mensaje eliminado');
    loadMessages();
}

// ── Init ──
async function init() {
    await checkAdmin();
    await Promise.all([loadStats(), loadUsers(), loadReviews(), loadMessages()]);
}


document.addEventListener('DOMContentLoaded', init);
