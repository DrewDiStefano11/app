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

  test('Every reasonVisibility mode is enforced correctly, and is separate from source visibility', () => {
    const overrideSourceAlwaysReasonHidden = { sourceVisibility: 'always', reasonVisibility: 'hidden' };
    const expHiddenReason = explainWhyYouKnowThis('basic_profile', 'manual', overrideSourceAlwaysReasonHidden, true, true);
    // Source should be visible, reason should be hidden
    expect(expHiddenReason.source).toBe('manual');
    expect(expHiddenReason.explanation).toContain('hidden');
    expect(expHiddenReason.allowedRules.length).toBe(0); // Rules are hidden

    const overrideSourceHiddenReasonAlways = { sourceVisibility: 'hidden', reasonVisibility: 'always' };
    const expHiddenSource = explainWhyYouKnowThis('basic_profile', 'manual', overrideSourceHiddenReasonAlways, true, true);
    // Source should be hidden, reason should be visible
    expect(expHiddenSource.source).toBe('hidden');
    expect(expHiddenSource.explanation).toContain('enabled');
    expect(expHiddenSource.allowedRules.length).toBeGreaterThan(0);

    // On-request test
    const overrideOnRequest = { sourceVisibility: 'on-request', reasonVisibility: 'on-request' };
    const expReqLocked = explainWhyYouKnowThis('basic_profile', 'manual', overrideOnRequest, true, false);
    expect(expReqLocked.source).toBe('hidden');
    expect(expReqLocked.explanation).toContain('unlock');
    expect(expReqLocked.allowedRules.length).toBe(0);

    const expReqUnlocked = explainWhyYouKnowThis('basic_profile', 'manual', overrideOnRequest, true, true);
    expect(expReqUnlocked.source).toBe('manual');
    expect(expReqUnlocked.explanation).toContain('enabled');
    expect(expReqUnlocked.allowedRules.length).toBeGreaterThan(0);
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
    // Force reason visibility so that we get rules back to assert on
    const override = { reasonVisibility: 'always' };
    const decisionLocked = decideDataUse(category, 'display_source', override, true, false);
    const explanationLocked = explainWhyYouKnowThis(category, 'manual', override, true, false);
    expect(decisionLocked.allowed).toBe(false);
    expect(explanationLocked.source).toBe('hidden');
    expect(explanationLocked.deniedRules).toContain('sensitive_unlock_required');
  });

  test('Hidden explanations do not leak source details', () => {
    const exp = explainWhyYouKnowThis('progress_photos', 'manual');
    expect(exp.source).toBe('hidden');
  });

  test('Export include/exclude behavior and reasons, locked items deny', () => {
    // Generate without unlock
    const planLocked = generateExportPlan({
      basic_profile: { exportAllowed: false }
    }, undefined, true, false);
    expect(planLocked.included).not.toContain('basic_profile');
    expect(planLocked.excluded).toContain('basic_profile');
    expect(planLocked.exclusionReasons['basic_profile']).toBe('Export is disabled');
    // Medical history requires unlock, so it should be excluded in locked plan
    expect(planLocked.included).not.toContain('medical_history');

    // Generate with unlock
    const planUnlocked = generateExportPlan({}, undefined, true, true);
    expect(planUnlocked.included).toContain('medical_history');
  });

  test('Unknown-category handling in export plan', () => {
    const plan = generateExportPlan({}, ['basic_profile', 'unknown_cat'], true, true);
    expect(plan.included).toContain('basic_profile');
    expect(plan.excluded).toContain('unknown_cat' as DataCategory);
    expect(plan.exclusionReasons['unknown_cat']).toBe('Unknown category denied for export.');
  });

  test('Memory requires consent where configured', () => {
    const override = { memoryAllowed: true };
    const cat = 'medical_history'; // Has requiresExplicitConsent

    // Test decision Memory
    const decisionNoConsent = decideDataUse(cat, 'remember', override, false, true);
    expect(decisionNoConsent.allowed).toBe(false);
    expect(decisionNoConsent.reason).toContain('consent required');

    const decisionConsentWithMem = decideDataUse(cat, 'remember', override, true, true);
    expect(decisionConsentWithMem.allowed).toBe(true);
  });

  test('Locked sensitive data is excluded from AI category enumeration', () => {
    const catsLocked = getCategoriesForAI({}, true, false);
    expect(catsLocked).not.toContain('medical_history');

    const catsUnlocked = getCategoriesForAI({ medical_history: { aiUseAllowed: true } }, true, true);
    expect(catsUnlocked).toContain('medical_history');
  });

  test('Deletion policy is respected', () => {
    const decisionNotAllowed = decideDataUse('basic_profile', 'delete', { deletionAllowed: false });
    expect(decisionNotAllowed.allowed).toBe(false);

    const decisionAllowed = decideDataUse('basic_profile', 'delete', { deletionAllowed: true });
    expect(decisionAllowed.allowed).toBe(true);
  });

  test('Deletion confirmation and sensitive-unlock requirements', () => {
    // Basic profile is deletable
    const plan = generateDeletionPlan({ basic_profile: { deletionAllowed: false } });

    // basic_profile should be completely omitted from the plan
    const basic = plan.find(p => p.category === 'basic_profile');
    expect(basic).toBeUndefined();

    const med = plan.find(p => p.category === 'medical_history');
    expect(med?.requiresConfirmation).toBe(true);
    expect(med?.requiresSensitiveUnlock).toBe(true);
  });

  test('Disabled category forbids source visibility in explanation', () => {
     // A category that normally allows source
     const expEnabled = explainWhyYouKnowThis('basic_profile', 'manual', {}, true, true);
     expect(expEnabled.source).toBe('manual');

     const expDisabled = explainWhyYouKnowThis('basic_profile', 'manual', { enabled: false }, true, true);
     expect(expDisabled.source).toBe('hidden'); // disabled category blocks source display
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
