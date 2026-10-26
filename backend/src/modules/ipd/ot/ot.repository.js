/**
 * modules/ipd/ot/ot.repository.js
 * Operating theatre data repository.
 */
const OTSession = require('./ot-session.model');
const OTConsumable = require('./ot-consumable.model');

class OTRepository {
  async createSession(data) {
    return OTSession.create(data);
  }

  async getSessions(filter = {}) {
    return OTSession.find(filter)
      .populate('roomId', 'roomNumber roomName roomType')
      .populate('patientId', 'firstName lastName mrn age gender')
      .populate('leadSurgeonId', 'firstName lastName employeeId position rank')
      .populate('suggestedSurgeonId', 'firstName lastName employeeId position rank')
      .populate('assistantSurgeons', 'firstName lastName employeeId position')
      .populate('anesthetistId', 'firstName lastName')
      .populate('scrubNurseId', 'firstName lastName employeeId')
      .populate('circulatingNurseId', 'firstName lastName employeeId')
      .populate('requestedBy', 'firstName lastName employeeId position')
      .populate('postOpBedId', 'bedNumber bedLabel wardClass')
      .populate('bookedBy', 'firstName lastName')
      .populate('visitId', 'visitNumber tokenString status')
      .sort({ scheduledStart: 1, createdAt: -1 })
      .lean();
  }

  async getSessionById(id) {
    return OTSession.findById(id)
      .populate('roomId', 'roomNumber roomName roomType')
      .populate('patientId', 'firstName lastName mrn age gender phone bloodGroup allergies')
      .populate('leadSurgeonId', 'firstName lastName employeeId position rank')
      .populate('suggestedSurgeonId', 'firstName lastName employeeId position rank')
      .populate('assistantSurgeons', 'firstName lastName employeeId position')
      .populate('anesthetistId', 'firstName lastName')
      .populate('scrubNurseId', 'firstName lastName employeeId')
      .populate('circulatingNurseId', 'firstName lastName employeeId')
      .populate('requestedBy', 'firstName lastName employeeId position')
      .populate('postOpBedId', 'bedNumber bedLabel wardClass')
      .populate('bookedBy', 'firstName lastName')
      .populate('visitId', 'visitNumber tokenString status')
      .lean();
  }

  async updateSession(id, update) {
    return OTSession.findByIdAndUpdate(id, update, { new: true }).lean();
  }

  async logConsumable(data) {
    return OTConsumable.create(data);
  }

  async getConsumablesBySession(otSessionId) {
    return OTConsumable.find({ otSessionId })
      .populate('loggedBy', 'firstName lastName')
      .sort({ createdAt: 1 })
      .lean();
  }
}

module.exports = new OTRepository();
