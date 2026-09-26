import { ActionableChecklist } from '../lib/types';
import { createRiskBadge } from './riskBadge';

export interface ActionableOutputOptions {
  checklist: ActionableChecklist;
  documentTitle?: string;
}

export function renderActionableOutput(options: ActionableOutputOptions): HTMLElement {
  const container = document.createElement('div');
  container.className = 'actionable-output-container';

  const { checklist, documentTitle = 'Legal Document' } = options;

  container.innerHTML = `
    <div class="card-widget">
      <div class="widget-header" style="border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; margin-bottom: 1.5rem;">
        <div>
          <h2 class="widget-title">🎯 Actionable Legal Audit & Checklist</h2>
          <div class="widget-subtitle">Generated key takeaways, required next steps, and attorney review questions.</div>
        </div>
        <div style="display: flex; gap: 0.65rem;">
          <button type="button" class="btn btn-outline" id="download-txt-btn">
            📥 Download (.TXT)
          </button>
          <button type="button" class="btn btn-dark" id="download-md-btn">
            📄 Download (.MD)
          </button>
        </div>
      </div>

      <!-- Executive Summary -->
      <section style="margin-bottom: 1.75rem;">
        <h3 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 0.5rem;">📝 Executive Summary</h3>
        <p style="font-size: 0.95rem; color: var(--text-primary); line-height: 1.6;">${escapeHTML(checklist.summary)}</p>
      </section>

      <!-- Next Steps Checklist -->
      <section style="margin-bottom: 1.75rem;">
        <h3 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 0.75rem;">✅ Recommended Next Steps & Tasks</h3>
        <div style="display: flex; flex-direction: column; gap: 0.65rem;">
          ${checklist.nextSteps
            .map(
              (step, idx) => `
            <div style="background: var(--bg-input); border: 1px solid var(--border-color); padding: 0.85rem 1rem; border-radius: var(--radius-md); display: flex; align-items: center; gap: 0.75rem;">
              <input type="checkbox" id="task-chk-${idx}" style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--accent-blue);" />
              <label for="task-chk-${idx}" style="cursor: pointer; display: flex; align-items: center; gap: 0.65rem; flex: 1; font-size: 0.9rem;">
                ${createRiskBadge(step.priority).outerHTML}
                <span style="color: var(--text-primary); font-weight: 500;">${escapeHTML(step.task)}</span>
                ${step.relatedClause ? `<span style="font-size: 0.8rem; color: var(--text-muted);">(${escapeHTML(step.relatedClause)})</span>` : ''}
              </label>
            </div>
          `
            )
            .join('')}
        </div>
      </section>

      <!-- Questions for Lawyer -->
      <section>
        <h3 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 0.75rem;">⚖️ Questions to Ask Your Lawyer</h3>
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          ${checklist.lawyerQuestions
            .map(
              (q, idx) => `
            <div style="background: var(--bg-input); border: 1px solid var(--border-color); padding: 1rem; border-radius: var(--radius-md);">
              <div style="display: flex; gap: 0.5rem; font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">
                <span style="color: var(--accent-blue);">Q${idx + 1}.</span>
                <span>${escapeHTML(q.question)}</span>
              </div>
              <div style="font-size: 0.85rem; color: var(--text-secondary);">
                <em>Context from Document:</em> ${escapeHTML(q.context)}
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      </section>
    </div>
  `;

  const downloadTxtBtn = container.querySelector('#download-txt-btn') as HTMLButtonElement;
  const downloadMdBtn = container.querySelector('#download-md-btn') as HTMLButtonElement;

  downloadTxtBtn.addEventListener('click', () => {
    const txtContent = generateTxtExport(checklist, documentTitle);
    triggerBlobDownload(txtContent, `${cleanFileName(documentTitle)}_Audit.txt`, 'text/plain');
  });

  downloadMdBtn.addEventListener('click', () => {
    const mdContent = generateMdExport(checklist, documentTitle);
    triggerBlobDownload(mdContent, `${cleanFileName(documentTitle)}_Audit.md`, 'text/markdown');
  });

  return container;
}

function generateTxtExport(checklist: ActionableChecklist, docTitle: string): string {
  let output = `=====================================================\n`;
  output += `LEGAL DOCUMENT ASSISTANT - ACTIONABLE AUDIT REPORT\n`;
  output += `Document: ${docTitle}\n`;
  output += `Date Generated: ${new Date().toLocaleDateString()}\n`;
  output += `=====================================================\n\n`;

  output += `1. EXECUTIVE SUMMARY\n`;
  output += `-----------------------------------------------------\n`;
  output += `${checklist.summary}\n\n`;

  output += `2. RECOMMENDED NEXT STEPS CHECKLIST\n`;
  output += `-----------------------------------------------------\n`;
  checklist.nextSteps.forEach((step, i) => {
    output += `[ ] ${i + 1}. [${step.priority} PRIORITY] ${step.task}`;
    if (step.relatedClause) output += ` (${step.relatedClause})`;
    output += `\n`;
  });
  output += `\n`;

  output += `3. QUESTIONS TO ASK YOUR LAWYER\n`;
  output += `-----------------------------------------------------\n`;
  checklist.lawyerQuestions.forEach((q, i) => {
    output += `Q${i + 1}: ${q.question}\n`;
    output += `    Context: ${q.context}\n\n`;
  });

  output += `=====================================================\n`;
  output += `DISCLAIMER: This report is generated by AI for informational purposes only. It does not constitute formal legal advice.\n`;

  return output;
}

function generateMdExport(checklist: ActionableChecklist, docTitle: string): string {
  let output = `# Legal Document Assistant - Actionable Audit Report\n\n`;
  output += `**Document:** ${docTitle}  \n`;
  output += `**Date Generated:** ${new Date().toLocaleDateString()}  \n\n`;
  output += `> **Disclaimer:** This report provides general information and analysis generated by AI. It does not replace professional legal advice.\n\n`;

  output += `--- \n\n`;
  output += `## 📝 Executive Summary\n\n${checklist.summary}\n\n`;

  output += `## ✅ Recommended Next Steps Checklist\n\n`;
  checklist.nextSteps.forEach(step => {
    output += `- [ ] **[${step.priority} PRIORITY]** ${step.task}`;
    if (step.relatedClause) output += ` *(${step.relatedClause})*`;
    output += `\n`;
  });
  output += `\n`;

  output += `## ⚖️ Questions to Ask Your Lawyer\n\n`;
  checklist.lawyerQuestions.forEach((q, i) => {
    output += `### ${i + 1}. ${q.question}\n`;
    output += `**Context:** ${q.context}\n\n`;
  });

  return output;
}

function triggerBlobDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function cleanFileName(title: string): string {
  return title.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function escapeHTML(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
