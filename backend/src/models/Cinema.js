const mongoose = require('mongoose');

const cinemaSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    location: {
      type: { type: String, default: 'Point' },
      coordinates: [Number],
    },
    phone: { type: String },
    // http(s) seulement : un lien javascript: s'exécuterait au clic sur le site
    website: { type: String, match: /^https?:\/\//i },
  },
  { timestamps: true },
);

cinemaSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Cinema', cinemaSchema);
