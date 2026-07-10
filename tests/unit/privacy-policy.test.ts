import { test, expect, describe } from 'vitest';
import {
  DataCategory,
  getAllImmutableDefaultPolicies,
  getImmutableDefaultPolicy
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
  generateExportPlan,
  WhyDoYouKnowThisModel
} from '../../src/lib/privacy-policy';

describe('Privacy Policy Engine', () => {
  test('Every supported category has a default', () => {
    const categories: DataCategory[] = [
      "basic_profile", "goals", "training_history", "active_workout",
      "nutrition_history", "recovery_check_ins", "sleep", "bodyweight",
      "body_measurements", "medical_history", "allergies", "medications",
      "conditions", "surgeries", "emergency_contacts", "progress_photos",
      "conversations", "ai_memories", "wearable_data", "location", "imported_records"
    ];
    const policies = getAllImmutableDefaultPolicies();
    for (const cat of categories) {
      expect(policies[cat]).toBeDefined();
    }
  });

  test('Default objects are fresh and mutation-safe', () => {
    const policy1 = getImmutableDefaultPolicy('basic_profile');
    const policy2 = getImmutableDefaultPolicy('basic_profile');

    expect(policy1).not.toBe(policy2);
    policy1.enabled = false;
    expect(policy2.enabled).toBe(true);

    const allPolicies = getAllImmutableDefaultPolicies();
    allPolicies['goals'].enabled = false;
    expect(getImmutableDefaultPolicy('goals').enabled).toBe(true);
  });

  test('Sensitive categories preserve non-overridable unlock and consent', () => {
    const override = { requiresSensitiveUnlock: false, requiresExplicitConsent: false };
    const policy = getEffectivePolicy('medical_history', override);
    expect(policy.requiresSensitiveUnlock).toBe(true);
    expect(policy.requiresExplicitConsent).toBe(true);
  });

  test('Local-only disables cloud sync', () => {
    const override = { localOnly: true, cloudSyncAllowed: true };
    const policy = getEffectivePolicy('basic_profile', override);
    expect(policy.localOnly).toBe(true);
    expect(policy.cloudSyncAllowed).toBe(false);
  });

  test('Disabled categories deny AI use and memory', () => {
    const override = { enabled: false, aiUseAllowed: true, memoryAllowed: true };
    const policy = getEffectivePolicy('basic_profile', override);
    expect(policy.aiUseAllowed).toBe(false);
    expect(policy.memoryAllowed).toBe(false);
    expect(decideDataUse('basic_profile', 'ai_context', override).allowed).toBe(false);
    expect(decideDataUse('basic_profile', 'remember', override).allowed).toBe(false);
  });

  test('AI use and memory remain distinct', () => {
    const override = { aiUseAllowed: true, memoryAllowed: false };
    const decisionAI = decideDataUse('basic_profile', 'ai_context', override, true, true);
    const decisionMemory = decideDataUse('basic_profile', 'remember', override, true, true);
    expect(decisionAI.allowed).toBe(true);
    expect(decisionMemory.allowed).toBe(false);
  });

  test('Invalid overrides are safely ignored or rejected', () => {
    const maliciousOverride = JSON.parse('{"__proto__": {"admin": true}, "enabled": "not_a_boolean"}');
    const valid = validateOverride('basic_profile', maliciousOverride);
    expect((valid as Record<string, unknown>).admin).toBeUndefined();
    expect(valid.enabled).toBeUndefined();
  });

  test('Unknown fields cannot enter resolved policies', () => {
    const override = { unknownField: true };
    const policy = getEffectivePolicy('basic_profile', override);
    expect((policy as Record<string, unknown>).unknownField).toBeUndefined();
  });

  test('Every reasonVisibility mode is enforced correctly', () => {
    const hiddenPolicy = getEffectivePolicy('progress_photos'); // defaults to hidden
    expect(hiddenPolicy.reasonVisibility).toBe('hidden');
    const expHidden = explainWhyYouKnowThis('progress_photos', 'manual', {}, true, true);
    expect(expHidden.source).toBe('hidden');
    expect(expHidden.explanation).toContain('hidden');

    const requestPolicy = getEffectivePolicy('medical_history'); // defaults to on-request
    expect(requestPolicy.reasonVisibility).toBe('on-request');
    const expReqLocked = explainWhyYouKnowThis('medical_history', 'manual', {}, true, false);
    expect(expReqLocked.source).toBe('hidden');
    const expReqUnlocked = explainWhyYouKnowThis('medical_history', 'manual', {}, true, true);
    expect(expReqUnlocked.source).toBe('manual');

    const alwaysPolicy = getEffectivePolicy('basic_profile'); // defaults to always
    expect(alwaysPolicy.reasonVisibility).toBe('always');
    const expAlways = explainWhyYouKnowThis('basic_profile', 'manual', {}, false, false);
    expect(expAlways.source).toBe('manual');
  });

  test('Explanation path requires consent when normal decision does', () => {
    const category: DataCategory = 'medical_history'; // Requires consent
    // Medical history is aiUseAllowed=false by default, so we must override it to test consent constraint alone
    const override = { aiUseAllowed: true };
    const decisionNoConsent = decideDataUse(category, 'ai_context', override, false, true);
    const explanationNoConsent = explainWhyYouKnowThis(category, 'manual', override, false, true);
    expect(decisionNoConsent.allowed).toBe(false);
    expect(explanationNoConsent.mayBeInAiContext).toBe(false);
    expect(explanationNoConsent.deniedRules).toContain('consent_required');

    const decisionConsent = decideDataUse(category, 'ai_context', override, true, true);
    const explanationConsent = explainWhyYouKnowThis(category, 'manual', override, true, true);
    expect(decisionConsent.allowed).toBe(true);
    expect(explanationConsent.mayBeInAiContext).toBe(true);
    expect(explanationConsent.allowedRules).toContain('consent_granted');
  });

  test('Explanation path requires unlock when normal decision does', () => {
    const category: DataCategory = 'medical_history'; // Requires unlock
    const decisionLocked = decideDataUse(category, 'display_source', {}, true, false);
    const explanationLocked = explainWhyYouKnowThis(category, 'manual', {}, true, false);
    expect(decisionLocked.allowed).toBe(false);
    expect(explanationLocked.source).toBe('hidden');
    expect(explanationLocked.deniedRules).toContain('sensitive_unlock_required');
  });

  test('Hidden explanations do not leak source details', () => {
    const exp = explainWhyYouKnowThis('progress_photos', 'manual');
    expect(exp.source).toBe('hidden');
  });

  test('Export include/exclude behavior and reasons', () => {
    const plan = generateExportPlan({
      basic_profile: { exportAllowed: false }
    });
    expect(plan.included).not.toContain('basic_profile');
    expect(plan.excluded).toContain('basic_profile');
    expect(plan.exclusionReasons['basic_profile']).toBe('Export is disabled');
    expect(plan.included).toContain('medical_history');
  });

  test('Unknown-category handling in export plan', () => {
    const plan = generateExportPlan({}, ['basic_profile', 'unknown_cat']);
    expect(plan.included).toContain('basic_profile');
    expect(plan.excluded).toContain('unknown_cat' as DataCategory);
    expect(plan.exclusionReasons['unknown_cat']).toBe('Unknown category denied for export.');
  });

  test('Deletion confirmation and sensitive-unlock requirements', () => {
    const plan = generateDeletionPlan();
    const basic = plan.find(p => p.category === 'basic_profile');
    const med = plan.find(p => p.category === 'medical_history');

    expect(basic?.requiresConfirmation).toBe(false);
    expect(basic?.requiresSensitiveUnlock).toBe(false);

    expect(med?.requiresConfirmation).toBe(true);
    expect(med?.requiresSensitiveUnlock).toBe(true);
  });

  test('Deterministic result ordering', () => {
    const result = applyOverrides({ location: { enabled: true } });
    const keys = Object.keys(result);
    const sortedKeys = [...keys].sort();
    expect(keys).toEqual(sortedKeys);
  });

  test('No cross-call mutation', () => {
    const override1 = { enabled: false };
    const pol1 = getEffectivePolicy('basic_profile', override1);
    const pol2 = getEffectivePolicy('basic_profile');
    expect(pol1.enabled).toBe(false);
    expect(pol2.enabled).toBe(true);
  });

  test('No cross-category mutation', () => {
    const result = applyOverrides({ basic_profile: { enabled: false } });
    expect(result['basic_profile'].enabled).toBe(false);
    expect(result['goals'].enabled).toBe(true);
  });

  test('Explicit consent true and false', () => {
    const cat = 'medical_history'; // explicit consent is true by default
    const falseConsent = decideDataUse(cat, 'sync', {}, false, true);
    const trueConsent = decideDataUse(cat, 'sync', { localOnly: false, cloudSyncAllowed: true }, true, true);

    expect(falseConsent.allowed).toBe(false);
    expect(trueConsent.allowed).toBe(true);
  });

  test('Conflicting override combinations', () => {
    // Local-only plus cloud-sync override conflict
    const pol1 = getEffectivePolicy('basic_profile', { localOnly: true, cloudSyncAllowed: true });
    expect(pol1.localOnly).toBe(true);
    expect(pol1.cloudSyncAllowed).toBe(false); // cloud sync should be disabled due to localOnly

    // Disabled plus memory-enabled conflict
    const pol2 = getEffectivePolicy('basic_profile', { enabled: false, memoryAllowed: true });
    expect(pol2.enabled).toBe(false);
    expect(pol2.memoryAllowed).toBe(false);
  });

  test('Source-detail access rules', () => {
     expect(decideDataUse('basic_profile', 'display_source').allowed).toBe(true);
     expect(decideDataUse('medical_history', 'display_source', {}, true, false).allowed).toBe(false); // locked
     expect(decideDataUse('medical_history', 'display_source', {}, true, true).allowed).toBe(true); // unlocked
     expect(decideDataUse('progress_photos', 'display_source').allowed).toBe(false); // always hidden
  });
});
