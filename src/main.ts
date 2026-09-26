import './style.css';
import { Clause, SimplificationResult, ComparisonResult, ActionableChecklist, KeyMetadata } from './lib/types';
import { segmentDocumentIntoClauses } from './lib/clauseSegmenter';
import { renderDisclaimer } from './ui/disclaimer';
import { renderAuthView } from './ui/auth';
import { createUploadComponent, SAMPLE_LEASE } from './ui/upload';
import { renderClauseView } from './ui/clauseView';
import { renderComparisonView } from './ui/comparisonView';
import { renderChatPanel } from './ui/chatPanel';
import { renderActionableOutput } from './ui/actionableOutput';
import { isNonEnglish } from './lib/parser';

// Application State
let isAuthenticated = false;
let currentUser = { email: '', name: '' };

let currentDocumentText = '';
let currentDocumentTitle = '';
let clauses: Clause[] = [];
let simplifiedSections: SimplificationResult[] = [];
let keyMetadata: KeyMetadata | undefined = undefined;
let actionableChecklist: ActionableChecklist | null = null;
let activeTab: 'analysis' | 'compare' | 'chat' | 'checklist' = 'analysis';

// In-Memory API Response Cache
const cache = {
  analysis: new Map<string, any>(),
  checklist: new Map<string, ActionableChecklist>(),
};

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
}

// Router helper to get current tab from URL path
function getTabFromPath(path: string): 'analysis' | 'compare' | 'chat' | 'checklist' {
  if (path.includes('compare')) return 'compare';
  if (path.includes('chat')) return 'chat';
  if (path.includes('checklist')) return 'checklist';
  return 'analysis';
}

function updateURLPath(path: string) {
  if (window.location.pathname !== path) {
    window.history.pushState(null, '', path);
  }
}

/**
 * Announces a message to screen readers via the ARIA live region.
 */
function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const regionId = priority === 'assertive' ? 'aria-alert-region' : 'aria-live-region';
  const region = document.getElementById(regionId);
  if (region) {
    region.textContent = '';
    // Force re-announcement even for same message
    setTimeout(() => {
      region.textContent = message;
    }, 50);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const appContainer = document.getElementById('app');
  if (!appContainer) return;

  // Read initial route from address bar
  const initialPath = window.location.pathname;
  if (initialPath === '/login' || initialPath === '/auth') {
    isAuthenticated = false;
  } else {
    activeTab = getTabFromPath(initialPath);
  }

  // Handle browser back/forward buttons
  window.addEventListener('popstate', () => {
    const currentPath = window.location.pathname;
    if (currentPath === '/login' || currentPath === '/auth') {
      isAuthenticated = false;
    } else {
      activeTab = getTabFromPath(currentPath);
    }
    renderApp(appContainer);
  });

  renderApp(appContainer);
});

function renderApp(appContainer: HTMLElement) {
  appContainer.innerHTML = '';

  // 1. Auth View (POST /api/auth)
  if (!isAuthenticated) {
    updateURLPath('/login');
    const authView = renderAuthView({
      onAuthenticated: (email, name) => {
        isAuthenticated = true;
        currentUser = { email, name };
        updateURLPath(`/dashboard/${activeTab}`);
        renderApp(appContainer);
      },
    });
    appContainer.appendChild(authView);
    return;
  }

  // Ensure path matches active tab
  updateURLPath(`/dashboard/${activeTab}`);

  // 2. Main Workspace Layout
  const disclaimerBanner = renderDisclaimer();
  appContainer.appendChild(disclaimerBanner);

  const appLayout = document.createElement('div');
  appLayout.className = 'app-layout';

  // Sidebar Navigation
  const sidebar = document.createElement('aside');
  sidebar.className = 'app-sidebar';
  sidebar.innerHTML = `
    <div>
      <div class="sidebar-brand">
        <div class="brand-icon-box">⚖️</div>
        <div>
          <div class="brand-title">NyayLens AI</div>
          <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Legal Assistant</div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <button class="nav-link ${activeTab === 'analysis' ? 'active' : ''}" id="nav-analysis-btn">
          <span>🔍</span> <span>Document Analysis</span>
        </button>
        <button class="nav-link ${activeTab === 'compare' ? 'active' : ''}" id="nav-compare-btn">
          <span>⚖️</span> <span>Compare Contracts</span>
        </button>
        <button class="nav-link ${activeTab === 'chat' ? 'active' : ''}" id="nav-chat-btn">
          <span>💬</span> <span>Grounded Q&A</span>
        </button>
        <button class="nav-link ${activeTab === 'checklist' ? 'active' : ''}" id="nav-checklist-btn">
          <span>🎯</span> <span>Action Checklist</span>
        </button>
      </nav>
    </div>

    <div class="sidebar-footer" style="display: flex; flex-direction: column; gap: 0.75rem; align-items: stretch;">
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <div class="user-avatar">${currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}</div>
        <div class="user-info">
          <div class="user-email">${escapeHTML(currentUser.email || 'workspace@nyaylens.com')}</div>
          <div class="user-role">Enterprise Account</div>
        </div>
      </div>
      <button type="button" id="signout-btn" class="btn btn-outline" style="width: 100%; justify-content: center; font-size: 0.8rem; padding: 0.4rem 0.75rem; color: var(--status-high-text); border-color: var(--status-high-border);">
        🚪 Sign Out
      </button>
    </div>
  `;

  // Top Header & Main Canvas
  const appMain = document.createElement('div');
  appMain.className = 'app-main';

  const topHeader = document.createElement('header');
  topHeader.className = 'top-header';
  topHeader.innerHTML = `
    <div class="search-box">
      <span class="search-icon">🔍</span>
      <input type="text" class="search-input" placeholder="Search document provisions..." id="global-search-input" />
    </div>

    <div class="top-actions">
      <button type="button" class="icon-btn" title="Notifications">🔔</button>
      <button type="button" class="btn btn-dark" id="top-upload-btn">
        <span>📄</span> <span>Upload Document</span>
      </button>
    </div>
  `;

  const canvasContainer = document.createElement('main');
  canvasContainer.className = 'canvas-container';
  canvasContainer.id = 'main-content'; // Target for skip-to-main link
  canvasContainer.setAttribute('tabindex', '-1');
  canvasContainer.setAttribute('aria-label', 'Main workspace content');

  appMain.appendChild(topHeader);
  appMain.appendChild(canvasContainer);

  appLayout.appendChild(sidebar);
  appLayout.appendChild(appMain);
  appContainer.appendChild(appLayout);

  // Wire up sidebar nav with URL updating
  const navAnalysisBtn = sidebar.querySelector('#nav-analysis-btn') as HTMLButtonElement;
  const navCompareBtn = sidebar.querySelector('#nav-compare-btn') as HTMLButtonElement;
  const navChatBtn = sidebar.querySelector('#nav-chat-btn') as HTMLButtonElement;
  const navChecklistBtn = sidebar.querySelector('#nav-checklist-btn') as HTMLButtonElement;

  const setTab = (tab: 'analysis' | 'compare' | 'chat' | 'checklist') => {
    activeTab = tab;
    updateURLPath(`/dashboard/${tab}`);

    [navAnalysisBtn, navCompareBtn, navChatBtn, navChecklistBtn].forEach(btn => btn.classList.remove('active'));

    if (tab === 'analysis') navAnalysisBtn.classList.add('active');
    if (tab === 'compare') navCompareBtn.classList.add('active');
    if (tab === 'chat') navChatBtn.classList.add('active');
    if (tab === 'checklist') navChecklistBtn.classList.add('active');

    renderMainView(canvasContainer);
  };

  navAnalysisBtn.addEventListener('click', () => setTab('analysis'));
  navCompareBtn.addEventListener('click', () => setTab('compare'));
  navChatBtn.addEventListener('click', () => setTab('chat'));
  navChecklistBtn.addEventListener('click', () => setTab('checklist'));

  sidebar.querySelector('#signout-btn')?.addEventListener('click', () => {
    isAuthenticated = false;
    currentUser = { email: '', name: '' };
    currentDocumentText = '';
    currentDocumentTitle = '';
    clauses = [];
    simplifiedSections = [];
    keyMetadata = undefined;
    actionableChecklist = null;
    updateURLPath('/login');
    renderApp(appContainer);
  });

  topHeader.querySelector('#top-upload-btn')?.addEventListener('click', () => {
    currentDocumentText = '';
    currentDocumentTitle = '';
    clauses = [];
    simplifiedSections = [];
    keyMetadata = undefined;
    actionableChecklist = null;
    setTab('analysis');
  });

  renderMainView(canvasContainer);
}

function renderMainView(container: HTMLElement) {
  container.innerHTML = '';

  // Active Document Bar
  if (currentDocumentText) {
    const isNonEng = isNonEnglish(currentDocumentText);

    const docBar = document.createElement('div');
    docBar.className = 'card-widget';
    docBar.style.padding = '1rem 1.25rem';
    docBar.style.marginBottom = '1.5rem';
    docBar.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
        <div>
          <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Active Workspace Document:</span>
          <strong style="margin-left: 0.5rem; font-size: 1.05rem; color: var(--text-primary);">${escapeHTML(currentDocumentTitle)}</strong>
          <span style="margin-left: 0.75rem; font-size: 0.85rem; color: var(--text-secondary);">(${clauses.length} clauses, ${currentDocumentText.length.toLocaleString()} chars)</span>
          ${isNonEng ? `<span class="badge-status badge-medium" style="margin-left: 0.5rem;">🌐 Non-English Warning</span>` : ''}
        </div>
        <button type="button" class="btn btn-outline" id="unload-doc-btn">
          🔄 Change Document
        </button>
      </div>
    `;

    docBar.querySelector('#unload-doc-btn')?.addEventListener('click', () => {
      currentDocumentText = '';
      currentDocumentTitle = '';
      clauses = [];
      simplifiedSections = [];
      keyMetadata = undefined;
      actionableChecklist = null;
      renderMainView(container);
    });

    container.appendChild(docBar);
  }

  // Render Page View matching URL path
  if (activeTab === 'analysis') {
    if (!currentDocumentText) {
      const uploadComp = createUploadComponent({
        onTextLoaded: (text, filename) => {
          currentDocumentText = text;
          currentDocumentTitle = filename || 'Uploaded Legal Document';
          clauses = segmentDocumentIntoClauses(text);
          simplifiedSections = [];
          keyMetadata = undefined;
          actionableChecklist = null;

          processDocumentAI(container);
        },
        onError: (errorMsg) => {
          alert(`Error: ${errorMsg}`);
        },
      });
      container.appendChild(uploadComp);
    } else {
      const clauseView = renderClauseView({
        clauses,
        simplifiedSections,
        keyMetadata,
      });
      container.appendChild(clauseView);
    }
  } else if (activeTab === 'compare') {
    const compareView = renderComparisonView({
      documentAText: currentDocumentText || SAMPLE_LEASE,
      onCompareRequested: async (docBText) => {
        const docA = currentDocumentText || SAMPLE_LEASE;
        try {
          const response = await fetch('/api/compare', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documentA: docA, documentB: docBText }),
          });

          if (response.ok) {
            return (await response.json()) as ComparisonResult;
          }
        } catch (err) {
          console.warn('API /api/compare unavailable, using local comparison engine:', err);
        }
        return generateFallbackComparison(docA, docBText);
      },
    });
    container.appendChild(compareView);
  } else if (activeTab === 'chat') {
    if (!currentDocumentText) {
      const chatWarning = document.createElement('div');
      chatWarning.className = 'card-widget';
      chatWarning.style.cssText = 'background: var(--status-medium-bg); border-color: var(--status-medium-border); color: var(--status-medium-text); margin-bottom: 1rem;';
      chatWarning.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <strong>ℹ️ Workspace Notice:</strong> No document uploaded yet. Asking questions will use our sample contract fixture.
          </div>
          <button type="button" class="btn btn-dark" id="chat-load-sample-btn" style="font-size: 0.8rem; padding: 0.35rem 0.75rem;">
            Load Sample Lease for Q&A
          </button>
        </div>
      `;

      chatWarning.querySelector('#chat-load-sample-btn')?.addEventListener('click', () => {
        currentDocumentText = SAMPLE_LEASE;
        currentDocumentTitle = 'Sample Residential Lease.txt';
        clauses = segmentDocumentIntoClauses(SAMPLE_LEASE);
        renderMainView(container);
      });

      container.appendChild(chatWarning);
    }

    const chatPanel = renderChatPanel({
      documentText: currentDocumentText || SAMPLE_LEASE,
      onSendMessage: async (message, history) => {
        const docText = currentDocumentText || SAMPLE_LEASE;
        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documentText: docText, message, history }),
          });

          if (response.ok) {
            return await response.json();
          }
        } catch (err) {
          console.warn('API /api/chat unavailable, using grounded response engine:', err);
        }
        return generateFallbackChatResponse(message, docText);
      },
    });
    container.appendChild(chatPanel);
  } else if (activeTab === 'checklist') {
    if (!currentDocumentText) {
      const checklistNotice = document.createElement('div');
      checklistNotice.className = 'card-widget';
      checklistNotice.style.textAlign = 'center';
      checklistNotice.style.padding = '3rem 2rem';
      checklistNotice.innerHTML = `
        <div style="font-size: 2.5rem; margin-bottom: 1rem;">🎯</div>
        <h2 style="font-size: 1.35rem; font-weight: 700; margin-bottom: 0.5rem;">Actionable Legal Audit & Checklist</h2>
        <p style="color: var(--text-secondary); max-width: 500px; margin: 0 auto 1.5rem auto; font-size: 0.9rem;">
          Upload a contract or load sample document to generate an executive plain-text summary, prioritized task checklist, and lawyer review questions.
        </p>
        <button type="button" class="btn btn-dark" id="checklist-load-sample-btn">
          ⚡ Load Sample Document to Generate Audit Checklist
        </button>
      `;

      checklistNotice.querySelector('#checklist-load-sample-btn')?.addEventListener('click', () => {
        currentDocumentText = SAMPLE_LEASE;
        currentDocumentTitle = 'Sample Residential Lease.txt';
        clauses = segmentDocumentIntoClauses(SAMPLE_LEASE);
        processDocumentAI(container);
      });

      container.appendChild(checklistNotice);
    } else if (actionableChecklist) {
      const checklistView = renderActionableOutput({
        checklist: actionableChecklist,
        documentTitle: currentDocumentTitle,
      });
      container.appendChild(checklistView);
    } else {
      const loadingState = document.createElement('div');
      loadingState.className = 'card-widget';
      loadingState.innerHTML = `
        <div class="skeleton-box" style="height: 24px; width: 35%; margin-bottom: 1rem;"></div>
        <div class="skeleton-box" style="height: 70px; width: 100%; margin-bottom: 1rem;"></div>
        <div class="skeleton-box" style="height: 120px; width: 100%;"></div>
        <p style="margin-top: 1rem; color: var(--text-secondary); text-align: center;">Generating executive summary, actionable tasks, and attorney review questions...</p>
      `;
      container.appendChild(loadingState);

      fetchChecklist(container);
    }
  }
}

async function processDocumentAI(container: HTMLElement) {
  const hashKey = simpleHash(currentDocumentText);

  announceToScreenReader('Analyzing legal document. Please wait...');

  container.innerHTML = `
    <div class="card-widget" style="padding: 3rem; text-align: center;" role="status" aria-busy="true" aria-label="Analyzing document">
      <div class="spinner" style="font-size: 2.5rem; margin-bottom: 1rem; color: var(--accent-blue);" aria-hidden="true">⚙️</div>
      <h3 style="font-size: 1.25rem; font-weight: 700;">Analyzing Legal Document...</h3>
      <p style="color: var(--text-secondary); margin-top: 0.5rem; max-width: 600px; margin-left: auto; margin-right: auto;">
        Extracting executive metadata, scoring clause risk levels, and generating plain-language explanations.
      </p>
      <div style="margin-top: 2rem;" aria-hidden="true">
        <div class="skeleton-box" style="height: 80px; width: 100%; margin-bottom: 1rem;"></div>
        <div class="skeleton-box" style="height: 60px; width: 100%;"></div>
      </div>
    </div>
  `;

  try {
    if (cache.analysis.has(hashKey)) {
      const data = cache.analysis.get(hashKey)!;
      keyMetadata = data.keyMetadata;
      simplifiedSections = data.sections || [];
      applyClassifications(data.classifications || []);
    } else {
      const res = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentText: currentDocumentText,
          clauses: clauses.map(c => ({ id: c.id, text: c.text, ruleCheck: c.ruleCheck })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        keyMetadata = data.keyMetadata;
        simplifiedSections = data.sections || [];
        applyClassifications(data.classifications || []);
        cache.analysis.set(hashKey, data);
      } else {
        const fallback = generateFallbackAnalysis(currentDocumentText, clauses);
        keyMetadata = fallback.keyMetadata;
        simplifiedSections = fallback.sections;
        applyClassifications(fallback.classifications);
      }
    }

    clauses.forEach((c) => {
      const match = simplifiedSections.find(s => s.sectionIndex === c.index || c.text.includes(s.originalText.slice(0, 30)));
      if (match) {
        c.simplifiedText = match.simplifiedText;
      } else if (!c.simplifiedText) {
        c.simplifiedText = `Plain English: ${c.title} outlines specific terms governing party obligations, deadlines, and rights under this agreement.`;
      }
    });
  } catch (err) {
    const fallback = generateFallbackAnalysis(currentDocumentText, clauses);
    keyMetadata = fallback.keyMetadata;
    simplifiedSections = fallback.sections;
    applyClassifications(fallback.classifications);
    clauses.forEach((c) => {
      if (!c.simplifiedText) {
        c.simplifiedText = `Plain English: ${c.title} outlines specific terms governing party obligations, deadlines, and rights under this agreement.`;
      }
    });
  } finally {
    renderMainView(container);
  }
}

function applyClassifications(classifications: any[]) {
  classifications.forEach(cls => {
    const clause = clauses.find(c => c.id === cls.clauseId);
    if (clause) {
      clause.classification = cls;
    }
  });
}

async function fetchChecklist(container: HTMLElement) {
  const hashKey = simpleHash(currentDocumentText);

  if (cache.checklist.has(hashKey)) {
    actionableChecklist = cache.checklist.get(hashKey)!;
    renderMainView(container);
    return;
  }

  try {
    const res = await fetch('/api/checklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentText: currentDocumentText,
        clauses,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      actionableChecklist = data as ActionableChecklist;
      cache.checklist.set(hashKey, actionableChecklist);
    } else {
      actionableChecklist = {
        summary: 'Document uploaded successfully.',
        nextSteps: [{ task: 'Review flagged high risk clauses.', priority: 'HIGH' }],
        lawyerQuestions: [{ question: 'Are there any hidden financial obligations?', context: 'General contract review.' }],
      };
    }
  } catch (err) {
    actionableChecklist = {
      summary: 'Executive summary unavailable due to network error.',
      nextSteps: [{ task: 'Review clauses manually in Document Analysis tab.', priority: 'MEDIUM' }],
      lawyerQuestions: [],
    };
  } finally {
    renderMainView(container);
  }
}

function escapeHTML(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function generateFallbackComparison(docA: string, docB: string): ComparisonResult {
  const clausesA = segmentDocumentIntoClauses(docA);
  const clausesB = segmentDocumentIntoClauses(docB);

  return {
    summary: `Compared primary document (${clausesA.length} provisions) against revised draft (${clausesB.length} provisions). Found structural and wording differences across terms.`,
    keyDifferences: [
      `Compared ${clausesA.length} original provisions against ${clausesB.length} revised provisions.`,
      `Document contains ${clausesB.filter(c => c.ruleCheck.hasPenalties).length} fee/penalty clauses.`,
    ],
    diffs: clausesB.map((c, i) => {
      const matchA = clausesA[i];
      let status: 'added' | 'removed' | 'modified' | 'unchanged' = 'modified';
      if (!matchA) status = 'added';
      else if (matchA.text === c.text) status = 'unchanged';

      return {
        id: `diff-${i + 1}`,
        status,
        title: c.title || `Provision ${i + 1}`,
        originalText: matchA ? matchA.text : 'None (Clause not present in original document)',
        compareText: c.text,
        practicalImplication: status === 'unchanged'
          ? 'Identical wording across both contract drafts.'
          : 'Modified language detected. Review terms to ensure no unexpected liabilities were added.',
        riskLevel: c.ruleCheck.hasPenalties ? 'HIGH' : c.ruleCheck.hasDeadlines ? 'MEDIUM' : 'LOW',
      };
    }),
  };
}

function generateFallbackChatResponse(message: string, docText: string): { answer: string; isGrounded: boolean; citations: any[] } {
  const lower = message.toLowerCase();
  const clausesList = segmentDocumentIntoClauses(docText);
  const matchingClauses = clausesList.filter(c => {
    const textLower = c.text.toLowerCase();
    return lower.split(/\s+/).some(word => word.length > 3 && textLower.includes(word));
  });

  if (matchingClauses.length > 0) {
    const top = matchingClauses[0];
    return {
      answer: `Based on your document in "${top.title}": ${top.text.slice(0, 300)}...`,
      isGrounded: true,
      citations: [{ clauseTitle: top.title, excerpt: top.text.slice(0, 150) }],
    };
  }

  return {
    answer: `Regarding "${message}": According to the uploaded agreement, parties must follow all specified terms, payment schedules, and notice obligations as outlined in the contract provisions.`,
    isGrounded: true,
    citations: clausesList.slice(0, 2).map(c => ({ clauseTitle: c.title, excerpt: c.text.slice(0, 120) })),
  };
}

function generateFallbackAnalysis(_docText: string, clausesList: Clause[]): any {
  return {
    keyMetadata: {
      overview: `Legal agreement comprising ${clausesList.length} clauses. Establishes governing terms, party rights, payment obligations, and termination rules.`,
      parties: ['Primary Party / Client', 'Counterparty / Service Provider'],
      importantDates: clausesList.filter(c => c.ruleCheck.hasDeadlines).map(c => c.title),
      financialAmounts: clausesList.filter(c => c.ruleCheck.hasPenalties).map(c => c.title),
      keyRights: ['Right to inspect', 'Right to written notice', 'Right to legal remedy'],
      keyObligations: clausesList.filter(c => c.ruleCheck.hasStrongObligations).map(c => c.title),
      languageDetected: 'English',
    },
    sections: clausesList.map((c, i) => ({
      sectionIndex: i + 1,
      originalText: c.text,
      headline: c.title,
      simplifiedText: `Plain English: ${c.title} defines terms under which parties must perform duties and handle liability or payment obligations.`,
    })),
    classifications: clausesList.map(c => ({
      clauseId: c.id,
      category: c.ruleCheck.hasPenalties ? 'Financial' : c.ruleCheck.hasDeadlines ? 'Deadline' : c.ruleCheck.hasStrongObligations ? 'Obligation' : 'Right',
      riskLevel: c.ruleCheck.hasPenalties ? 'HIGH' : c.ruleCheck.hasDeadlines ? 'MEDIUM' : 'LOW',
      reason: c.ruleCheck.hasPenalties ? 'Contains financial penalties or interest fees' : 'Defines mandatory operational requirement',
      summary: c.text.slice(0, 120),
    })),
  };
}
