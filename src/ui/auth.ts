export interface AuthOptions {
  onAuthenticated: (email: string, name: string) => void;
}

export function renderAuthView(options: AuthOptions): HTMLElement {
  const container = document.createElement('div');
  container.className = 'auth-container';
  container.style.cssText = 'min-height: 100vh; display: flex; width: 100%; background: #F8FAFC;';

  let isSignup = false;

  const renderForm = () => {
    container.innerHTML = `
      <div class="auth-wrapper" style="display: flex; width: 100%; min-height: 100vh;">
        <!-- Left Branding Panel (50%) -->
        <div class="auth-brand-panel" style="flex: 1; background: #020617; color: white; padding: 4rem 3rem; display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden;">
          <div style="position: absolute; top: -100px; left: -100px; width: 400px; height: 400px; background: radial-gradient(circle, rgba(37, 99, 235, 0.25) 0%, transparent 70%); border-radius: 50%; pointer-events: none;"></div>
          
          <div style="position: relative; z-index: 1;">
            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 3rem;">
              <div style="width: 44px; height: 44px; background: var(--accent-blue); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 1.35rem;">⚖️</div>
              <span style="font-size: 1.5rem; font-weight: 800; tracking: -0.02em;">NyayLens AI</span>
            </div>

            <h1 style="font-size: 2.5rem; font-weight: 800; line-height: 1.25; margin-bottom: 1.25rem; letter-spacing: -0.02em;">
              The intelligent operating system for modern legal teams.
            </h1>
            
            <p style="font-size: 1.1rem; color: #94A3B8; line-height: 1.6; max-width: 500px; margin-bottom: 2.5rem;">
              Automate contract simplification, risk scoring, side-by-side clause diffing, and grounded AI document Q&A in seconds.
            </p>

            <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 450px;">
              <div style="display: flex; align-items: center; gap: 0.75rem; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); padding: 0.85rem 1.15rem; border-radius: var(--radius-md);">
                <span style="font-size: 1.2rem;">🔒</span>
                <span style="font-size: 0.875rem; color: #CBD5E1; font-weight: 500;">Stateless in-memory security & zero database retention</span>
              </div>
              <div style="display: flex; align-items: center; gap: 0.75rem; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); padding: 0.85rem 1.15rem; border-radius: var(--radius-md);">
                <span style="font-size: 1.2rem;">⚡</span>
                <span style="font-size: 0.875rem; color: #CBD5E1; font-weight: 500;">Powered by Google Gemini 1.5 Flash GenAI</span>
              </div>
            </div>
          </div>

          <div style="position: relative; z-index: 1; font-size: 0.85rem; color: #64748B;">
            © 2026 NyayLens Legal AI Assistant. Built for PromptWars Hackathon.
          </div>
        </div>

        <!-- Right Form Panel (50%) -->
        <div class="auth-form-panel" style="flex: 1; background: #FFFFFF; padding: 4rem 3.5rem; display: flex; flex-direction: column; justify-content: center; align-items: center;">
          <div style="width: 100%; max-width: 440px;">
            <div style="margin-bottom: 2rem;">
              <h2 style="font-size: 1.75rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.35rem;">
                ${isSignup ? 'Create an account' : 'Welcome back'}
              </h2>
              <p style="font-size: 0.9rem; color: var(--text-secondary);">
                ${isSignup ? 'Enter your details below to set up your workspace.' : 'Enter your credentials to access your legal workspace.'}
              </p>
            </div>

            <form id="auth-form" style="display: flex; flex-direction: column; gap: 1.25rem;">
              ${
                isSignup
                  ? `
                <div>
                  <label for="auth-name" style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary); display: block; margin-bottom: 0.35rem;">Full Name</label>
                  <input type="text" id="auth-name" class="form-input" placeholder="e.g. John Doe" required style="height: 46px;" />
                </div>
              `
                  : ''
              }

              <div>
                <label for="auth-email" style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary); display: block; margin-bottom: 0.35rem;">Email Address</label>
                <input type="email" id="auth-email" class="form-input" placeholder="workspace@nyaylens.com" required style="height: 46px;" value="workspace@nyaylens.com" />
              </div>

              <div>
                <label for="auth-password" style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary); display: block; margin-bottom: 0.35rem;">Password</label>
                <input type="password" id="auth-password" class="form-input" placeholder="••••••••" required style="height: 46px;" value="password123" />
              </div>

              <div id="auth-error" style="display: none; color: var(--status-high-text); font-size: 0.85rem;"></div>

              <button type="submit" id="auth-submit-btn" class="btn btn-dark" style="height: 48px; font-size: 0.95rem; font-weight: 700; border-radius: var(--radius-md); margin-top: 0.5rem;">
                ${isSignup ? 'Create Account' : 'Sign in securely'} ➔
              </button>

              <button type="button" id="demo-guest-btn" class="btn btn-blue" style="height: 46px; font-size: 0.9rem; font-weight: 600; border-radius: var(--radius-md);">
                ⚡ Quick Demo / Guest Access
              </button>
            </form>

            <div style="margin-top: 2rem; text-align: center; font-size: 0.875rem; color: var(--text-secondary);">
              ${
                isSignup
                  ? `Already have an account? <button type="button" id="toggle-auth-btn" style="background: none; border: none; color: var(--accent-blue); font-weight: 600; cursor: pointer; text-decoration: underline;">Sign in</button>`
                  : `Don't have an account? <button type="button" id="toggle-auth-btn" style="background: none; border: none; color: var(--accent-blue); font-weight: 600; cursor: pointer; text-decoration: underline;">Sign up for free</button>`
              }
            </div>
          </div>
        </div>
      </div>
    `;

    const form = container.querySelector('#auth-form') as HTMLFormElement;
    const submitBtn = container.querySelector('#auth-submit-btn') as HTMLButtonElement;
    const errorDiv = container.querySelector('#auth-error') as HTMLElement;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailInput = container.querySelector('#auth-email') as HTMLInputElement;
      const nameInput = container.querySelector('#auth-name') as HTMLInputElement | null;
      const passwordInput = container.querySelector('#auth-password') as HTMLInputElement;

      const email = emailInput ? emailInput.value.trim() : '';
      const name = nameInput ? nameInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';

      submitBtn.disabled = true;
      errorDiv.style.display = 'none';

      try {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: isSignup ? 'register' : 'login',
            email,
            password,
            name,
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          options.onAuthenticated(data.user.email, data.user.name);
        } else {
          errorDiv.style.display = 'block';
          errorDiv.textContent = data.error || 'Authentication failed.';
        }
      } catch (err: any) {
        // Fallback to client-side login if offline/dev server function proxy is bypassed
        options.onAuthenticated(email || 'workspace@nyaylens.com', name || 'Legal User');
      } finally {
        submitBtn.disabled = false;
      }
    });

    container.querySelector('#demo-guest-btn')?.addEventListener('click', () => {
      options.onAuthenticated('demo@nyaylens.com', 'Demo Legal Counsel');
    });

    container.querySelector('#toggle-auth-btn')?.addEventListener('click', () => {
      isSignup = !isSignup;
      renderForm();
    });
  };

  renderForm();
  return container;
}
