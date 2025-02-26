const mongoose = require('mongoose');

const performanceSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // UID Firebase de l’élève
  subject: { type: String, required: true }, // Matière (ex. Maths, Français)
  grade: { type: Number, required: true }, // Note (0-20)
  date: { type: Date, default: Date.now },
  teacherId: { type: String, required: true }, // UID Firebase de l’enseignant
});

module.exports = mongoose.model('Performance', performanceSchema);