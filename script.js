// ---- State ----
let messages = [];
let isStreaming = false;

// ---- DOM ----
const chatArea = document.getElementById("chat-area");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const newChatBtn = document.getElementById("new-chat-btn");
const openSettingsBtn = document.getElementById("open-settings");
const closeSettingsBtn = document.getElementById("close-settings");
const settingsOverlay = document.getElementById("settings-overlay");
const saveSettingsBtn = document.getElementById("save-settings");
const apiKeyInput = document.getElementById("api-key-input");
const userNameInput = document.getElementById("user-name-input");
const modelSelect = document.getElementById("model-select");

// ---- Settings ----
function getSettings() {
  return {
    apiKey: localStorage.getItem("simave_api_key") || "",
    userName: localStorage.getItem("simave_user_name") || "Estudante",
    model: localStorage.getItem("simave_model") || "gpt-4o-mini",
  };
}

function loadSettingsIntoModal() {
  const s = getSettings();
  apiKeyInput.value = s.apiKey;
  userNameInput.value = s.userName === "Estudante" ? "" : s.userName;
  modelSelect.value = s.model;
}

function saveSettings() {
  const key = apiKeyInput.value.trim();
  const name = userNameInput.value.trim() || "Estudante";
  const model = modelSelect.value;
  localStorage.setItem("simave_api_key", key);
  localStorage.setItem("simave_user_name", name);
  localStorage.setItem("simave_model", model);
  settingsOverlay.classList.add("hidden");
  // Re-render welcome if no messages yet
  if (messages.length === 0) renderWelcome();
}

// ---- System Prompt ----
function buildSystemPrompt() {
  const s = getSettings();
  return `Voce e o SIMAVE Coach IA, um professor virtual especialista nas materias do SIMAVE (Sistema Mineiro de Avaliacao da Educacao Publica).

O nome do aluno e ${s.userName}. Trate-o sempre pelo nome de forma educada e encorajadora.

Quando o aluno enviar uma questao, voce DEVE:

1. Detectar automaticamente a materia (Portugues, Matematica, Ciencias, Geografia, Historia, Fisica, Quimica ou Biologia).
2. Ler o enunciado com atencao e identificar o que a questao pede.
3. Analisar cada alternativa (A, B, C, D) individualmente.
4. Escolher a alternativa correta com base em logica e conhecimento.
5. Explicar detalhadamente POR QUE a alternativa correta esta certa.
6. Comparar TODAS as alternativas, explicando por que cada errada esta errada.

Formato OBRIGATORIO da resposta:

📘 Materia detectada: [materia]
✅ Alternativa correta: [letra]

🧠 Explicacao:
[Explicacao clara e didatica de por que a resposta correta resolve a questao]

📊 Comparacao com as outras alternativas:
A) [Correta/Errada] — [explicacao]
B) [Correta/Errada] — [explicacao]
C) [Correta/Errada] — [explicacao]
D) [Correta/Errada] — [explicacao]

Regras:
- NAO dependa de gabaritos externos.
- NAO pergunte ao aluno qual e a resposta.
- NAO use respostas prontas — pense logicamente.
- Seja didatico, claro e encorajador.
- Fale em portugues brasileiro.
- Se a mensagem NAO for uma questao do SIMAVE, responda de forma educada explicando que voce esta aqui para ajudar com questoes do SIMAVE.`;
}

// ---- Welcome Screen ----
function renderWelcome() {
  const s = getSettings();
  const needsKey = !s.apiKey;

  chatArea.innerHTML = `
    <div class="welcome">
      <div class="welcome-icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
      </div>
      <h1>Ola, ${s.userName}!</h1>
      <p>Cole uma questao do SIMAVE e eu vou te ajudar a entender a resposta correta com explicacoes detalhadas.</p>
      ${
        needsKey
          ? `<div class="api-warning">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span>Configure sua chave da API OpenAI nas <strong>Configuracoes</strong> para comecar.</span>
            </div>`
          : ""
      }
      <div class="subjects">
        <span class="subject-tag">Portugues</span>
        <span class="subject-tag">Matematica</span>
        <span class="subject-tag">Ciencias</span>
        <span class="subject-tag">Geografia</span>
        <span class="subject-tag">Historia</span>
        <span class="subject-tag">Fisica</span>
        <span class="subject-tag">Quimica</span>
        <span class="subject-tag">Biologia</span>
      </div>
      <div class="examples">
        <button class="example-btn" data-text="(SIMAVE) Leia o texto a seguir.\n&quot;A agua e um recurso natural essencial para a vida. Sem ela, nao haveria vida no planeta.&quot;\nDe acordo com o texto, a agua e:\nA) dispensavel para os seres vivos\nB) importante apenas para os humanos\nC) essencial para a existencia da vida\nD) util somente para a agricultura">Exemplo: Questao de Ciencias sobre a agua</button>
        <button class="example-btn" data-text="(SIMAVE) Qual e o valor de x na equacao 2x + 6 = 18?\nA) 4\nB) 6\nC) 8\nD) 12">Exemplo: Questao de Matematica — equacao</button>
      </div>
    </div>
  `;

  // Attach example button listeners
  chatArea.querySelectorAll(".example-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      messageInput.value = btn.dataset.text;
      autoResize();
      messageInput.focus();
      updateSendBtn();
    });
  });
}

// ---- Render Messages ----
function renderMessages() {
  chatArea.innerHTML = "";
  for (const msg of messages) {
    chatArea.appendChild(createMessageEl(msg.role, msg.content));
  }
  scrollToBottom();
}

function createMessageEl(role, content) {
  const div = document.createElement("div");
  div.className = `message ${role}`;

  const avatar = document.createElement("div");
  avatar.className = `avatar ${role === "user" ? "user" : "ai"}`;
  avatar.textContent = role === "user" ? getSettings().userName[0].toUpperCase() : "IA";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = content;

  div.appendChild(avatar);
  div.appendChild(bubble);
  return div;
}

function addTypingIndicator() {
  const div = document.createElement("div");
  div.className = "message assistant";
  div.id = "typing-indicator";

  const avatar = document.createElement("div");
  avatar.className = "avatar ai";
  avatar.textContent = "IA";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';

  div.appendChild(avatar);
  div.appendChild(bubble);
  chatArea.appendChild(div);
  scrollToBottom();
}

function removeTypingIndicator() {
  const el = document.getElementById("typing-indicator");
  if (el) el.remove();
}

function scrollToBottom() {
  chatArea.scrollTop = chatArea.scrollHeight;
}

// ---- Send Message ----
async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || isStreaming) return;

  const s = getSettings();
  if (!s.apiKey) {
    settingsOverlay.classList.remove("hidden");
    loadSettingsIntoModal();
    apiKeyInput.focus();
    return;
  }

  // Add user message
  messages.push({ role: "user", content: text });
  messageInput.value = "";
  autoResize();
  updateSendBtn();
  renderMessages();

  // Start streaming
  isStreaming = true;
  updateSendBtn();
  addTypingIndicator();

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${s.apiKey}`,
      },
      body: JSON.stringify({
        model: s.model,
        stream: true,
        messages: [
          { role: "system", content: buildSystemPrompt() },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Erro ${response.status}`);
    }

    removeTypingIndicator();

    // Add assistant message placeholder
    messages.push({ role: "assistant", content: "" });
    renderMessages();

    const lastBubble = chatArea.querySelector(".message.assistant:last-child .bubble");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") break;
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            messages[messages.length - 1].content += delta;
            lastBubble.textContent = messages[messages.length - 1].content;
            scrollToBottom();
          }
        } catch {
          /* skip invalid JSON */
        }
      }
    }
  } catch (err) {
    removeTypingIndicator();
    messages.push({
      role: "assistant",
      content: `Erro ao conectar com a IA: ${err.message}\n\nVerifique sua chave da API nas Configuracoes.`,
    });
    renderMessages();
  } finally {
    isStreaming = false;
    updateSendBtn();
  }
}

// ---- Auto-Resize Textarea ----
function autoResize() {
  messageInput.style.height = "auto";
  messageInput.style.height = Math.min(messageInput.scrollHeight, 180) + "px";
}

function updateSendBtn() {
  sendBtn.disabled = !messageInput.value.trim() || isStreaming;
}

// ---- Event Listeners ----
messageInput.addEventListener("input", () => {
  autoResize();
  updateSendBtn();
});

messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendBtn.addEventListener("click", sendMessage);

newChatBtn.addEventListener("click", () => {
  messages = [];
  renderWelcome();
  messageInput.value = "";
  autoResize();
  updateSendBtn();
  messageInput.focus();
});

openSettingsBtn.addEventListener("click", () => {
  loadSettingsIntoModal();
  settingsOverlay.classList.remove("hidden");
});

closeSettingsBtn.addEventListener("click", () => {
  settingsOverlay.classList.add("hidden");
});

settingsOverlay.addEventListener("click", (e) => {
  if (e.target === settingsOverlay) settingsOverlay.classList.add("hidden");
});

saveSettingsBtn.addEventListener("click", saveSettings);

// ---- Init ----
renderWelcome();
messageInput.focus();
