import { parseDocumentFile, validateFile } from '../lib/parser';
import { ComparisonResult, ComparisonDiffItem } from '../lib/types';
import { createRiskBadge } from './riskBadge';

export interface ComparisonViewOptions {
  documentAText: string;
  onCompareRequested: (documentBText: string) => Promise<ComparisonResult>;
}

export function renderComparisonView(options: ComparisonViewOptions): HTMLElement {
  const container = document.createElement('div');
  container.className = 'comparison-view-container';

  container.innerHTML = `
    <div class="card-widget">
      <div class="widget-header">
        <div>
          <h2 class="widget-title">⚖️ Side-by-Side Contract Comparison</h2>
          <div class="widget-subtitle">Compare your primary document against a revised draft or counter-offer to highlight clause-level diffs and practical implications.</div>
        </div>
      </div>

      <div style="margin-top: 1rem;">
        <label for="compare-file-input" style="font-size: 0.875rem; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 0.5rem;">
          Upload Revised Document (Document B):
        </label>
        <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
          <input type="file" id="compare-file-input" accept=".pdf,.docx,.txt,.md" class="form-input" style="width: auto;" />
          <span style="font-size: 0.85rem; color: var(--text-muted);">OR</span>
          <button type="button" class="btn btn-outline" id="paste-doc-b-btn">Paste Document B Text</button>
        </div>
      </div>

      <div id="paste-doc-b-container" style="display: none; margin-top: 1rem;">
        <textarea id="paste-doc-b-input" class="form-textarea" rows="6" placeholder="Paste revised contract text here..."></textarea>
      </div>

      <div style="margin-top: 1.25rem;">
        <button type="button" class="btn btn-dark" id="run-compare-btn" disabled>
          🔄 Run Semantic Document Comparison
        </button>
      </div>

      <div id="compare-status" style="display: none; margin-top: 1rem; padding: 0.75rem 1rem; border-radius: var(--radius-md); font-size: 0.875rem;"></div>
    </div>

    <div id="comparison-results" style="display: none;"></div>
  `;

  const compareFileInput = container.querySelector('#compare-file-input') as HTMLInputElement;
  const pasteDocBBtn = container.querySelector('#paste-doc-b-btn') as HTMLButtonElement;
  const pasteDocBContainer = container.querySelector('#paste-doc-b-container') as HTMLElement;
  const pasteDocBInput = container.querySelector('#paste-doc-b-input') as HTMLTextAreaElement;
  const runCompareBtn = container.querySelector('#run-compare-btn') as HTMLButtonElement;
  const compareStatus = container.querySelector('#compare-status') as HTMLElement;
  const comparisonResults = container.querySelector('#comparison-results') as HTMLElement;

  let documentBText = '';

  pasteDocBBtn.addEventListener('click', () => {
    pasteDocBContainer.style.display = pasteDocBContainer.style.display === 'none' ? 'block' : 'none';
  });

  pasteDocBInput.addEventListener('input', () => {
    documentBText = pasteDocBInput.value.trim();
    runCompareBtn.disabled = !documentBText;
  });

  compareFileInput.addEventListener('change', async () => {
    if (compareFileInput.files && compareFileInput.files[0]) {
      const file = compareFileInput.files[0];
      const validation = validateFile(file);
      if (!validation.valid) {
        compareStatus.style.display = 'block';
        compareStatus.style.background = 'var(--status-high-bg)';
        compareStatus.style.color = 'var(--status-high-text)';
        compareStatus.textContent = validation.error || 'Invalid file';
        return;
      }

      compareStatus.style.display = 'block';
      compareStatus.style.background = 'var(--accent-blue-light)';
      compareStatus.style.color = 'var(--accent-blue)';
      compareStatus.innerHTML = `⏳ Extracting text from <strong>${escapeHTML(file.name)}</strong>...`;

      try {
        documentBText = await parseDocumentFile(file);
        compareStatus.style.background = 'var(--status-low-bg)';
        compareStatus.style.color = 'var(--status-low-text)';
        compareStatus.innerHTML = `✅ Document B loaded: <strong>${escapeHTML(file.name)}</strong> (${documentBText.length.toLocaleString()} chars).`;
        runCompareBtn.disabled = false;
      } catch (err: any) {
        compareStatus.style.background = 'var(--status-high-bg)';
        compareStatus.style.color = 'var(--status-high-text)';
        compareStatus.textContent = err.message || 'Failed to parse Document B.';
        runCompareBtn.disabled = true;
      }
    }
  });

  runCompareBtn.addEventListener('click', async () => {
    if (!documentBText) return;

    runCompareBtn.disabled = true;
    compareStatus.style.display = 'block';
    compareStatus.style.background = 'var(--accent-blue-light)';
    compareStatus.style.color = 'var(--accent-blue)';
    compareStatus.innerHTML = `⏳ Analyzing semantic differences with Gemini AI...`;
    comparisonResults.style.display = 'none';

    try {
      const result = await options.onCompareRequested(documentBText);
      compareStatus.style.display = 'none';
      renderComparisonResults(comparisonResults, result);
      comparisonResults.style.display = 'block';
    } catch (err: any) {
      compareStatus.style.background = 'var(--status-high-bg)';
      compareStatus.style.color = 'var(--status-high-text)';
      compareStatus.textContent = err.message || 'Error comparing documents.';
    } finally {
      runCompareBtn.disabled = false;
    }
  });

  return container;
}

function renderComparisonResults(container: HTMLElement, result: ComparisonResult) {
  container.innerHTML = `
    <div class="card-widget">
      <h3 class="widget-title">📊 Executive Diff Summary</h3>
      <p style="font-size: 0.95rem; color: var(--text-primary); margin-top: 0.5rem; line-height: 1.6;">${escapeHTML(result.summary)}</p>
      
      ${
        result.keyDifferences && result.keyDifferences.length > 0
          ? `
          <div style="background: var(--bg-input); border: 1px solid var(--border-color); padding: 1rem; border-radius: var(--radius-md); margin-top: 1rem;">
            <strong style="font-size: 0.85rem; text-transform: uppercase; color: var(--text-muted);">Key Semantic Changes:</strong>
            <ul style="padding-left: 1.25rem; margin-top: 0.35rem; font-size: 0.9rem; color: var(--text-secondary);">
              ${result.keyDifferences.map(kd => `<li>${escapeHTML(kd)}</li>`).join('')}
            </ul>
          </div>
        `
          : ''
      }
    </div>

    <div style="margin-bottom: 1rem;">
      <h3 style="font-size: 1.1rem; font-weight: 700;">Clause-by-Clause Semantic Diff</h3>
    </div>

    <div style="display: flex; flex-direction: column; gap: 1rem;">
      ${result.diffs.map(diff => renderDiffItem(diff)).join('')}
    </div>
  `;
}

function renderDiffItem(diff: ComparisonDiffItem): string {
  const statusLabels: Record<string, { label: string; icon: string; badgeClass: string }> = {
    added: { label: 'ADDED PROVISION', icon: '➕', badgeClass: 'badge-low' },
    removed: { label: 'REMOVED PROVISION', icon: '➖', badgeClass: 'badge-high' },
    modified: { label: 'MODIFIED PROVISION', icon: '📝', badgeClass: 'badge-medium' },
    unchanged: { label: 'UNCHANGED', icon: '🔒', badgeClass: 'badge-neutral' },
  };

  const statusInfo = statusLabels[diff.status] || statusLabels.modified;

  return `
    <div class="card-widget">
      <div class="widget-header">
        <div style="display: flex; align-items: center; gap: 0.6rem;">
          <span class="badge-status ${statusInfo.badgeClass}">
            ${statusInfo.icon} ${statusInfo.label}
          </span>
          <h4 style="font-size: 1rem; font-weight: 700;">${escapeHTML(diff.title)}</h4>
        </div>
        ${createRiskBadge(diff.riskLevel).outerHTML}
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1rem 0;">
        ${
          diff.originalText
            ? `
            <div style="background: var(--bg-input); border: 1px solid var(--border-color); padding: 0.85rem; border-radius: var(--radius-md); font-size: 0.875rem;">
              <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.35rem;">Document A (Original)</div>
              <div style="color: var(--text-secondary); white-space: pre-wrap;">${escapeHTML(diff.originalText)}</div>
            </div>
          `
            : ''
        }
        ${
          diff.compareText
            ? `
            <div style="background: #FFFFFF; border: 1px solid var(--border-color); padding: 0.85rem; border-radius: var(--radius-md); font-size: 0.875rem; box-shadow: var(--shadow-sm);">
              <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--accent-blue); margin-bottom: 0.35rem;">Document B (Revised)</div>
              <div style="color: var(--text-primary); white-space: pre-wrap;">${escapeHTML(diff.compareText)}</div>
            </div>
          `
            : ''
        }
      </div>

      <div style="background: var(--accent-blue-light); border-left: 3px solid var(--accent-blue); padding: 0.75rem 1rem; border-radius: var(--radius-sm); font-size: 0.875rem; color: #1E40AF;">
        <strong>💡 Practical Implication for You:</strong>
        <p style="margin-top: 0.2rem;">${escapeHTML(diff.practicalImplication)}</p>
      </div>
    </div>
  `;
}

function escapeHTML(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
