const express = require('express');
const db = require('../db/connection');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Todas las rutas de admin requieren rol admin
router.use(requireAdmin);

// ── Estadísticas ──
router.get('/stats', async (req, res) => {
    try {
        const [[users]] = await db.query('SELECT COUNT(*) as total FROM users');
        const [[reviews]] = await db.query('SELECT COUNT(*) as total FROM reviews');
        const [[movies]] = await db.query('SELECT COUNT(*) as total FROM movies');
        const [[hidden]] = await db.query('SELECT COUNT(*) as total FROM reviews WHERE is_hidden = TRUE');

        res.json({
            users: users.total,
            reviews: reviews.total,
            movies: movies.total,
            hidden: hidden.total
        });
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
});

// ── Usuarios ──
router.get('/users', async (req, res) => {
    try {
        const [users] = await db.query(`
      SELECT id, username, email, role, is_active, created_at,
        (SELECT COUNT(*) FROM reviews WHERE user_id = users.id) as review_count
      FROM users
      ORDER BY created_at DESC
    `);
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});

// Cambiar rol de usuario
router.patch('/users/:id/role', async (req, res) => {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Rol inválido' });
    }
    // No permitir que el admin se quite su propio rol
    if (parseInt(req.params.id) === req.session.userId) {
        return res.status(400).json({ error: 'No puedes cambiar tu propio rol' });
    }
    try {
        await db.query('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
        res.json({ message: 'Rol actualizado' });
    } catch (err) {
        res.status(500).json({ error: 'Error al actualizar rol' });
    }
});

// Activar/desactivar usuario
router.patch('/users/:id/status', async (req, res) => {
    const { is_active } = req.body;
    if (parseInt(req.params.id) === req.session.userId) {
        return res.status(400).json({ error: 'No puedes desactivarte a ti mismo' });
    }
    try {
        await db.query('UPDATE users SET is_active = ? WHERE id = ?', [is_active, req.params.id]);
        res.json({ message: is_active ? 'Usuario activado' : 'Usuario desactivado' });
    } catch (err) {
        res.status(500).json({ error: 'Error al actualizar estado' });
    }
});

// ── Reseñas ──
router.get('/reviews', async (req, res) => {
    try {
        const [reviews] = await db.query(`
      SELECT r.*, u.username, m.title as movie_title, m.tmdb_id as imdb_id
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN movies m ON r.movie_id = m.id
      ORDER BY r.created_at DESC
    `);
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener reseñas' });
    }
});

// Eliminar reseña (admin)
router.delete('/reviews/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM review_reactions WHERE review_id = ?', [req.params.id]);
        await db.query('DELETE FROM reviews WHERE id = ?', [req.params.id]);
        res.json({ message: 'Reseña eliminada' });
    } catch (err) {
        res.status(500).json({ error: 'Error al eliminar' });
    }
});

// Ocultar/mostrar reseña (admin)
router.patch('/reviews/:id/visibility', async (req, res) => {
    const { is_hidden } = req.body;
    try {
        await db.query('UPDATE reviews SET is_hidden = ? WHERE id = ?', [is_hidden, req.params.id]);
        res.json({ message: 'Visibilidad actualizada' });
    } catch (err) {
        res.status(500).json({ error: 'Error al actualizar' });
    }
});

// Mensajes de contacto
router.get('/messages', async (req, res) => {
    try {
        const [messages] = await db.query(
            'SELECT * FROM contact_messages ORDER BY created_at DESC'
        );
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener mensajes' });
    }
});

router.patch('/messages/:id/read', async (req, res) => {
    try {
        await db.query('UPDATE contact_messages SET is_read = TRUE WHERE id = ?', [req.params.id]);
        res.json({ message: 'Marcado como leído' });
    } catch (err) {
        res.status(500).json({ error: 'Error' });
    }
});

router.delete('/messages/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM contact_messages WHERE id = ?', [req.params.id]);
        res.json({ message: 'Mensaje eliminado' });
    } catch (err) {
        res.status(500).json({ error: 'Error' });
    }
});

module.exports = router;
