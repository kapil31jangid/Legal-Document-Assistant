import { parseDocumentFile, validateFile } from '../lib/parser';

export interface UploadOptions {
  onTextLoaded: (text: string, filename?: string) => void;
  onError: (errorMsg: string) => void;
}

export const SAMPLE_LEASE = `RESIDENTIAL LEASE AGREEMENT

1. PARTIES AND PREMISES
This Lease Agreement ("Agreement") is entered into between Apex Property Management ("Landlord") and John Doe ("Tenant"). Landlord leases to Tenant the premises located at 742 Evergreen Terrace, Unit 4B.

2. RENT AND PAYMENT TERMS
Tenant shall pay Landlord a monthly rent of $2,500 USD, payable on or before the 1st day of each calendar month. If rent is not paid by the 5th day of the month, a late fee penalty of $150 USD plus an interest rate of 1.5% per day on the unpaid balance shall immediately apply.

3. TERM AND TERMINATION
The lease term shall commence on October 1, 2026 and terminate on September 30, 2027. Either party may terminate this agreement without cause by providing 60 days prior written notice. If Tenant vacates prior to lease expiration without written consent, Tenant forfeits the security deposit and shall remain liable for all rent through the end of the term.

4. INDEMNIFICATION AND LIABILITY
Tenant agrees to indemnify, defend, and hold harmless Landlord from any and all claims, damages, liabilities, or injuries arising on the premises, regardless of Landlord negligence. Landlord assumes no liability for loss of personal property.

5. MAINTENANCE AND REPAIRS
Tenant is required to maintain the premises in good condition and shall be responsible for all repairs under $300 USD. Landlord reserves the right to enter the premises at any time without prior notice for routine inspections.`;

export const SAMPLE_TOS = `TERMS OF SERVICE AND SERVICE LEVEL AGREEMENT

SECTION 1. OBLIGATIONS OF THE USER
User agrees to use the Software Service strictly in accordance with applicable federal and state laws. User shall not reverse engineer, decompile, or attempt to extract source code from the Service.

SECTION 2. DISPUTE RESOLUTION AND MANDATORY ARBITRATION
Any dispute, controversy, or claim arising out of or relating to this agreement shall be settled exclusively by binding arbitration in New York, NY. User explicitly waives any right to participate in a class-action lawsuit or jury trial against the Provider.

SECTION 3. LIMITATION OF LIABILITY
In no event shall Provider be liable for any indirect, incidental, consequential, special, or punitive damages, including loss of profits, data, or business opportunity. Provider's maximum aggregate liability under this agreement shall not exceed $100 USD.

SECTION 4. AUTOMATIC RENEWAL AND CANCELLATION
This subscription automatically renews every 12 months unless cancelled at least 30 days prior to the renewal date. Notice of cancellation must be submitted in writing via registered certified mail.

SECTION 5. GOVERNING LAW
This agreement shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to conflict of law principles.`;

export function createUploadComponent(options: UploadOptions): HTMLElement {
  const container = document.createElement('div');
  container.className = 'card-widget';

  container.innerHTML = `
    <div class="widget-header">
      <div>
        <h2 class="widget-title">📄 Upload Legal Document</h2>
        <div class="widget-subtitle">Select a PDF, DOCX, or text contract to upload for AI-powered analysis, risk scoring, and Q&A.</div>
      </div>
    </div>

    <!-- Upload Options Bar -->
    <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
      <button type="button" class="btn btn-ghost active" id="tab-file-btn" style="background: var(--accent-blue-light); color: var(--accent-blue); font-weight: 600;">
        📁 Upload Document
      </button>
      <button type="button" class="btn btn-ghost" id="tab-paste-btn">
        📝 Paste Text
      </button>
      <button type="button" class="btn btn-ghost" id="tab-sample-btn">
        ⚡ Demo Fixtures
      </button>
    </div>

    <!-- Dropzone View -->
    <div id="tab-file-content">
      <div class="upload-dropzone" id="drop-zone" tabindex="0" role="button" aria-label="Upload document drag and drop area">
        <div class="dropzone-icon">☁️</div>
        <div style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary);">Click or drag and drop to upload</div>
        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.25rem;">Supports PDF, DOCX, TXT, MD up to 5MB</div>
        <div style="margin-top: 1.25rem;">
          <button type="button" class="btn btn-dark browse-btn">Browse Files</button>
        </div>
        <input type="file" id="file-input" accept=".pdf,.docx,.txt,.md" aria-label="Select contract document file to upload" style="display: none;" />
      </div>
      <div id="file-status" style="display: none; margin-top: 1rem; padding: 0.75rem 1rem; border-radius: var(--radius-md); font-size: 0.875rem;"></div>
    </div>

    <!-- Paste View -->
    <div id="tab-paste-content" style="display: none;">
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <label for="paste-input" style="font-size: 0.875rem; font-weight: 600; color: var(--text-secondary);">Paste raw contract text:</label>
        <textarea id="paste-input" class="form-textarea" rows="8" placeholder="Paste contract clauses, NDA, or terms of service text here..."></textarea>
        <div style="display: flex; justify-content: flex-end;">
          <button type="button" class="btn btn-blue" id="analyze-pasted-btn">Analyze Pasted Text</button>
        </div>
      </div>
    </div>

    <!-- Sample Fixtures View -->
    <div id="tab-sample-content" style="display: none;">
      <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1rem;">Select a pre-loaded sample fixture to test AI analysis instantly:</p>
      <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
        <button type="button" class="btn btn-outline" id="load-sample-lease">
          🏠 Sample Residential Lease Agreement
        </button>
        <button type="button" class="btn btn-outline" id="load-sample-tos">
          💻 Sample Software Terms of Service (SLA)
        </button>
      </div>
    </div>
  `;

  // Tab switching logic
  const tabFileBtn = container.querySelector('#tab-file-btn') as HTMLButtonElement;
  const tabPasteBtn = container.querySelector('#tab-paste-btn') as HTMLButtonElement;
  const tabSampleBtn = container.querySelector('#tab-sample-btn') as HTMLButtonElement;

  const tabFileContent = container.querySelector('#tab-file-content') as HTMLElement;
  const tabPasteContent = container.querySelector('#tab-paste-content') as HTMLElement;
  const tabSampleContent = container.querySelector('#tab-sample-content') as HTMLElement;

  const switchTab = (activeBtn: HTMLButtonElement, activeContent: HTMLElement) => {
    [tabFileBtn, tabPasteBtn, tabSampleBtn].forEach(btn => {
      btn.style.background = 'transparent';
      btn.style.color = 'var(--text-secondary)';
      btn.style.fontWeight = '500';
    });
    [tabFileContent, tabPasteContent, tabSampleContent].forEach(content => {
      content.style.display = 'none';
    });

    activeBtn.style.background = 'var(--accent-blue-light)';
    activeBtn.style.color = 'var(--accent-blue)';
    activeBtn.style.fontWeight = '600';
    activeContent.style.display = 'block';
  };

  tabFileBtn.addEventListener('click', () => switchTab(tabFileBtn, tabFileContent));
  tabPasteBtn.addEventListener('click', () => switchTab(tabPasteBtn, tabPasteContent));
  tabSampleBtn.addEventListener('click', () => switchTab(tabSampleBtn, tabSampleContent));

  // File handling
  const dropZone = container.querySelector('#drop-zone') as HTMLElement;
  const fileInput = container.querySelector('#file-input') as HTMLInputElement;
  const browseBtn = container.querySelector('.browse-btn') as HTMLButtonElement;
  const fileStatus = container.querySelector('#file-status') as HTMLElement;

  const processFile = async (file: File) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      options.onError(validation.error || 'Invalid file');
      return;
    }

    fileStatus.style.display = 'block';
    fileStatus.style.background = 'var(--accent-blue-light)';
    fileStatus.style.color = 'var(--accent-blue)';
    fileStatus.innerHTML = `<span class="spinner">⏳</span> Extracting text from <strong>${escapeHTML(file.name)}</strong>...`;

    try {
      const extractedText = await parseDocumentFile(file);
      if (!extractedText || !extractedText.trim()) {
        throw new Error('No text content could be extracted from this document.');
      }

      fileStatus.style.background = 'var(--status-low-bg)';
      fileStatus.style.color = 'var(--status-low-text)';
      fileStatus.innerHTML = `✅ Successfully loaded <strong>${escapeHTML(file.name)}</strong> (${extractedText.length.toLocaleString()} characters).`;
      options.onTextLoaded(extractedText, file.name);
    } catch (err: any) {
      fileStatus.style.background = 'var(--status-high-bg)';
      fileStatus.style.color = 'var(--status-high-text)';
      fileStatus.innerHTML = `❌ ${escapeHTML(err.message || 'Error processing file')}`;
      options.onError(err.message || 'Error processing file');
    }
  };

  browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) {
      processFile(fileInput.files[0]);
    }
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('drag-over');
    });
  });

  dropZone.addEventListener('drop', (e: DragEvent) => {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files[0]) {
      processFile(dt.files[0]);
    }
  });

  // Paste action
  const pasteInput = container.querySelector('#paste-input') as HTMLTextAreaElement;
  const analyzePastedBtn = container.querySelector('#analyze-pasted-btn') as HTMLButtonElement;

  analyzePastedBtn.addEventListener('click', () => {
    const text = pasteInput.value.trim();
    if (!text) {
      options.onError('Please paste text before analyzing.');
      return;
    }
    options.onTextLoaded(text, 'Pasted Document');
  });

  // Sample load actions
  container.querySelector('#load-sample-lease')?.addEventListener('click', () => {
    options.onTextLoaded(SAMPLE_LEASE, 'Sample Residential Lease.txt');
  });

  container.querySelector('#load-sample-tos')?.addEventListener('click', () => {
    options.onTextLoaded(SAMPLE_TOS, 'Sample Terms of Service.txt');
  });

  return container;
}

function escapeHTML(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
