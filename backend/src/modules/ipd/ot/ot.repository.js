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
      .populate('roomId', 'roomNumber roomName')
      .populate('patientId', 'firstName lastName mrn age gender')
      .populate('leadSurgeonId', 'firstName lastName employeeId position')
      .populate('anesthetistId', 'firstName lastName')
      .populate('bookedBy', 'firstName lastName')
      .sort({ scheduledStart: 1 })
      .lean();
  }

  async getSessionById(id) {
    return OTSession.findById(id)
      .populate('roomId', 'roomNumber roomName')
      .populate('patientId', 'firstName lastName mrn age gender phone')
      .populate('leadSurgeonId', 'firstName lastName employeeId position')
      .populate('anesthetistId', 'firstName lastName')
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
