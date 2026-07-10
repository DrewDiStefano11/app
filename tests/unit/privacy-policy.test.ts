import { expect, test, describe } from 'vitest';
import {
  DEFAULT_PRIVACY_POLICIES,
  DataCategory
} from '../../src/lib/privacy-policy-defaults';
import {
  getEffectivePolicy,
  validateOverride,
  decideDataUse,
  explainWhyYouKnowThis,
  getDefaultPolicies,
  applyOverrides,
  resetCategory,
  resetAll,
  getCategoriesForAI,
  getCategoriesForExport,
  getCategoriesRequiringConsent,
  getLocalOnlyCategories,
  generateDeletionPlan,
  generateExportPlan
} from '../../src/lib/privacy-policy';

describe('Privacy Policy Defaults', () => {
  test('Every category has a default', () => {
    const categories: DataCategory[] = [
      "basic_profile", "goals", "training_history", "active_workout",
      "nutrition_history", "recovery_check_ins", "sleep", "bodyweight",
      "body_measurements", "medical_history", "allergies", "medications",
      "conditions", "surgeries", "emergency_contacts", "progress_photos",
      "conversations", "ai_memories", "wearable_data", "location", "imported_records"
    ];

    categories.forEach(cat => {
      expect(DEFAULT_PRIVACY_POLICIES[cat]).toBeDefined();
    });
  });

  test('Sensitive categories are sensitive by default', () => {
    const sensitiveCats: DataCategory[] = [
      "medical_history", "allergies", "medications", "conditions",
      "surgeries", "emergency_contacts", "progress_photos"
    ];

    sensitiveCats.forEach(cat => {
      expect(DEFAULT_PRIVACY_POLICIES[cat].requiresSensitiveUnlock).toBe(true);
      expect(DEFAULT_PRIVACY_POLICIES[cat].requiresExplicitConsent).toBe(true);
    });
  });

  test('Location default is restricted', () => {
    const loc = DEFAULT_PRIVACY_POLICIES['location'];
    expect(loc.enabled).toBe(false);
    expect(loc.localOnly).toBe(true);
    expect(loc.requiresSensitiveUnlock).toBe(true);
    expect(loc.requiresExplicitConsent).toBe(true);
  });
});

describe('Privacy Policy Engine', () => {
  test('Unknown categories are rejected', () => {
    const decision = decideDataUse('unknown_cat' as any, 'store');
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('Unknown category');
  });

  test('Invalid values and prototype pollution attempts in overrides are safely normalized', () => {
    const maliciousOverride = JSON.parse('{"__proto__": {"admin": true}, "enabled": "not_a_boolean"}');
    const valid = validateOverride('basic_profile', maliciousOverride);
    expect((valid as any).admin).toBeUndefined();
    expect(valid.enabled).toBeUndefined(); // Should be ignored because it's not a boolean
  });

  test('Non-object overrides return empty', () => {
    expect(validateOverride('basic_profile', null)).toEqual({});
    expect(validateOverride('basic_profile', [])).toEqual({});
    expect(validateOverride('basic_profile', "string")).toEqual({});
  });

  test('Cannot weaken non-overridable safety constraints', () => {
    const override = { requiresSensitiveUnlock: false, requiresExplicitConsent: false };
    const policy = getEffectivePolicy('medical_history', override);

    // Default is true, so attempting to set to false should be overridden
    expect(policy.requiresSensitiveUnlock).toBe(true);
    expect(policy.requiresExplicitConsent).toBe(true);
  });

  test('Local-only overrides cloud sync', () => {
    const override = { localOnly: true, cloudSyncAllowed: true };
    const policy = getEffectivePolicy('basic_profile', override);

    expect(policy.localOnly).toBe(true);
    expect(policy.cloudSyncAllowed).toBe(false);
  });

  test('Disabled category denies all use (except delete)', () => {
    const override = { enabled: false };
    const policy = getEffectivePolicy('basic_profile', override);

    expect(policy.memoryAllowed).toBe(false);
    expect(policy.aiUseAllowed).toBe(false);
    expect(policy.cloudSyncAllowed).toBe(false);
    expect(policy.exportAllowed).toBe(false);

    expect(decideDataUse('basic_profile', 'store', override).allowed).toBe(false);
    expect(decideDataUse('basic_profile', 'ai_context', override).allowed).toBe(false);
    expect(decideDataUse('basic_profile', 'sync', override).allowed).toBe(false);

    // Delete is always allowed
    expect(decideDataUse('basic_profile', 'delete', override).allowed).toBe(true);
  });

  test('Memory and current-session AI use remain distinct', () => {
    const override = { memoryAllowed: false, aiUseAllowed: true };

    expect(decideDataUse('basic_profile', 'remember', override).allowed).toBe(false);
    expect(decideDataUse('basic_profile', 'ai_context', override, true, true).allowed).toBe(true);
  });

  test('Explicit consent enforcement', () => {
    const defaultConsentReq = getEffectivePolicy('medical_history').requiresExplicitConsent;
    expect(defaultConsentReq).toBe(true);

    const decisionNoConsent = decideDataUse('medical_history', 'ai_context', { aiUseAllowed: true }, false, true);
    expect(decisionNoConsent.allowed).toBe(false);
    expect(decisionNoConsent.reason).toContain('Explicit consent required');

    const decisionConsent = decideDataUse('medical_history', 'ai_context', { aiUseAllowed: true }, true, true);
    expect(decisionConsent.allowed).toBe(true);
  });

  test('Sensitive unlock enforcement', () => {
    const decisionLocked = decideDataUse('medical_history', 'display_source', {}, true, false);
    expect(decisionLocked.allowed).toBe(false);
    expect(decisionLocked.reason).toContain('unlock');

    const decisionUnlocked = decideDataUse('medical_history', 'display_source', {}, true, true);
    expect(decisionUnlocked.allowed).toBe(true);
  });

  test('Export plan', () => {
    const plan = generateExportPlan({ basic_profile: { exportAllowed: false } });
    expect(plan.included).not.toContain('basic_profile');
    expect(plan.excluded).toContain('basic_profile');

    // medical_history is exportable by default
    expect(plan.included).toContain('medical_history');
  });

  test('Deletion plan', () => {
    const plan = generateDeletionPlan();
    const basicProfile = plan.find(p => p.category === 'basic_profile');
    const medicalHistory = plan.find(p => p.category === 'medical_history');

    expect(basicProfile?.requiresConfirmation).toBe(false);
    expect(medicalHistory?.requiresConfirmation).toBe(true);
  });

  test('Source visibility hidden', () => {
    const decision = decideDataUse('active_workout', 'display_source');
    expect(decision.allowed).toBe(false);
    expect(decision.rule).toBe('source_hidden');
  });

  test('Why do you know this? explanation model', () => {
    const explanation = explainWhyYouKnowThis('basic_profile', 'import', { localOnly: true });

    expect(explanation.category).toBe('basic_profile');
    expect(explanation.source).toBe('import');
    expect(explanation.isLocalOnly).toBe(true);
    expect(explanation.mayBeSynced).toBe(false); // Because localOnly is true
    expect(explanation.requiresConfirmation).toBe(false);
    expect(explanation.allowedRules).toContain('local_only');
  });

  test('Reset to default', () => {
    const reset = resetCategory('location');
    expect(reset).toEqual(DEFAULT_PRIVACY_POLICIES['location']);
  });

  test('Bulk updates and deterministic order', () => {
    const defaultAll = getDefaultPolicies();
    const overrides = { location: { enabled: true } }; // Will fail because location is disabled by default? No, getEffectivePolicy allows enabling but constraints apply.
    const result = applyOverrides(overrides);

    expect(result['location'].enabled).toBe(true);

    const cats = Object.keys(result);
    // Ensure sorted order
    const sortedCats = [...cats].sort();
    expect(cats).toEqual(sortedCats);
  });

  test('Imported-data behavior', () => {
    const policy = getEffectivePolicy('imported_records');
    expect(policy.localOnly).toBe(true);
    expect(policy.cloudSyncAllowed).toBe(false);
  });

  test('Wearable-data behavior', () => {
    const policy = getEffectivePolicy('wearable_data');
    expect(policy.retentionMode).toBe('reduced-history');
  });

  test('Conversation-memory separation', () => {
    const convPolicy = getEffectivePolicy('conversations');
    const memPolicy = getEffectivePolicy('ai_memories');
    expect(convPolicy).toBeDefined();
    expect(memPolicy).toBeDefined();
    // In our defaults they are both distinct categories
  });

  test('Progress-photo restrictions', () => {
    const policy = getEffectivePolicy('progress_photos');
    expect(policy.memoryAllowed).toBe(false);
    expect(policy.aiUseAllowed).toBe(false);
    expect(policy.localOnly).toBe(true);
    expect(policy.sourceVisibility).toBe('hidden');
    expect(policy.requiresSensitiveUnlock).toBe(true);
  });

  test('Reset all', () => {
    const all = resetAll();
    expect(all['basic_profile']).toEqual(DEFAULT_PRIVACY_POLICIES['basic_profile']);

    const cats = Object.keys(all);
    const sortedCats = [...cats].sort();
    expect(cats).toEqual(sortedCats);
  });

  test('Bulk helpers', () => {
    const aiCats = getCategoriesForAI({}, true);
    expect(aiCats).toContain('basic_profile');
    expect(aiCats).not.toContain('progress_photos');

    const consentCats = getCategoriesRequiringConsent();
    expect(consentCats).toContain('medical_history');
    expect(consentCats).not.toContain('basic_profile');

    const localOnly = getLocalOnlyCategories();
    expect(localOnly).toContain('medical_history');
    expect(localOnly).toContain('active_workout');
  });
});
