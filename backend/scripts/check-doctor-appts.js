require('dotenv').config({ path: require('path').resolve(__dirname, '../../secrets/backend.env') });
const mongoose = require('mongoose');
const config = require('../src/core/config');
const Appointment = require('../src/modules/appointments/appointment.model');
const Staff = require('../src/modules/staff/staff.model');
const appointmentService = require('../src/modules/appointments/appointment.service');

async function checkAppointments() {
  await mongoose.connect(config.mongoUri);
  console.log('Connected to DB');

  const appts = await Appointment.find().populate('patientId').populate('doctorId').populate('departmentId');
  console.log(`Found ${appts.length} appointments total:`);
  for (const a of appts) {
    console.log({
      id: a._id,
      number: a.appointmentNumber,
      date: a.appointmentDate,
      startTime: a.startTime,
      endTime: a.endTime,
      status: a.status,
      doctor: a.doctorId ? `${a.doctorId.fullName} (${a.doctorId._id})` : 'NO_DOC',
      patient: a.patientId ? `${a.patientId.firstName} ${a.patientId.lastName}` : 'NO_PATIENT',
      visitId: a.visitId,
    });
  }

  // Check Doctor John General (staffId: 6a7952d339f45086788a7b7b)
  const docId = '6a7952d339f45086788a7b7b';
  const todayStr = '2026-08-18';
  const docApptsToday = await appointmentService.getDoctorScheduleAppointments(docId, todayStr);
  console.log(`\nDoctor ${docId} appointments for ${todayStr}:`, docApptsToday);

  // Check without date filter
  const allDocAppts = await appointmentService.getAppointments({ doctorId: docId });
  console.log(`\nAll appointments for doctor ${docId}:`, allDocAppts);

  await mongoose.disconnect();
}

checkAppointments().catch(console.error);
