import { ChatMessage, ChatCitation } from '../lib/types';

export interface ChatPanelOptions {
  documentText: string;
  onSendMessage: (message: string, history: ChatMessage[]) => Promise<{ answer: string; isGrounded?: boolean; citations?: ChatCitation[] }>;
}

export function renderChatPanel(options: ChatPanelOptions): HTMLElement {
  const container = document.createElement('div');
  container.className = 'chat-panel-container';

  let messages: ChatMessage[] = [
    {
      id: 'msg-welcome',
      role: 'assistant',
      content: 'Hello! I am your AI Legal Assistant. Ask me any question about your document. I will answer strictly based on the text provided and cite specific sections.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isGrounded: true,
    },
  ];

  container.innerHTML = `
    <div class="card-widget">
      <div class="widget-header">
        <div>
          <h2 class="widget-title">💬 Grounded Document Q&A</h2>
          <div class="widget-subtitle">Ask direct questions about contract terms and get verified answers with section citations</div>
        </div>
        <button type="button" class="btn btn-outline" id="clear-chat-btn">Clear Chat</button>
      </div>

      <!-- Quick Suggestion Chips -->
      <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; margin-bottom: 1rem;">
        <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted);">Quick suggestions:</span>
        <button type="button" class="btn btn-ghost chip-btn" data-question="What are my primary obligations and responsibilities under this agreement?" style="font-size: 0.8rem; padding: 0.3rem 0.75rem; border: 1px solid var(--border-color); border-radius: 16px;">📋 What are my obligations?</button>
        <button type="button" class="btn btn-ghost chip-btn" data-question="What payment deadlines, fees, or interest penalties apply?" style="font-size: 0.8rem; padding: 0.3rem 0.75rem; border: 1px solid var(--border-color); border-radius: 16px;">💰 What penalties apply?</button>
        <button type="button" class="btn btn-ghost chip-btn" data-question="How can either party terminate this agreement and what notice is required?" style="font-size: 0.8rem; padding: 0.3rem 0.75rem; border: 1px solid var(--border-color); border-radius: 16px;">🚪 How can this be terminated?</button>
      </div>

      <!-- Message History -->
      <div class="chat-window" id="chat-messages-list" role="log" aria-live="polite"></div>

      <!-- Chat Input Bar -->
      <form id="chat-form" style="display: flex; gap: 0.75rem;">
        <label for="chat-input" class="visually-hidden">Ask a question about the document</label>
        <input 
          type="text" 
          id="chat-input" 
          class="form-input" 
          placeholder="Ask a question about this contract (e.g. 'What is the notice period for cancellation?')..."
          autocomplete="off"
        />
        <button type="submit" id="chat-send-btn" class="btn btn-dark">
          Send 📤
        </button>
      </form>
    </div>
  `;

  const messagesList = container.querySelector('#chat-messages-list') as HTMLElement;
  const chatForm = container.querySelector('#chat-form') as HTMLFormElement;
  const chatInput = container.querySelector('#chat-input') as HTMLInputElement;
  const chatSendBtn = container.querySelector('#chat-send-btn') as HTMLButtonElement;
  const clearChatBtn = container.querySelector('#clear-chat-btn') as HTMLButtonElement;

  const renderMessages = () => {
    messagesList.innerHTML = '';
    messages.forEach(msg => {
      const msgBubble = document.createElement('div');
      msgBubble.className = `chat-bubble chat-bubble-${msg.role}`;

      const avatar = msg.role === 'assistant' ? '🤖' : '👤';
      const roleName = msg.role === 'assistant' ? 'Legal Assistant' : 'You';

      const citationsHTML =
        msg.citations && msg.citations.length > 0
          ? `
          <div style="margin-top: 0.75rem; padding-top: 0.5rem; border-top: 1px solid var(--border-color);">
            <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 0.35rem;">📌 Cited Document References:</span>
            <div style="display: flex; flex-direction: column; gap: 0.35rem;">
              ${msg.citations
                .map(
                  c => `
                <div style="background: var(--accent-blue-light); border: 1px solid rgba(37, 99, 235, 0.2); border-radius: var(--radius-sm); padding: 0.35rem 0.6rem; font-size: 0.8rem; color: #1E40AF;">
                  <strong>${escapeHTML(c.clauseTitle)}</strong>
                  ${c.excerpt ? `<span style="display: block; font-size: 0.75rem; color: var(--text-secondary); font-style: italic; margin-top: 0.15rem;">"${escapeHTML(c.excerpt)}"</span>` : ''}
                </div>
              `
                )
                .join('')}
            </div>
          </div>
        `
          : '';

      msgBubble.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.35rem;">
          <span>${avatar}</span>
          <span style="font-weight: 600;">${roleName}</span>
          <span>${msg.timestamp}</span>
          ${
            msg.role === 'assistant' && msg.isGrounded !== undefined
              ? `<span class="badge-status ${msg.isGrounded ? 'badge-low' : 'badge-high'}" style="font-size: 0.7rem; padding: 0.1rem 0.4rem;">${
                  msg.isGrounded ? '✓ Grounded' : '⚠️ Not in Document'
                }</span>`
              : ''
          }
        </div>
        <div style="line-height: 1.5;">${escapeHTML(msg.content)}</div>
        ${citationsHTML}
      `;

      messagesList.appendChild(msgBubble);
    });

    messagesList.scrollTop = messagesList.scrollHeight;
  };

  renderMessages();

  const handleSend = async (userText: string) => {
    if (!userText.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: userText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    messages.push(userMsg);
    renderMessages();
    chatInput.value = '';
    chatSendBtn.disabled = true;
    chatInput.disabled = true;

    const loadingId = `msg-loading-${Date.now()}`;
    messagesList.insertAdjacentHTML(
      'beforeend',
      `<div id="${loadingId}" class="chat-bubble chat-bubble-assistant">
        <span class="spinner">⏳</span> Searching document clauses & extracting citations...
      </div>`
    );
    messagesList.scrollTop = messagesList.scrollHeight;

    try {
      const historyForApi = messages.slice(1, -1);
      const response = await options.onSendMessage(userText, historyForApi);

      document.getElementById(loadingId)?.remove();

      const assistantMsg: ChatMessage = {
        id: `msg-resp-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isGrounded: response.isGrounded,
        citations: response.citations,
      };

      messages.push(assistantMsg);
      renderMessages();
    } catch (err: any) {
      document.getElementById(loadingId)?.remove();
      messages.push({
        id: `msg-err-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${err.message || 'Unable to process query.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isGrounded: false,
      });
      renderMessages();
    } finally {
      chatSendBtn.disabled = false;
      chatInput.disabled = false;
      chatInput.focus();
    }
  };

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSend(chatInput.value);
  });

  container.querySelectorAll('.chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = (btn as HTMLElement).getAttribute('data-question');
      if (q) handleSend(q);
    });
  });

  clearChatBtn.addEventListener('click', () => {
    messages = [messages[0]];
    renderMessages();
  });

  return container;
}

function escapeHTML(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
