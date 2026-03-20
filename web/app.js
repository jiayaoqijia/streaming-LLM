// State
let messages = [];
let currentProvider = "openrouter";
let allModels = { openrouter: [], altllm: [] };
let totalCost = 0;
let isStreaming = false;

// DOM
const chatArea = document.getElementById("chat-area");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const modelSelect = document.getElementById("model-select");
const costValue = document.getElementById("cost-value");

// Load models on startup
async function loadModels() {
  try {
    const res = await fetch("/api/models");
    allModels = await res.json();
    updateModelDropdown();
  } catch (err) {
    console.error("Failed to load models:", err);
  }
}

function updateModelDropdown() {
  const models = allModels[currentProvider] || [];
  modelSelect.innerHTML = "";
  if (models.length === 0) {
    modelSelect.innerHTML = '<option value="">No models available</option>';
    return;
  }
  models.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = `${m.name} ($${m.outputPricePerToken.toFixed(7)}/tok)`;
    modelSelect.appendChild(opt);
  });
}

// Provider selector
document.querySelectorAll(".provider-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".provider-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentProvider = btn.dataset.provider;
    updateModelDropdown();
  });
});

// Send message
async function sendMessage() {
  const content = messageInput.value.trim();
  const model = modelSelect.value;
  if (!content || !model || isStreaming) return;

  isStreaming = true;
  sendBtn.disabled = true;
  messageInput.value = "";
  autoResizeTextarea();

  // Add user message
  messages.push({ role: "user", content });
  appendMessage("user", content);

  // Add assistant placeholder
  const assistantEl = appendMessage("assistant", "");
  const contentEl = assistantEl.querySelector(".message-content");

  // Show typing indicator
  const typingEl = document.createElement("div");
  typingEl.className = "typing-indicator";
  typingEl.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
  contentEl.appendChild(typingEl);

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, model, provider: currentProvider }),
    });

    if (res.status === 402) {
      typingEl.remove();
      contentEl.textContent = "Payment required. Please set up an MPP payment channel.";
      return;
    }

    if (!res.ok) {
      typingEl.remove();
      const err = await res.json();
      contentEl.textContent = `Error: ${err.error}`;
      return;
    }

    // Remove typing indicator
    typingEl.remove();

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let assistantContent = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            contentEl.textContent += `\n[Error: ${parsed.error}]`;
            continue;
          }
          if (parsed.token) {
            assistantContent += parsed.token;
            contentEl.textContent = assistantContent;
          }
          if (parsed.cost !== undefined) {
            totalCost = parsed.cost;
            updateCostCounter();
          }
        } catch (e) {
          // skip unparseable lines
        }
      }

      // Auto-scroll
      chatArea.scrollTop = chatArea.scrollHeight;
    }

    messages.push({ role: "assistant", content: assistantContent });
  } catch (err) {
    typingEl.remove();
    contentEl.textContent = `Connection error: ${err.message}`;
  } finally {
    isStreaming = false;
    sendBtn.disabled = false;
    messageInput.focus();
  }
}

function appendMessage(role, content) {
  const el = document.createElement("div");
  el.className = `message message-${role}`;
  const labelEl = document.createElement("div");
  labelEl.className = "message-label";
  labelEl.textContent = role === "user" ? "YOU" : "ASSISTANT";
  const contentEl = document.createElement("div");
  contentEl.className = "message-content";
  contentEl.textContent = content;
  el.appendChild(labelEl);
  el.appendChild(contentEl);
  chatArea.appendChild(el);
  chatArea.scrollTop = chatArea.scrollHeight;
  return el;
}

function updateCostCounter() {
  costValue.textContent = `$${totalCost.toFixed(6)}`;
}

// Auto-resize textarea
function autoResizeTextarea() {
  messageInput.style.height = "auto";
  messageInput.style.height = Math.min(messageInput.scrollHeight, 150) + "px";
}

messageInput.addEventListener("input", autoResizeTextarea);

// Enter to send, Shift+Enter for newline
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendBtn.addEventListener("click", sendMessage);

// Init
loadModels();
