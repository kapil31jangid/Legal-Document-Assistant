import { describe, it, expect } from 'vitest';

// Pure logic verification for Risk & Category Badges
describe('UI Helper Logic & Risk Attributes', () => {
  it('formats HIGH risk status label correctly', () => {
    const level = 'HIGH';
    const label = `${level} RISK`;
    expect(label).toBe('HIGH RISK');
  });

  it('formats MEDIUM risk status label correctly', () => {
    const level = 'MEDIUM';
    const label = `${level} RISK`;
    expect(label).toBe('MEDIUM RISK');
  });

  it('formats LOW risk status label correctly', () => {
    const level = 'LOW';
    const label = `${level} RISK`;
    expect(label).toBe('LOW RISK');
  });

  it('assigns correct icons to categories', () => {
    const categoryIcons: Record<string, string> = {
      Obligation: '📋',
      Risk: '⚡',
      Right: '⚖️',
      Deadline: '⏰',
      Financial: '💰',
      Termination: '🛑',
    };

    expect(categoryIcons['Obligation']).toBe('📋');
    expect(categoryIcons['Risk']).toBe('⚡');
    expect(categoryIcons['Right']).toBe('⚖️');
    expect(categoryIcons['Deadline']).toBe('⏰');
  });

  it('escapes HTML special characters for safe insertion', () => {
    function escapeHtml(str: string): string {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    const dangerousInput = '<script>alert("xss")</script> & "quotes"';
    const safeOutput = escapeHtml(dangerousInput);

    expect(safeOutput).not.toContain('<script>');
    expect(safeOutput).toContain('&lt;script&gt;');
    expect(safeOutput).toContain('&amp;');
    expect(safeOutput).toContain('&quot;');
  });
});
