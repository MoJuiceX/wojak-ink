/**
 * Quick Start Wizard helpers
 *
 * Separated from QuickStartWizard.tsx to satisfy react-refresh/only-export-components.
 */

const WIZARD_COMPLETE_KEY = 'wojak-wizard-complete';
const WIZARD_STEP_KEY = 'wojak-wizard-step';

export function isWizardComplete(): boolean {
  try {
    return localStorage.getItem(WIZARD_COMPLETE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markWizardComplete(): void {
  try {
    localStorage.setItem(WIZARD_COMPLETE_KEY, 'true');
    sessionStorage.removeItem(WIZARD_STEP_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function resetWizard(): void {
  try {
    localStorage.removeItem(WIZARD_COMPLETE_KEY);
    sessionStorage.removeItem(WIZARD_STEP_KEY);
  } catch {
    // Ignore storage errors
  }
}
