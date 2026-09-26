import { RiskLevel, ClauseCategory } from '../lib/types';

export function createRiskBadge(level: RiskLevel): HTMLElement {
  const badge = document.createElement('span');
  badge.className = `badge-status badge-${level.toLowerCase()}`;
  badge.setAttribute('role', 'status');

  let icon = 'ℹ️';
  let label = `${level} RISK`;

  if (level === 'HIGH') {
    icon = '🚨';
    label = 'HIGH RISK';
  } else if (level === 'MEDIUM') {
    icon = '⚠️';
    label = 'MEDIUM RISK';
  } else if (level === 'LOW') {
    icon = '✅';
    label = 'LOW RISK';
  }

  badge.innerHTML = `<span aria-hidden="true">${icon}</span> <span>${label}</span>`;
  return badge;
}

export function createCategoryBadge(category: ClauseCategory): HTMLElement {
  const badge = document.createElement('span');
  badge.className = `badge-status badge-neutral`;
  
  let icon = '📌';
  if (category === 'Obligation') icon = '📋';
  if (category === 'Risk') icon = '⚡';
  if (category === 'Right') icon = '⚖️';
  if (category === 'Deadline') icon = '⏰';

  badge.innerHTML = `<span aria-hidden="true">${icon}</span> <span>${category}</span>`;
  return badge;
}
