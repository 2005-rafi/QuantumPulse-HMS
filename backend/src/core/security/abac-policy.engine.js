/**
 * backend/src/core/security/abac-policy.engine.js
 * Attribute-Based Access Control (ABAC) Policy Enforcement Engine.
 * Evaluates Subject, Resource, Action, and Environment attributes to enforce
 * strict clinical boundaries, separation of duties (SoD), and emergency overrides.
 */
const logger = require('../logger');

const ACTIONS = {
  READ: 'READ',
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  PRESCRIBE: 'PRESCRIBE',
  BILL_COLLECT: 'BILL_COLLECT',
  BILL_OVERRIDE: 'BILL_OVERRIDE',
  CLINICAL_MUTATE: 'CLINICAL_MUTATE',
  EMERGENCY_OVERRIDE: 'EMERGENCY_OVERRIDE',
};

const CLINICAL_ROLES = new Set([
  'DOCTOR',
  'SURGEON',
  'EMERGENCY PHYSICIAN',
  'ANESTHETIST',
  'NURSE',
  'CHIEF MEDICAL OFFICER',
]);

const FINANCIAL_ROLES = new Set([
  'BILLING',
  'CASHIER',
  'ACCOUNTANT',
  'FINANCE',
]);

class AbacPolicyEngine {
  /**
   * Evaluate multi-attribute access policy.
   *
   * @param {Object} context
   * @param {Object} context.subject - Authenticated user context
   * @param {Object} context.resource - Target resource metadata
   * @param {string} context.action - Requested action
   * @param {Object} [context.environment] - Environment parameters
   * @returns {{ allowed: boolean, reason: string, policyDecision: 'ALLOW' | 'DENY' }}
   */
  evaluate({ subject, resource, action, environment = {} }) {
    if (!subject) {
      return { allowed: false, reason: 'Unauthenticated subject', policyDecision: 'DENY' };
    }

    const role = (subject.role || '').toUpperCase();
    const isAdmin = role === 'ADMINISTRATOR' || role === 'ADMIN' || role === 'SUPERADMIN';

    // 1. Super Administrator Bypass
    if (isAdmin) {
      return { allowed: true, reason: 'Administrator full system clearance', policyDecision: 'ALLOW' };
    }

    // 2. Separation of Duties (SoD) Checks
    if (action === ACTIONS.BILL_COLLECT || action === ACTIONS.BILL_OVERRIDE) {
      if (CLINICAL_ROLES.has(role)) {
        logger.warn('ABAC SoD Violation: Clinician attempted billing collection', {
          userId: subject.userId,
          role,
          action,
        });
        return {
          allowed: false,
          reason: 'Separation of Duties violation: Clinical medical staff cannot execute cashier/billing collections',
          policyDecision: 'DENY',
        };
      }
    }

    if (action === ACTIONS.PRESCRIBE || action === ACTIONS.CLINICAL_MUTATE) {
      if (FINANCIAL_ROLES.has(role) || role === 'RECEPTION' || role === 'RECEPTIONIST') {
        logger.warn('ABAC SoD Violation: Financial/Receptionist attempted clinical prescription', {
          userId: subject.userId,
          role,
          action,
        });
        return {
          allowed: false,
          reason: 'Separation of Duties violation: Administrative and billing personnel cannot author medical orders or mutate clinical regimens',
          policyDecision: 'DENY',
        };
      }
    }

    // 3. Emergency Override (Break-Glass Active)
    if (environment.hasBreakGlassGrant) {
      logger.info('ABAC Override: Access permitted under active emergency Break-Glass grant', {
        userId: subject.userId,
        staffId: subject.staffId,
        resourceId: resource?.id,
      });
      return {
        allowed: true,
        reason: 'Authorized under active emergency Break-Glass protocol',
        policyDecision: 'ALLOW',
      };
    }

    // 4. Attending Physician Patient Assignment Clearance
    if (resource?.attendingPhysicianId && subject.staffId) {
      if (String(resource.attendingPhysicianId) === String(subject.staffId)) {
        return {
          allowed: true,
          reason: 'Subject is the designated attending physician for this patient',
          policyDecision: 'ALLOW',
        };
      }
    }

    // 5. Departmental Confinement Check
    if (resource?.departmentId && subject.departmentId) {
      const resourceDept = String(resource.departmentId);
      const subjectDept = String(subject.departmentId);

      // Same department: permitted for standard clinical and departmental workflows
      if (resourceDept === subjectDept) {
        return {
          allowed: true,
          reason: 'Subject belongs to target resource department',
          policyDecision: 'ALLOW',
        };
      }

      // HOD oversight: HODs can inspect operations across their jurisdiction
      if (subject.isHod && subject.hodDepartmentId && String(subject.hodDepartmentId) === resourceDept) {
        return {
          allowed: true,
          reason: 'Permitted under Head of Department departmental oversight',
          policyDecision: 'ALLOW',
        };
      }

      // Cross-department write operations without Break-Glass or assignment are blocked
      if (action === ACTIONS.CLINICAL_MUTATE || action === ACTIONS.PRESCRIBE || action === ACTIONS.UPDATE) {
        logger.warn('ABAC Confinement: Cross-department write blocked', {
          userId: subject.userId,
          subjectDept,
          resourceDept,
          action,
        });
        return {
          allowed: false,
          reason: 'Department boundary violation: Out-of-department modification requires Break-Glass authorization',
          policyDecision: 'DENY',
        };
      }
    }

    // Default permissive if no restrictive attribute rules triggered
    return {
      allowed: true,
      reason: 'Standard contextual clearance verified',
      policyDecision: 'ALLOW',
    };
  }

  /**
   * Express middleware generator for ABAC enforcement
   */
  enforce(action, resourceResolver = null) {
    return async (req, res, next) => {
      try {
        const resource = resourceResolver ? await resourceResolver(req) : null;
        const environment = {
          ipAddress: req.ip,
          hasBreakGlassGrant: Boolean(req.breakGlassActive),
        };

        const decision = this.evaluate({
          subject: req.user,
          resource,
          action,
          environment,
        });

        if (!decision.allowed) {
          return res.status(403).json({
            success: false,
            errorCode: 'AUTHZ_002',
            message: decision.reason,
          });
        }

        return next();
      } catch (err) {
        next(err);
      }
    };
  }
}

module.exports = {
  abacPolicyEngine: new AbacPolicyEngine(),
  ACTIONS,
};
