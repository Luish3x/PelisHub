const express = require('express');
const db = require('../db/connection');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Enviar mensaje
router.post('/', [
    body('name').trim().isLength({ min: 2 }).withMessage('Nombre muy corto'),
    body('email').trim().isEmail().withMessage('Email inválido').normalizeEmail(),
    body('subject').trim().isLength({ min: 3 }).withMessage('Asunto muy corto'),
    body('message').trim().isLength({ min: 10 }).withMessage('Mensaje muy corto')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
    }
    const { name, email, subject, message } = req.body;
    try {
        await db.query(
            'INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)',
            [name, email, subject, message]
        );
        res.status(201).json({ message: 'Mensaje enviado correctamente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al enviar el mensaje' });
    }
});

module.exports = router;
