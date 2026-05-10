const express = require('express');
const db = require('../db/connection');
const bcrypt = require('bcrypt');
const { requireLogin } = require('../middleware/auth');
const router = express.Router();

// Obtener perfil propio
router.get('/', requireLogin, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, username, email, role, created_at FROM users WHERE id = ?',
      [req.session.userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch(err) {
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

// Obtener reseñas propias (incluyendo ocultas)
router.get('/reviews', requireLogin, async (req, res) => {
  try {
    const [reviews] = await db.query(`
      SELECT r.*, m.title as movie_title, m.tmdb_id, m.poster_url
      FROM reviews r
      JOIN movies m ON r.movie_id = m.id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
    `, [req.session.userId]);

    // Reacciones por reseña
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
    res.status(500).json({ error: 'Error al obtener reseñas' });
  }
});

// Cambiar username
router.patch('/username', requireLogin, async (req, res) => {
  const { username } = req.body;
  if (!username || username.trim().length < 3) {
    return res.status(400).json({ error: 'Username debe tener al menos 3 caracteres' });
  }
  try {
    const [existing] = await db.query(
      'SELECT id FROM users WHERE username = ? AND id != ?',
      [username, req.session.userId]
    );
    if (existing.length) return res.status(409).json({ error: 'Ese username ya está en uso' });

    await db.query('UPDATE users SET username = ? WHERE id = ?', [username.trim(), req.session.userId]);
    req.session.username = username.trim();
    res.json({ message: 'Username actualizado' });
  } catch(err) {
    res.status(500).json({ error: 'Error al actualizar username' });
  }
});

// Cambiar contraseña
router.patch('/password', requireLogin, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Faltan campos' });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
  }
  try {
    const [rows] = await db.query('SELECT password_hash FROM users WHERE id = ?', [req.session.userId]);
    const match = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!match) return res.status(401).json({ error: 'Contraseña actual incorrecta' });

    const hash = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.session.userId]);
    res.json({ message: 'Contraseña actualizada' });
  } catch(err) {
    res.status(500).json({ error: 'Error al actualizar contraseña' });
  }
});

module.exports = router;
