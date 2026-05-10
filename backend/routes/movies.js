const express = require('express');
const db = require('../db/connection');
const router = express.Router();

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';

// Películas populares
router.get('/popular', async (req, res) => {
    try {
        const response = await fetch(
            `${TMDB_BASE}/movie/popular?api_key=${TMDB_KEY}&language=es-MX&page=1`
        );
        const data = await response.json();
        res.json(data.results);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener películas populares' });
    }
});

// Buscar películas
router.get('/search', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Parámetro q requerido' });
    try {
        const response = await fetch(
            `${TMDB_BASE}/search/movie?api_key=${TMDB_KEY}&language=es-MX&query=${encodeURIComponent(q)}`
        );
        const data = await response.json();
        res.json(data.results || []);
    } catch (err) {
        res.status(500).json({ error: 'Error en la búsqueda' });
    }
});

// Detalle de película
router.get('/:tmdbId', async (req, res) => {
    const { tmdbId } = req.params;
    try {
        const response = await fetch(
            `${TMDB_BASE}/movie/${tmdbId}?api_key=${TMDB_KEY}&language=es-MX&append_to_response=credits`
        );
        const movie = await response.json();

        if (movie.success === false) {
            return res.status(404).json({ error: 'Película no encontrada' });
        }

        // Guardar en BD si no existe
        await db.query(
            `INSERT IGNORE INTO movies (tmdb_id, title, poster_url) VALUES (?, ?, ?)`,
            [
                movie.id,
                movie.title,
                movie.poster_path ? `${TMDB_IMG}${movie.poster_path}` : null
            ]
        );

        res.json(movie);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener detalle' });
    }
});

module.exports = router;
