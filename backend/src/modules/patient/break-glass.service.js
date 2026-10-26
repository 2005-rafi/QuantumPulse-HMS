/**
 * backend/src/modules/patient/break-glass.service.js
 * HIPAA § 164.312 Emergency Chart Access ("Break-Glass") Service.
 * Allows verified healthcare staff to override normal boundaries during acute trauma or emergencies,
 * creating an immutable forensic chain-of-custody audit log.
 */
const BreakGlassGrant = require('./break-glass-grant.model');
const Patient = require('./patient.model');
const auditService = require('../audit/audit.service');
const AppError = require('../../core/errors/app-error');
const logger = require('../../core/logger');

const BREAK_GLASS_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours active emergency window

const ELIGIBLE_ROLES = new Set([
  'ADMINISTRATOR',
  'ADMIN',
  'DOCTOR',
  'SURGEON',
  'EMERGENCY PHYSICIAN',
  'HEAD OF DEPARTMENT',
  'NURSE',
  'ANESTHETIST',
]);

class BreakGlassService {
  /**
   * Request an emergency break-glass override grant for a patient chart.
   *
   * @param {Object} params
   * @param {string} params.patientId - Patient identifier
   * @param {Object} params.user - User context { userId, staffId, role, department, positionRank }
   * @param {string} params.reason - Clinical justification (min 10 characters)
   * @param {string} params.clinicalEncounterType - Encounter category
   * @param {string} params.ipAddress - Origin client IP
   * @returns {Promise<Object>} Active emergency grant
   */
  async authorizeEmergencyAccess({
    patientId,
    user,
    reason,
    clinicalEncounterType = 'EMERGENCY',
    ipAddress = '127.0.0.1',
  }) {
    if (!patientId) {
      throw new AppError('VALIDATION_ERROR', 'Patient ID is required for Break-Glass override');
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Break-Glass override requires a clinical justification of at least 10 characters'
      );
    }

    const roleUpper = (user.role || '').toUpperCase();
    const isEligible =
      ELIGIBLE_ROLES.has(roleUpper) ||
      user.isHod ||
      (user.positionRank && user.positionRank >= 2);

    if (!isEligible) {
      logger.warn('Unauthorized Break-Glass attempt', {
        userId: user.userId,
        role: user.role,
        patientId,
      });
      throw new AppError(
        'AUTH_004',
        'Staff role is not eligible to invoke emergency Break-Glass protocol'
      );
    }

    // Verify patient exists
    const patientExists = await Patient.findById(patientId).select('_id mrn firstName lastName').lean();
    if (!patientExists) {
      throw new AppError('NOT_FOUND', 'Patient record not found');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + BREAK_GLASS_DURATION_MS);

    const resolvedUserId = user.userId || user.id || user._id;
    const resolvedStaffId = user.staffId || user.id || user._id;

    // Create persistent grant
    const grant = await BreakGlassGrant.create({
      patientId,
      staffId: resolvedStaffId,
      userId: resolvedUserId,
      role: user.role,
      department: user.department || 'Emergency',
      reason: reason.trim(),
      clinicalEncounterType,
      ipAddress,
      grantedAt: now,
      expiresAt,
      status: 'ACTIVE',
    });

    // Forensic logging with critical security severity and status change
    auditService.logEvent(
      user.staffId || user.userId,
      user.role,
      'BREAK_GLASS_ACCESS',
      patientId,
      {
        grantId: grant._id.toString(),
        patientId,
        patientMrn: patientExists.mrn,
        reason: reason.trim(),
        clinicalEncounterType,
        expiresAt: expiresAt.toISOString(),
      },
      ipAddress,
      {
        category: 'SECURITY',
        severity: 'CRITICAL',
        statusChange: {
          from: 'STANDARD_RESTRICTED_ACCESS',
          to: 'EMERGENCY_OVERRIDE_ACTIVE',
          reason: reason.trim(),
        },
      }
    );

    logger.warn('EMERGENCY BREAK-GLASS GRANTED', {
      grantId: grant._id,
      patientId,
      staffId: user.staffId,
      role: user.role,
      reason: reason.trim(),
    });

    return {
      grantId: grant._id.toString(),
      patientId,
      staffId: user.staffId,
      role: user.role,
      grantedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      clinicalEncounterType,
      status: 'ACTIVE',
    };
  }

  /**
   * Check if a staff member currently holds an active, non-expired Break-Glass grant for this patient.
   */
  async hasActiveGrant(patientId, staffId) {
    if (!patientId || !staffId) return false;

    const grant = await BreakGlassGrant.findOne({
      patientId,
      staffId,
      status: 'ACTIVE',
      expiresAt: { $gt: new Date() },
    })
      .select('_id expiresAt status')
      .lean();

    return Boolean(grant);
  }

  /**
   * Revoke an active Break-Glass grant before expiration.
   */
  async revokeGrant(grantId, staffId, revocationReason = 'Clinical emergency resolved') {
    const grant = await BreakGlassGrant.findById(grantId);
    if (!grant) {
      throw new AppError('NOT_FOUND', 'Grant not found');
    }

    grant.status = 'REVOKED';
    grant.revokedAt = new Date();
    grant.revocationReason = revocationReason;
    await grant.save();

    auditService.logEvent(
      staffId,
      grant.role,
      'BREAK_GLASS_REVOKED',
      grant.patientId,
      { grantId, revocationReason },
      grant.ipAddress,
      {
        category: 'SECURITY',
        severity: 'WARNING',
        statusChange: {
          from: 'EMERGENCY_OVERRIDE_ACTIVE',
          to: 'ACCESS_RESTORED_TO_NORMAL',
          reason: revocationReason,
        },
      }
    );

    return grant;
  }
}

module.exports = new BreakGlassService();
