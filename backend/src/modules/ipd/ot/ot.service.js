/**
 * modules/ipd/ot/ot.service.js
 * Operating theatre session management and consumable billing service.
 */
const otRepository = require('./ot.repository');
const IPDAdmission = require('../admission/ipd-admission.model');
const RoomMaster = require('../beds/room.model');
const AppError = require('../../../core/errors/AppError');

class OTService {
  async bookSession(data, staffId) {
    const room = await RoomMaster.findById(data.roomId);
    if (!room) throw new AppError('OT Room not found', 404, 'NOT_FOUND');

    const admission = await IPDAdmission.findById(data.admissionId);
    if (!admission) throw new AppError('Inpatient admission not found', 404, 'NOT_FOUND');

    return otRepository.createSession({
      ...data,
      patientId: admission.patientId,
      bookedBy: staffId,
    });
  }

  async getSessions(query) {
    const filter = {};
    if (query.roomId) filter.roomId = query.roomId;
    if (query.status) filter.status = query.status;
    if (query.date) {
      const start = new Date(query.date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(query.date);
      end.setHours(23, 59, 59, 999);
      filter.scheduledStart = { $gte: start, $lte: end };
    }
    return otRepository.getSessions(filter);
  }

  async getSessionById(id) {
    const session = await otRepository.getSessionById(id);
    if (!session) throw new AppError('OT Session not found', 404, 'NOT_FOUND');
    return session;
  }

  async updateSessionStatus(id, status, operativeNotes = '') {
    const update = { status };
    if (status === 'IN_PROGRESS') update.actualStart = new Date();
    if (status === 'COMPLETED') update.actualEnd = new Date();
    if (operativeNotes) update.operativeNotes = operativeNotes;

    const session = await otRepository.updateSession(id, update);
    if (!session) throw new AppError('OT Session not found', 404, 'NOT_FOUND');
    return session;
  }

  async logConsumable(otSessionId, data, staffId) {
    const session = await otRepository.getSessionById(otSessionId);
    if (!session) throw new AppError('OT Session not found', 404, 'NOT_FOUND');

    return otRepository.logConsumable({
      ...data,
      otSessionId: session._id,
      admissionId: session.admissionId,
      loggedBy: staffId,
    });
  }

  async getConsumables(otSessionId) {
    return otRepository.getConsumablesBySession(otSessionId);
  }
}

module.exports = new OTService();
