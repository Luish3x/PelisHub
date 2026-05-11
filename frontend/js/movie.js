
const params = new URLSearchParams(window.location.search);
const imdbId = params.get('id');
let currentUser = null;
let selectedRating = 0;
let editRatings = {};

function starsHtml(n) {
    return '★'.repeat(n) + '☆'.repeat(5 - n);
}

function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr);
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'ahora';
    if (m < 60) return 'hace ' + m + 'm';
    const h = Math.floor(m / 60);
    if (h < 24) return 'hace ' + h + 'h';
    return 'hace ' + Math.floor(h / 24) + 'd';
}

async function loadMovie() {
    try {
        const res = await fetch(API + '/movies/' + imdbId);
        const m = await res.json();
        document.title = 'PelisHub — ' + m.title;

        const posterUrl = m.poster_path
            ? 'https://image.tmdb.org/t/p/w500' + m.poster_path : null;

        if (posterUrl) {
            document.getElementById('backdrop').innerHTML =
                '<img class="backdrop-img" src="' + posterUrl + '" alt="' + m.title + '">' +
                '<div class="backdrop-gradient"></div>';
        }

        const genres = m.genres
            ? m.genres.map(g => '<span class="genre-tag">' + g.name + '</span>').join('') : '';

        const director = m.credits && m.credits.crew
            ? m.credits.crew.find(p => p.job === 'Director') : null;

        const cast = m.credits && m.credits.cast
            ? m.credits.cast.slice(0, 4).map(a => a.name).join(', ') : '';

        const ratingHtml = m.vote_average
            ? '<div class="movie-rating-imdb"><span class="star">★</span><span class="score">' + m.vote_average.toFixed(1) + '</span><span class="label">TMDB</span></div>'
            : '';

        const posterHtml = posterUrl
            ? '<div class="movie-poster"><img src="' + posterUrl + '" alt="' + m.title + '"></div>'
            : '<div class="movie-poster-placeholder">🎬</div>';

        const runtime = m.runtime ? m.runtime + ' min' : '—';
        const year = m.release_date ? m.release_date.substring(0, 4) : '—';

        document.getElementById('movieHeader').innerHTML =
            posterHtml +
            '<div class="movie-info">' +
            '<div class="movie-genres">' + genres + '</div>' +
            '<h1 class="movie-title">' + m.title + '</h1>' +
            '<div class="movie-meta">' +
            '<span>' + year + '</span>' +
            '<span class="movie-meta-sep">·</span>' +
            '<span>' + runtime + '</span>' +
            ratingHtml +
            '</div>' +
            '<p class="movie-plot">' + (m.overview || '') + '</p>' +
            '<div class="movie-crew">' +
            (director ? '<div class="crew-item"><div class="crew-label">Director</div><div class="crew-value">' + director.name + '</div></div>' : '') +
            (cast ? '<div class="crew-item"><div class="crew-label">Reparto</div><div class="crew-value">' + cast + '</div></div>' : '') +
            '</div>' +
            '</div>';
    } catch (e) { console.error(e); }
}

function renderForm() {
    const wrap = document.getElementById('reviewFormWrap');
    if (!currentUser) {
        wrap.innerHTML = '<div class="login-prompt"><a href="/pages/login.html?redirect=' + encodeURIComponent(window.location.href) + '">Inicia sesión</a> para dejar tu reseña</div>';
        return;
    }
    wrap.innerHTML =
        '<div class="review-form">' +
        '<h3>Tu reseña</h3>' +
        '<div class="stars-wrap">' +
        [1, 2, 3, 4, 5].map(n => '<button class="star-btn" data-n="' + n + '" onclick="setRating(' + n + ')">★</button>').join('') +
        '</div>' +
        '<textarea id="reviewText" placeholder="¿Qué te pareció?" maxlength="1000" oninput="document.getElementById(\'charCount\').textContent=this.value.length+\'/1000\'"></textarea>' +
        '<div class="form-footer">' +
        '<span class="char-count" id="charCount">0/1000</span>' +
        '<button class="submit-btn" onclick="submitReview()">Publicar reseña</button>' +
        '</div>' +
        '</div>';
}

function setRating(n) {
    selectedRating = n;
    document.querySelectorAll('.star-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.n) <= n);
    });
}

async function submitReview() {
    const content = document.getElementById('reviewText').value.trim();
    if (!selectedRating) { showFlash('Selecciona una calificación', 'error'); return; }
    if (!content) { showFlash('Escribe algo en tu reseña', 'error'); return; }
    try {
        const res = await fetch(API + '/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ imdb_id: imdbId, content, rating: selectedRating })
        });
        const data = await res.json();
        if (!res.ok) { showFlash(data.error, 'error'); return; }
        showFlash('Reseña publicada');
        document.getElementById('reviewText').value = '';
        selectedRating = 0;
        document.querySelectorAll('.star-btn').forEach(b => b.classList.remove('active'));
        loadReviews();
    } catch (e) { showFlash('Error al publicar', 'error'); }
}

async function loadReviews() {
    const list = document.getElementById('reviewsList');
    list.innerHTML = '';
    try {
        const res = await fetch(API + '/reviews/' + imdbId, { credentials: 'include' });
        const reviews = await res.json();

        document.getElementById('reviewCount').textContent =
            reviews.length ? reviews.length + ' reseña' + (reviews.length !== 1 ? 's' : '') : '';

        if (!reviews.length) {
            list.innerHTML = '<div class="no-reviews"><span>🎬</span>Sé el primero en reseñar esta película</div>';
            return;
        }

        list.innerHTML = reviews.map(function(r, i) {
            const reactions = ['👍 like', '👎 dislike', '💡 helpful', '😂 funny'].map(function(t) {
                const parts = t.split(' ');
                const emoji = parts[0], type = parts[1];
                const count = r.reactions && r.reactions[type] ? r.reactions[type] : 0;
                const active = r.userReaction === type ? 'active' : '';
                return '<button class="reaction-btn ' + active + '" onclick="react(' + r.id + ',\'' + type + '\')">' + emoji + ' <span>' + count + '</span></button>';
            }).join('');

            const ownActions = currentUser && currentUser.id === r.user_id
                ? '<div class="review-actions">' +
                '<button class="action-btn" onclick="editReview(' + r.id + ',' + r.rating + ')">Editar</button>' +
                '<button class="action-btn danger" onclick="deleteReview(' + r.id + ')">Eliminar</button>' +
                '<button class="action-btn" onclick="toggleHide(' + r.id + ',' + r.is_hidden + ')">' + (r.is_hidden ? 'Mostrar' : 'Ocultar') + '</button>' +
                '</div>'
                : '';

            return '<div class="review-card" style="animation-delay:' + (i * 0.05) + 's" id="review-' + r.id + '">' +
                '<div class="review-header">' +
                '<div class="review-author">' +
                '<div class="review-avatar">' + r.username[0].toUpperCase() + '</div>' +
                '<div><div class="review-author-name">' + r.username + '</div><div class="review-date">' + timeAgo(r.created_at) + '</div></div>' +
                '</div>' +
                '<div style="display:flex;align-items:center;gap:12px">' +
                '<span class="review-stars">' + starsHtml(r.rating) + '</span>' +
                ownActions +
                '</div>' +
                '</div>' +
                (r.is_hidden ? '<div class="hidden-badge">🔒 Reseña oculta — solo tú la ves</div>' : '') +
                '<p class="review-content">' + r.content + '</p>' +
                '<div class="review-footer">' + reactions + '</div>' +
                '</div>';
        }).join('');
    } catch (e) { console.error(e); }
}

async function react(reviewId, type) {
    if (!currentUser) { showFlash('Inicia sesión para reaccionar', 'error'); return; }
    try {
        await fetch(API + '/reviews/' + reviewId + '/react', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ type })
        });
        loadReviews();
    } catch (e) { }
}

async function deleteReview(id) {
    if (!confirm('¿Eliminar esta reseña?')) return;
    try {
        const res = await fetch(API + '/reviews/' + id, { method: 'DELETE', credentials: 'include' });
        if (res.ok) { showFlash('Reseña eliminada'); loadReviews(); }
    } catch (e) { }
}

async function toggleHide(id, isHidden) {
    try {
        await fetch(API + '/reviews/' + id, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ is_hidden: !isHidden })
        });
        loadReviews();
    } catch (e) { }
}

async function getCurrentUser() {
    try {
        const res = await fetch(API + '/auth/me', { credentials: 'include' });
        if (res.ok) return await res.json();
        return null;
    } catch (e) { return null; }
}


async function init() {
    await loadNav({ activePage: '' });
    currentUser = await getCurrentUser();
    await loadMovie();
    renderForm();
    await loadReviews();
}

function editReview(id, currentRating) {
    const card = document.getElementById('review-' + id);
    const contentEl = card.querySelector('.review-content');
    const footerEl = card.querySelector('.review-footer');

    // Si ya está en modo edición, no hacer nada
    if (card.querySelector('.edit-area')) return;

    const originalText = contentEl.textContent.trim();

    // Reemplazar contenido con editor inline
    contentEl.style.display = 'none';
    footerEl.style.display = 'none';

    const editHtml =
        '<div class="edit-area">' +
        '<div class="stars-wrap" id="edit-stars-' + id + '">' +
        [1, 2, 3, 4, 5].map(n =>
            '<button class="star-btn ' + (n <= currentRating ? 'active' : '') + '" ' +
            'data-n="' + n + '" onclick="setEditRating(' + id + ',' + n + ')">★</button>'
        ).join('') +
        '</div>' +
        '<textarea class="edit-textarea" id="edit-text-' + id + '">' + originalText + '</textarea>' +
        '<div class="edit-actions">' +
        '<button class="action-btn" onclick="cancelEdit(' + id + ')">Cancelar</button>' +
        '<button class="submit-btn" style="padding:8px 18px;font-size:0.82rem" ' +
        'onclick="saveEdit(' + id + ')">Guardar</button>' +
        '</div>' +
        '</div>';

    contentEl.insertAdjacentHTML('afterend', editHtml);

    // Guardar rating actual en el área de edición
    card.querySelector('.edit-area').dataset.rating = currentRating;
}

function setEditRating(reviewId, n) {
    const area = document.getElementById('review-' + reviewId).querySelector('.edit-area');
    area.dataset.rating = n;
    area.querySelectorAll('.star-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.n) <= n);
    });
}

function cancelEdit(id) {
    const card = document.getElementById('review-' + id);
    card.querySelector('.edit-area').remove();
    card.querySelector('.review-content').style.display = '';
    card.querySelector('.review-footer').style.display = '';
}

async function saveEdit(id) {
    const card = document.getElementById('review-' + id);
    const content = document.getElementById('edit-text-' + id).value.trim();
    const rating = parseInt(card.querySelector('.edit-area').dataset.rating);

    if (!content) { showFlash('La reseña no puede estar vacía', 'error'); return; }
    if (!rating) { showFlash('Selecciona una calificación', 'error'); return; }

    try {
        const res = await fetch(API + '/reviews/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ content, rating })
        });
        const data = await res.json();
        if (!res.ok) { showFlash(data.error, 'error'); return; }
        showFlash('Reseña actualizada');
        loadReviews();
    } catch (e) {
        showFlash('Error al guardar', 'error');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    if (!imdbId) window.location.href = '/';
    init();
});
