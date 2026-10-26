/**
 * modules/ipd/nursing/vitals-scheduler.service.js
 * Inpatient Vitals Timing, Interval Scheduling & Protocolized Escalation Engine.
 * Adheres to SOLID (Single Responsibility) and Hospital Nursing Standards (NHS NEWS2 & IHI).
 */

const FREQUENCY_INTERVALS_MINUTES = Object.freeze({
  Q1H: 60,
  Q2H: 120,
  Q4H: 240,
  Q6H: 360,
  Q8H: 480,
  Q12H: 720,
  DAILY: 1440,
  BID: 720,
  TID: 480,
  CONTINUOUS: 15,
  PRN: null, // As needed
});

class VitalsSchedulerService {
  /**
   * Calculates the next due timestamp given a clinical frequency order.
   * @param {string} frequency E.g. 'Q1H', 'Q4H', 'PRN'
   * @param {Date|string} fromTime Starting timestamp (default: now)
   * @returns {Date|null}
   */
  calculateNextDue(frequency = 'Q4H', fromTime = new Date()) {
    const minutes = FREQUENCY_INTERVALS_MINUTES[frequency];
    if (!minutes) return null; // PRN or unknown
    const base = new Date(fromTime);
    return new Date(base.getTime() + minutes * 60 * 1000);
  }

  /**
   * Evaluates the timeliness of scheduled vital checks.
   * @param {Date|string|null} nextDueAt
   * @param {Date} now
   * @returns {object} Status metadata
   */
  evaluateDueStatus(nextDueAt, now = new Date()) {
    if (!nextDueAt) {
      return {
        status: 'PRN',
        label: 'As Needed (PRN)',
        badgeClass: 'md3-status-badge--neutral',
        isOverdue: false,
        isDueSoon: false,
        minutesRemaining: null,
        minutesOverdue: null,
      };
    }

    const dueDate = new Date(nextDueAt);
    const diffMs = dueDate.getTime() - now.getTime();
    const diffMinutes = Math.round(diffMs / (60 * 1000));

    if (diffMinutes < 0) {
      const overdueBy = Math.abs(diffMinutes);
      return {
        status: 'OVERDUE',
        label: `Overdue by ${overdueBy}m`,
        badgeClass: 'md3-status-badge--error',
        isOverdue: true,
        isDueSoon: false,
        minutesRemaining: 0,
        minutesOverdue: overdueBy,
      };
    }

    if (diffMinutes <= 30) {
      return {
        status: 'DUE_SOON',
        label: `Due in ${diffMinutes}m`,
        badgeClass: 'md3-status-badge--warning',
        isOverdue: false,
        isDueSoon: true,
        minutesRemaining: diffMinutes,
        minutesOverdue: 0,
      };
    }

    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    const timeFormatted = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    return {
      status: 'ON_SCHEDULE',
      label: `Due in ${timeFormatted}`,
      badgeClass: 'md3-status-badge--success',
      isOverdue: false,
      isDueSoon: false,
      minutesRemaining: diffMinutes,
      minutesOverdue: 0,
    };
  }

  /**
   * Evaluates early warning indicators and suggests clinical frequency escalation.
   * @param {number} news2Score
   * @param {number|null} shockIndex
   * @param {string} currentFrequency
   * @returns {object} Recommendation metadata
   */
  evaluateClinicalEscalation(news2Score = 0, shockIndex = null, currentFrequency = 'Q4H') {
    let recommendedFrequency = currentFrequency;
    let rationale = 'Patient telemetry stable.';
    let isEscalationAdvised = false;
    let riskTier = 'LOW';

    if (news2Score >= 7 || (shockIndex && shockIndex >= 1.0)) {
      recommendedFrequency = 'Q1H';
      rationale = 'Critical early warning score or acute shock index. Immediate Medical Emergency Team (MET) review & hourly monitoring mandatory.';
      isEscalationAdvised = currentFrequency !== 'Q1H' && currentFrequency !== 'CONTINUOUS';
      riskTier = 'CRITICAL';
    } else if (news2Score >= 5 || (shockIndex && shockIndex >= 0.9)) {
      recommendedFrequency = 'Q2H';
      rationale = 'Moderate deterioration. Physician bedside review indicated; step up monitoring to every 2 hours.';
      isEscalationAdvised = currentFrequency !== 'Q1H' && currentFrequency !== 'Q2H' && currentFrequency !== 'CONTINUOUS';
      riskTier = 'MEDIUM';
    }

    return {
      currentFrequency,
      recommendedFrequency,
      isEscalationAdvised,
      riskTier,
      rationale,
    };
  }
}

module.exports = new VitalsSchedulerService();
module.exports.FREQUENCY_INTERVALS_MINUTES = FREQUENCY_INTERVALS_MINUTES;
