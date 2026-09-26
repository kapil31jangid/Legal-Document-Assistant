import { Clause, SimplificationResult, KeyMetadata } from '../lib/types';
import { createRiskBadge, createCategoryBadge } from './riskBadge';

export interface ClauseViewOptions {
  clauses: Clause[];
  simplifiedSections?: SimplificationResult[];
  keyMetadata?: KeyMetadata;
  onSimplifyRequested?: () => void;
  onClassifyRequested?: () => void;
}

export function renderClauseView(options: ClauseViewOptions): HTMLElement {
  const container = document.createElement('div');
  container.className = 'clause-view-container';

  const clauses = options.clauses;
  const metadata = options.keyMetadata;

  const totalCount = clauses.length;
  const highRiskCount = clauses.filter(c => c.classification?.riskLevel === 'HIGH').length;
  const obligationCount = clauses.filter(c => c.classification?.category === 'Obligation' || c.ruleCheck.hasStrongObligations).length;
  const deadlineCount = clauses.filter(c => c.classification?.category === 'Deadline' || c.ruleCheck.hasDeadlines).length;

  // 1. Dashboard 4-Metric Grid (NyayLens Style)
  const metricsGrid = document.createElement('div');
  metricsGrid.className = 'metrics-grid';
  metricsGrid.innerHTML = `
    <div class="metric-card">
      <div class="metric-info">
        <div class="metric-value">${totalCount}</div>
        <div class="metric-label">Total Clauses Segmented</div>
      </div>
      <div class="metric-badge-icon blue">📄</div>
    </div>

    <div class="metric-card">
      <div class="metric-info">
        <div class="metric-value" style="color: var(--status-high-text);">${highRiskCount}</div>
        <div class="metric-label">High Risk Provisions</div>
      </div>
      <div class="metric-badge-icon rose">🚨</div>
    </div>

    <div class="metric-card">
      <div class="metric-info">
        <div class="metric-value" style="color: var(--status-medium-text);">${obligationCount}</div>
        <div class="metric-label">Mandatory Obligations</div>
      </div>
      <div class="metric-badge-icon amber">📋</div>
    </div>

    <div class="metric-card">
      <div class="metric-info">
        <div class="metric-value" style="color: var(--status-low-text);">${deadlineCount}</div>
        <div class="metric-label">Deadlines & Timelines</div>
      </div>
      <div class="metric-badge-icon emerald">⏰</div>
    </div>
  `;
  container.appendChild(metricsGrid);

  // 2. Executive Overview & Key Metadata Card
  if (metadata) {
    const metaCard = document.createElement('div');
    metaCard.className = 'card-widget';
    metaCard.innerHTML = `
      <div class="widget-header">
        <div>
          <h2 class="widget-title">📊 Executive Overview & Key Metadata</h2>
          <div class="widget-subtitle">Extracted contract entities and high-level scope</div>
        </div>
        ${metadata.languageDetected && metadata.languageDetected !== 'English' ? `<span class="badge-status badge-medium">🌐 ${escapeHTML(metadata.languageDetected)} Detected</span>` : ''}
      </div>

      <p style="font-size: 0.95rem; color: var(--text-primary); line-height: 1.6; margin-bottom: 1.25rem;">
        ${escapeHTML(metadata.overview || 'Analysis complete.')}
      </p>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;">
        <div style="background: var(--bg-input); border: 1px solid var(--border-color); padding: 0.85rem 1rem; border-radius: var(--radius-md);">
          <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.4rem;">👥 Parties Involved</div>
          <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
            ${
              metadata.parties && metadata.parties.length > 0
                ? metadata.parties.map(p => `<span class="badge-status badge-neutral">${escapeHTML(p)}</span>`).join('')
                : '<em>Not specified</em>'
            }
          </div>
        </div>

        <div style="background: var(--bg-input); border: 1px solid var(--border-color); padding: 0.85rem 1rem; border-radius: var(--radius-md);">
          <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.4rem;">📅 Key Dates & Timelines</div>
          <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
            ${
              metadata.importantDates && metadata.importantDates.length > 0
                ? metadata.importantDates.map(d => `<span class="badge-status badge-medium">${escapeHTML(d)}</span>`).join('')
                : '<em>No explicit dates specified</em>'
            }
          </div>
        </div>

        <div style="background: var(--bg-input); border: 1px solid var(--border-color); padding: 0.85rem 1rem; border-radius: var(--radius-md);">
          <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.4rem;">💰 Financial Amounts & Penalties</div>
          <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
            ${
              metadata.financialAmounts && metadata.financialAmounts.length > 0
                ? metadata.financialAmounts.map(f => `<span class="badge-status badge-high">${escapeHTML(f)}</span>`).join('')
                : '<em>No financial figures detected</em>'
            }
          </div>
        </div>

        <div style="background: var(--bg-input); border: 1px solid var(--border-color); padding: 0.85rem 1rem; border-radius: var(--radius-md);">
          <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.4rem;">⚖️ Core Rights Granted</div>
          <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
            ${
              metadata.keyRights && metadata.keyRights.length > 0
                ? metadata.keyRights.map(r => `<span class="badge-status badge-low">${escapeHTML(r)}</span>`).join('')
                : '<em>Standard terms</em>'
            }
          </div>
        </div>
      </div>
    `;
    container.appendChild(metaCard);
  }

  // 3. Filter Bar
  const filterBar = document.createElement('div');
  filterBar.className = 'card-widget';
  filterBar.style.padding = '1rem 1.25rem';
  filterBar.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <label for="clause-filter" style="font-size: 0.875rem; font-weight: 600; color: var(--text-secondary);">Filter Clauses:</label>
        <select id="clause-filter" class="form-select" style="width: auto;" aria-label="Filter clauses by risk or category">
          <option value="ALL">All Clauses (${totalCount})</option>
          <option value="HIGH_RISK">🚨 High Risk Only (${highRiskCount})</option>
          <option value="FLAGGED">⚠️ Rule-Flagged (${clauses.filter(c => c.ruleCheck.isFlagged).length})</option>
          <option value="OBLIGATION">📋 Obligations</option>
          <option value="DEADLINE">⏰ Deadlines</option>
        </select>
      </div>

      <button type="button" class="btn btn-outline" id="toggle-all-simplified">
        💡 Toggle Simplified Explanations
      </button>
    </div>
  `;

  // High Risk Alert Banner
  let highRiskBanner: HTMLElement | null = null;
  if (highRiskCount > 0) {
    highRiskBanner = document.createElement('div');
    highRiskBanner.className = 'card-widget';
    highRiskBanner.style.cssText = 'background: var(--status-high-bg); border-color: var(--status-high-border); color: var(--status-high-text); margin-bottom: 1.5rem;';
    highRiskBanner.setAttribute('role', 'alert');
    highRiskBanner.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.85rem;">
        <span style="font-size: 1.5rem;">🚨</span>
        <div>
          <strong>${highRiskCount} High Risk Provision${highRiskCount > 1 ? 's' : ''} Flagged!</strong>
          <div style="font-size: 0.875rem; margin-top: 0.2rem;">These provisions contain strict penalties, broad indemnities, or waivers. We strongly recommend consulting a qualified legal professional before signing.</div>
        </div>
      </div>
    `;
  }

  // 4. Clause List Container
  const clauseList = document.createElement('div');
  clauseList.className = 'clause-list';

  const renderList = (filter = 'ALL') => {
    clauseList.innerHTML = '';

    const filtered = clauses.filter(c => {
      if (filter === 'HIGH_RISK') return c.classification?.riskLevel === 'HIGH';
      if (filter === 'FLAGGED') return c.ruleCheck.isFlagged;
      if (filter === 'OBLIGATION') return c.classification?.category === 'Obligation' || c.ruleCheck.hasStrongObligations;
      if (filter === 'DEADLINE') return c.classification?.category === 'Deadline' || c.ruleCheck.hasDeadlines;
      return true;
    });

    if (filtered.length === 0) {
      clauseList.innerHTML = `
        <div class="card-widget" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
          <p>No clauses match the selected filter "${escapeHTML(filter)}".</p>
        </div>
      `;
      return;
    }

    filtered.forEach((clause) => {
      const card = document.createElement('article');
      card.className = 'card-widget';
      if (clause.classification?.riskLevel === 'HIGH') {
        card.style.borderLeft = '4px solid var(--status-high-text)';
      } else if (clause.classification?.riskLevel === 'MEDIUM') {
        card.style.borderLeft = '4px solid var(--status-medium-text)';
      } else if (clause.classification?.riskLevel === 'LOW') {
        card.style.borderLeft = '4px solid var(--status-low-text)';
      }

      // Clause Card Header
      const header = document.createElement('div');
      header.className = 'widget-header';

      const titleEl = document.createElement('h3');
      titleEl.className = 'widget-title';
      titleEl.textContent = `${clause.index}. ${clause.title}`;
      header.appendChild(titleEl);

      const badgeGroup = document.createElement('div');
      badgeGroup.style.display = 'flex';
      badgeGroup.style.gap = '0.5rem';

      if (clause.classification?.category) {
        badgeGroup.appendChild(createCategoryBadge(clause.classification.category));
      }

      if (clause.classification?.riskLevel) {
        badgeGroup.appendChild(createRiskBadge(clause.classification.riskLevel));
      } else if (clause.ruleCheck.isFlagged) {
        const flagBadge = document.createElement('span');
        flagBadge.className = 'badge-status badge-medium';
        flagBadge.innerHTML = '⚠️ RULE FLAG';
        badgeGroup.appendChild(flagBadge);
      }

      header.appendChild(badgeGroup);
      card.appendChild(header);

      // Rule Precheck Flags
      if (clause.ruleCheck.isFlagged) {
        const ruleCheckDiv = document.createElement('div');
        ruleCheckDiv.style.cssText = 'background: var(--status-medium-bg); border: 1px dashed var(--status-medium-border); padding: 0.75rem 1rem; border-radius: var(--radius-md); font-size: 0.85rem; margin-bottom: 1rem; color: var(--status-medium-text);';
        ruleCheckDiv.innerHTML = `
          <strong>🔍 Fast Rule-Based Flags:</strong>
          <ul style="padding-left: 1.25rem; margin-top: 0.25rem;">
            ${clause.ruleCheck.flaggedReasons.map(r => `<li>${escapeHTML(r)}</li>`).join('')}
          </ul>
        `;
        card.appendChild(ruleCheckDiv);
      }

      // Gemini AI Risk Insight
      if (clause.classification) {
        const aiBox = document.createElement('div');
        aiBox.style.cssText = 'background: var(--accent-blue-light); border: 1px solid rgba(37, 99, 235, 0.2); padding: 0.85rem 1rem; border-radius: var(--radius-md); font-size: 0.875rem; margin-bottom: 1rem; color: #1E40AF;';
        aiBox.innerHTML = `
          <strong>🤖 AI Risk Insight:</strong>
          <div style="margin-top: 0.25rem;"><strong>Why:</strong> ${escapeHTML(clause.classification.reason)}</div>
          <div style="margin-top: 0.15rem;"><strong>Summary:</strong> ${escapeHTML(clause.classification.summary)}</div>
        `;
        card.appendChild(aiBox);
      }

      // Side-by-side Clause Text vs Simplified Explanation
      const body = document.createElement('div');
      body.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;';

      const origCol = document.createElement('div');
      origCol.style.cssText = 'background: var(--bg-input); border: 1px solid var(--border-color); padding: 1rem; border-radius: var(--radius-md);';
      origCol.innerHTML = `
        <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.4rem;">Original Clause Text</div>
        <div style="font-size: 0.875rem; color: var(--text-secondary); white-space: pre-wrap;">${escapeHTML(clause.text)}</div>
      `;

      const simplifiedCol = document.createElement('div');
      simplifiedCol.className = 'simplified-col';
      simplifiedCol.style.cssText = 'background: #FFFFFF; border: 1px solid var(--border-color); padding: 1rem; border-radius: var(--radius-md); box-shadow: var(--shadow-sm);';
      const simpText = clause.simplifiedText || getMatchingSimplifiedText(clause, options.simplifiedSections);

      simplifiedCol.innerHTML = `
        <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--accent-blue); margin-bottom: 0.4rem;">Plain Language Explanation</div>
        <div style="font-size: 0.875rem; color: var(--text-primary); font-weight: 500;">${
          simpText ? escapeHTML(simpText) : '<em>Simplification pending AI processing...</em>'
        }</div>
      `;

      body.appendChild(origCol);
      body.appendChild(simplifiedCol);
      card.appendChild(body);

      clauseList.appendChild(card);
    });
  };

  renderList('ALL');

  const selectFilter = filterBar.querySelector('#clause-filter') as HTMLSelectElement;
  selectFilter.addEventListener('change', (e) => {
    const target = e.target as HTMLSelectElement;
    renderList(target.value);
  });

  let isSimplifiedVisible = true;
  filterBar.querySelector('#toggle-all-simplified')?.addEventListener('click', () => {
    isSimplifiedVisible = !isSimplifiedVisible;
    const simpCols = clauseList.querySelectorAll('.simplified-col') as NodeListOf<HTMLElement>;
    simpCols.forEach(col => {
      col.style.display = isSimplifiedVisible ? 'block' : 'none';
    });
  });

  container.appendChild(filterBar);
  if (highRiskBanner) {
    container.appendChild(highRiskBanner);
  }
  container.appendChild(clauseList);

  return container;
}

function getMatchingSimplifiedText(clause: Clause, sections?: SimplificationResult[]): string | undefined {
  if (!sections || sections.length === 0) return undefined;
  const match = sections.find(s => s.sectionIndex === clause.index || clause.text.includes(s.originalText.slice(0, 30)));
  return match?.simplifiedText;
}

function escapeHTML(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
