/* ═══════════════════════════════════════════
   PELISHUB — HOME.JS
═══════════════════════════════════════════ */

let searchTimeout;

// ── Render cards ──
function renderMovies(movies) {
    const grid = document.getElementById('moviesGrid');
    grid.classList.remove('fade-out');
    grid.classList.add('fade-in');

    if (!movies.length) {
        grid.innerHTML = '<div class="no-results"><span>🔍</span><strong>Sin resultados</strong>Intenta con otro título</div>';
        return;
    }

    grid.innerHTML = movies.map(function(m, i) {
        const poster = m.poster_path ? 'https://image.tmdb.org/t/p/w500' + m.poster_path : null;
        const year = m.release_date ? m.release_date.substring(0, 4) : '—';
        const rating = m.vote_average ? m.vote_average.toFixed(1) : '—';
        return '<a class="movie-card" href="/pages/movie.html?id=' + m.id + '" style="--delay:' + (i * 0.025) + 's">' +
            (poster ? '<img class="movie-poster" src="' + poster + '" alt="' + m.title + '" loading="lazy">' : '<div class="movie-poster-placeholder">🎬</div>') +
            '<div class="movie-overlay">' +
            '<div class="movie-overlay-title">' + m.title + '</div>' +
            '<div class="movie-overlay-meta"><span>' + year + '</span><span class="movie-overlay-rating">★ ' + rating + '</span></div>' +
            '<button class="movie-overlay-btn">Ver reseñas</button>' +
            '</div>' +
            '</a>';
    }).join('');
}

// ── Populares ──
async function loadPopular() {
    try {
        const res = await fetch(API + '/movies/popular');
        const movies = await res.json();
        document.getElementById('sectionTitle').textContent = 'Populares ahora';
        document.getElementById('sectionCount').textContent = movies.length + ' películas';
        renderMovies(movies);
    } catch (e) {
        document.getElementById('moviesGrid').innerHTML =
            '<p style="color:var(--muted);grid-column:1/-1;text-align:center;padding:40px">Error al cargar películas.</p>';
    }
}

// ── Búsqueda ──
const searchInput = document.getElementById('searchInput');
const searchClear = document.getElementById('searchClear');

searchInput.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    const q = this.value.trim();
    if (!q) { clearSearch(); return; }
    searchClear.classList.add('visible');
    const grid = document.getElementById('moviesGrid');
    grid.classList.add('fade-out');
    grid.classList.remove('fade-in');
    searchTimeout = setTimeout(() => doSearch(q), 400);
});

searchInput.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') clearSearch();
});

async function doSearch(q) {
    document.getElementById('sectionTitle').textContent = 'Resultados para "' + q + '"';
    document.getElementById('sectionCount').textContent = 'Buscando...';
    document.querySelector('main').scrollIntoView({ behavior: 'smooth', block: 'start' });
    try {
        const res = await fetch(API + '/movies/search?q=' + encodeURIComponent(q));
        const movies = await res.json();
        document.getElementById('sectionCount').textContent = movies.length + ' resultado' + (movies.length !== 1 ? 's' : '');
        renderMovies(movies);
    } catch (e) {
        document.getElementById('moviesGrid').innerHTML =
            '<p style="color:var(--muted);grid-column:1/-1;text-align:center;padding:40px">Error al buscar.</p>';
    }
}

function clearSearch() {
    searchInput.value = '';
    searchClear.classList.remove('visible');
    const grid = document.getElementById('moviesGrid');
    grid.classList.add('fade-out');
    grid.classList.remove('fade-in');
    document.getElementById('sectionCount').textContent = '';
    setTimeout(() => loadPopular(), 200);
}

// ── Init ──
// ── Init ──
document.addEventListener('DOMContentLoaded', function() {
  loadNav({ activePage: 'home', transparent: true });
  loadPopular();
});
