function showError(msg) {
    const el = document.getElementById('errorMsg');
    el.textContent = msg;
    el.classList.add('visible');
}

async function sendMessage() {
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const subject = document.getElementById('subject').value;
    const message = document.getElementById('message').value.trim();
    const btn = document.getElementById('submitBtn');

    document.getElementById('errorMsg').classList.remove('visible');

    if (!name) { showError('Por favor escribe tu nombre'); return; }
    if (!email) { showError('Por favor escribe tu correo'); return; }
    if (!subject) { showError('Selecciona un asunto'); return; }
    if (!message || message.length < 10) { showError('El mensaje debe tener al menos 10 caracteres'); return; }

    btn.classList.add('loading');
    btn.disabled = true;

    try {
        const res = await fetch(API + '/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, subject, message })
        });
        const data = await res.json();
        if (!res.ok) { showError(data.error || 'Error al enviar'); return; }

        document.getElementById('formContent').style.display = 'none';
        document.getElementById('successMsg').classList.add('visible');
    } catch (e) {
        showError('No se pudo conectar al servidor');
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

function resetForm() {
    document.getElementById('name').value = '';
    document.getElementById('email').value = '';
    document.getElementById('subject').value = '';
    document.getElementById('message').value = '';
    document.getElementById('charCount').textContent = '0/1000';
    document.getElementById('formContent').style.display = 'block';
    document.getElementById('successMsg').classList.remove('visible');
}

document.addEventListener('DOMContentLoaded', async function() {
    await loadNav({ activePage: 'contact' });
});
