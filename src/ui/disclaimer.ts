export function renderDisclaimer(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'disclaimer-banner';
  container.setAttribute('role', 'region');
  container.setAttribute('aria-label', 'Legal Disclaimer');

  container.innerHTML = `
    <div class="disclaimer-content">
      <span class="disclaimer-icon" aria-hidden="true">⚠️</span>
      <div class="disclaimer-text">
        <strong>Important Legal Disclaimer:</strong> This AI tool provides general information, document analysis, and clause summaries. It is <strong>NOT legal advice</strong> and does not replace a qualified legal professional. Consult a licensed attorney for advice specific to your situation.
      </div>
    </div>
  `;

  return container;
}
