// ════════════════════════════════════════════════════════════
// PATCH SMS — adicionar ao admin_v3.html / admin_v3_online.html
//
// 1. Adicione a constante GAS_URL no início, junto às outras const:
//    const GAS_URL = 'https://script.google.com/macros/s/SEU_ID_AQUI/exec';
//
// 2. Adicione a função sendSmsViaRelay abaixo no <script>
//
// 3. No bloco HTML do resultado (após geração do código),
//    adicione o botão SMS como indicado no final.
// ════════════════════════════════════════════════════════════

// ── Constante a adicionar (substitua SEU_ID_AQUI pelo seu) ───
// const GAS_URL = 'https://script.google.com/macros/s/SEU_ID_AQUI/exec';

// ── Função a adicionar no <script> ───────────────────────────
async function sendSmsViaRelay(phone, code) {
  const btn = document.getElementById('btn-sms');
  if (!phone || phone.length < 8) {
    alert('⚠️ Número de telefone inválido. Verifique o campo Contacto.');
    return;
  }

  // Normaliza número: remove espaços, + e 00, garante início 258
  let normalized = phone.replace(/[\s\-\(\)]/g, '');
  if (normalized.startsWith('00')) normalized = normalized.slice(2);
  if (normalized.startsWith('+')) normalized = normalized.slice(1);
  if (!normalized.startsWith('258') && normalized.length === 9) {
    normalized = '258' + normalized;
  }

  const appUrl = 'https://maver1967.github.io/cantar-e-rezar/?code=' + code;
  const message =
    '🎵 Cantar e Rezar\n' +
    'O seu código de activação: ' + code + '\n' +
    'Ou abra directamente:\n' + appUrl;

  btn.textContent = '⏳ A enviar...';
  btn.disabled = true;

  try {
    const resp = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: ADMIN_SECRET,   // usa a mesma constante do admin
        phone: normalized,
        message: message,
        codigo: code
      })
    });
    const result = await resp.json();
    if (result.ok) {
      btn.textContent = '✅ SMS na fila!';
      btn.style.background = '#2a7a2a';
      setTimeout(() => {
        btn.textContent = '📱 Enviar SMS';
        btn.style.background = '';
        btn.disabled = false;
      }, 4000);
    } else {
      throw new Error(result.error || 'Erro desconhecido');
    }
  } catch (err) {
    btn.textContent = '❌ Erro';
    btn.disabled = false;
    alert('Erro ao enviar SMS: ' + err.message);
  }
}

// ── HTML do botão a adicionar no bloco de resultado ──────────
// Inserir APÓS o botão "Copiar Link" existente:
//
// <button id="btn-sms"
//   onclick="sendSmsViaRelay(document.getElementById('gen-contact').value, lastCode)"
//   style="background:#1a5c8a;color:#fff;border:none;padding:10px 20px;
//          border-radius:6px;cursor:pointer;font-size:14px;margin-top:6px;">
//   📱 Enviar SMS
// </button>
//
// Nota: adicione `let lastCode = '';` no início do script
// e no momento em que chama makeCode(), guarde: lastCode = code;
