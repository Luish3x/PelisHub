const express = require('express');
const db = require('../db/connection');
const { requireLogin } = require('../middleware/auth');
const router = express.Router();

// Obtener reseñas de una película
router.get('/:imdbId', async (req, res) => {
  const { imdbId } = req.params;
  const userId = req.session.userId || null;
  try {
    const [reviews] = await db.query(`
      SELECT r.*, u.username,
        (SELECT type FROM review_reactions rr WHERE rr.review_id = r.id AND rr.user_id = ?) as userReaction
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN movies m ON r.movie_id = m.id
      WHERE m.tmdb_id = ?
        AND (r.is_hidden = FALSE OR r.user_id = ?)
      ORDER BY r.created_at DESC
    `, [userId, imdbId, userId]);

    for (const review of reviews) {
      const [reactions] = await db.query(`
        SELECT type, COUNT(*) as count
        FROM review_reactions WHERE review_id = ?
        GROUP BY type
      `, [review.id]);
      review.reactions = {};
      reactions.forEach(r => review.reactions[r.type] = r.count);
    }

    res.json(reviews);
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener reseñas' });
  }
});

// Crear reseña
router.post('/', requireLogin, async (req, res) => {
  const { imdb_id, content, rating } = req.body;
  if (!imdb_id || !content || !rating) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }
  try {
    const [movies] = await db.query('SELECT id FROM movies WHERE tmdb_id = ?', [imdb_id]);
    if (!movies.length) return res.status(404).json({ error: 'Película no encontrada' });

    const movieId = movies[0].id;

    // Un usuario solo puede reseñar una película una vez
    const [existing] = await db.query(
      'SELECT id FROM reviews WHERE user_id = ? AND movie_id = ?',
      [req.session.userId, movieId]
    );
    if (existing.length) return res.status(409).json({ error: 'Ya tienes una reseña para esta película' });

    const [result] = await db.query(
      'INSERT INTO reviews (user_id, movie_id, content, rating) VALUES (?, ?, ?, ?)',
      [req.session.userId, movieId, content, rating]
    );
    res.status(201).json({ id: result.insertId, message: 'Reseña creada' });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear reseña' });
  }
});

// Eliminar reseña
router.delete('/:id', requireLogin, async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM reviews WHERE id = ? AND user_id = ?',
      [req.params.id, req.session.userId]
    );
    if (!result.affectedRows) return res.status(403).json({ error: 'No autorizado' });
    res.json({ message: 'Reseña eliminada' });
  } catch(err) {
    res.status(500).json({ error: 'Error al eliminar' });
  }
});

// Ocultar/mostrar reseña
router.patch('/:id', requireLogin, async (req, res) => {
  const { is_hidden } = req.body;
  try {
    const [result] = await db.query(
      'UPDATE reviews SET is_hidden = ? WHERE id = ? AND user_id = ?',
      [is_hidden, req.params.id, req.session.userId]
    );
    if (!result.affectedRows) return res.status(403).json({ error: 'No autorizado' });
    res.json({ message: 'Actualizado' });
  } catch(err) {
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

// Reaccionar a una reseña
router.post('/:id/react', requireLogin, async (req, res) => {
  const { type } = req.body;
  const validTypes = ['like', 'dislike', 'helpful', 'funny'];
  if (!validTypes.includes(type)) return res.status(400).json({ error: 'Tipo inválido' });

  try {
    // Si ya reaccionó con el mismo tipo, eliminar (toggle)
    const [existing] = await db.query(
      'SELECT id, type FROM review_reactions WHERE review_id = ? AND user_id = ?',
      [req.params.id, req.session.userId]
    );

    if (existing.length && existing[0].type === type) {
      await db.query('DELETE FROM review_reactions WHERE id = ?', [existing[0].id]);
    } else if (existing.length) {
      await db.query('UPDATE review_reactions SET type = ? WHERE id = ?', [type, existing[0].id]);
    } else {
      await db.query(
        'INSERT INTO review_reactions (review_id, user_id, type) VALUES (?, ?, ?)',
        [req.params.id, req.session.userId, type]
      );
    }
    res.json({ message: 'OK' });
  } catch(err) {
    res.status(500).json({ error: 'Error al reaccionar' });
  }
});

// Editar reseña
router.put('/:id', requireLogin, async (req, res) => {
  const { content, rating } = req.body;
  if (!content || !rating) return res.status(400).json({ error: 'Faltan campos' });
  try {
    const [result] = await db.query(
      'UPDATE reviews SET content = ?, rating = ? WHERE id = ? AND user_id = ?',
      [content, rating, req.params.id, req.session.userId]
    );
    if (!result.affectedRows) return res.status(403).json({ error: 'No autorizado' });
    res.json({ message: 'Reseña actualizada' });
  } catch(err) {
    res.status(500).json({ error: 'Error al editar' });
  }
});

module.exports = router;
