const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db/connection');
const router = express.Router();
const { body, validationResult } = require('express-validator');

// REGISTRO
router.post('/register', [
    body('username')
        .trim()
        .isLength({ min: 3, max: 30 }).withMessage('Username debe tener entre 3 y 30 caracteres')
        .matches(/^[a-zA-Z0-9_]+$/).withMessage('Solo letras, números y guion bajo'),
    body('email')
        .trim()
        .isEmail().withMessage('Email inválido')
        .normalizeEmail(),
    body('password')
    .isLength({ min: 6 }).withMessage('Contraseña mínimo 6 caracteres')
    .matches(/[a-z]/).withMessage('Debe contener al menos una minúscula')
    .matches(/[A-Z]/).withMessage('Debe contener al menos una mayúscula')
    .matches(/[0-9]/).withMessage('Debe contener al menos un número')
    .matches(/[^a-zA-Z0-9]/).withMessage('Debe contener al menos un símbolo'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { username, email, password } = req.body;
    try {
        const [existing] = await db.query(
            'SELECT id FROM users WHERE email = ? OR username = ?',
            [email, username]
        );
        if (existing.length) {
            return res.status(409).json({ error: 'El email o username ya está en uso' });
        }

        const password_hash = await bcrypt.hash(password, 10);
        const [result] = await db.query(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            [username, email, password_hash]
        );

        req.session.userId = result.insertId;
        req.session.username = username;
        req.session.role = 'user';

        res.status(201).json({
            message: 'Usuario creado exitosamente',
            user: { id: result.insertId, username, email, role: 'user' }
        });
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// LOGIN
router.post('/login', [
    body('email').trim().isEmail().normalizeEmail(),
    body('password').notEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Datos inválidos' });
    }

    const { email, password } = req.body;
    try {
        const [rows] = await db.query(
            'SELECT * FROM users WHERE email = ? AND is_active = TRUE',
            [email]
        );
        if (!rows.length) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        const user = rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.role = user.role;

        res.json({
            message: 'Login exitoso',
            user: { id: user.id, username: user.username, email: user.email, role: user.role }
        });
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// LOGOUT
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ error: 'Error al cerrar sesión' });
        res.json({ message: 'Sesión cerrada' });
    });
});

// QUIÉN SOY
router.get('/me', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'No hay sesión activa' });
    }
    res.json({
        id: req.session.userId,
        username: req.session.username,
        role: req.session.role
    });
});

module.exports = router;
