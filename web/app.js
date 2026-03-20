// State
let messages = [];
let currentProvider = "openrouter";
let allModels = { openrouter: [], altllm: [] };
let totalCost = 0;
let isStreaming = false;
let connectedAddress = null;

// Toggle this to false to enable real wallet-gated payment flows.
// When true, the app skips wallet checks and uses the existing fetch flow.
const DEMO_MODE = true;

// DOM
const chatArea = document.getElementById("chat-area");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const modelSelect = document.getElementById("model-select");
const costValue = document.getElementById("cost-value");
const walletBtn = document.getElementById("wallet-btn");
const walletLabel = document.getElementById("wallet-label");

// ---- Wallet Connection ----

function truncateAddress(address) {
  return address.slice(0, 6) + "..." + address.slice(-4);
}

function updateWalletUI() {
  if (connectedAddress) {
    walletBtn.classList.add("connected");
    walletLabel.textContent = truncateAddress(connectedAddress);
    walletBtn.title = connectedAddress;
  } else {
    walletBtn.classList.remove("connected");
    walletLabel.textContent = "Connect Wallet";
    walletBtn.title = "";
  }
}

async function connectWallet() {
  if (connectedAddress) {
    // Already connected -- clicking again disconnects (local state only)
    connectedAddress = null;
    updateWalletUI();
    return;
  }

  if (typeof window.ethereum === "undefined") {
    appendSystemMessage(
      "No Ethereum wallet detected. Install MetaMask or another browser wallet to connect."
    );
    return;
  }

  try {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    if (accounts.length === 0) {
      appendSystemMessage("Wallet connection rejected -- no accounts returned.");
      return;
    }

    connectedAddress = accounts[0];
    updateWalletUI();
    appendSystemMessage(
      "Wallet connected: " + connectedAddress
    );
  } catch (err) {
    if (err.code === 4001) {
      appendSystemMessage("Wallet connection rejected by user.");
    } else {
      appendSystemMessage("Wallet connection failed: " + err.message);
    }
  }
}

// Listen for account changes from the wallet provider
function setupWalletListeners() {
  if (typeof window.ethereum === "undefined") return;

  window.ethereum.on("accountsChanged", (accounts) => {
    if (accounts.length === 0) {
      connectedAddress = null;
    } else {
      connectedAddress = accounts[0];
    }
    updateWalletUI();
  });

  window.ethereum.on("chainChanged", () => {
    // Chain changed -- update UI, no page reload needed
    updateWalletUI();
  });
}

// Check if wallet was previously connected (auto-reconnect without prompting)
async function checkExistingConnection() {
  if (typeof window.ethereum === "undefined") return;

  try {
    const accounts = await window.ethereum.request({
      method: "eth_accounts",
    });

    if (accounts.length > 0) {
      connectedAddress = accounts[0];
      updateWalletUI();
    }
  } catch (_err) {
    // Silently ignore -- user hasn't connected yet
  }
}

walletBtn.addEventListener("click", connectWallet);

// ---- System messages ----

function appendSystemMessage(text) {
  const el = document.createElement("div");
  el.className = "message message-assistant";
  const labelEl = document.createElement("div");
  labelEl.className = "message-label";
  labelEl.textContent = "SYSTEM";
  const contentEl = document.createElement("div");
  contentEl.className = "message-content";
  contentEl.textContent = text;
  el.appendChild(labelEl);
  el.appendChild(contentEl);
  chatArea.appendChild(el);
  chatArea.scrollTop = chatArea.scrollHeight;
}

// ---- Models ----

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

// ---- 402 Payment Handling ----

function renderPaymentRequired(contentEl, res) {
  contentEl.innerHTML = "";

  const prompt = document.createElement("div");
  prompt.className = "payment-prompt";

  const info = document.createElement("div");
  info.className = "payment-info";
  info.textContent = "402 -- Payment Required";

  const wwwAuth = res.headers.get("WWW-Authenticate") || "";
  const costMatch = wwwAuth.match(/cost="([^"]+)"/);
  const estimatedCost = costMatch ? costMatch[1] : null;

  prompt.appendChild(info);

  if (!connectedAddress) {
    // No wallet connected -- show connect prompt
    const detail = document.createElement("div");
    detail.className = "payment-detail";
    detail.textContent = "Connect a wallet to pay for this request via MPP (Machine Payments Protocol).";
    prompt.appendChild(detail);

    const connectBtn = document.createElement("button");
    connectBtn.className = "payment-connect-btn";
    connectBtn.textContent = "Connect Wallet";
    connectBtn.addEventListener("click", async () => {
      await connectWallet();
      if (connectedAddress) {
        renderPaymentRequired(contentEl, res);
      }
    });
    prompt.appendChild(connectBtn);
  } else {
    // Wallet is connected -- show cost and SDK info
    const detail = document.createElement("div");
    detail.className = "payment-detail";

    let detailText = "Wallet " + truncateAddress(connectedAddress) + " is connected.";
    if (estimatedCost) {
      detailText += " Estimated cost: " + estimatedCost + ".";
    }
    detailText += "\n\nPayment channel setup requires the mppx client SDK, which needs a JavaScript bundler (Vite, webpack, etc.) to run in the browser.";

    detail.textContent = detailText;
    prompt.appendChild(detail);

    const link = document.createElement("a");
    link.className = "payment-link";
    link.href = "https://github.com/mppx/mppx";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "View mppx SDK documentation";
    prompt.appendChild(link);
  }

  contentEl.appendChild(prompt);
}

// ---- Send Message ----

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

      if (DEMO_MODE) {
        contentEl.textContent = "Payment required. Please set up an MPP payment channel.";
      } else {
        renderPaymentRequired(contentEl, res);
      }
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
setupWalletListeners();
checkExistingConnection();
