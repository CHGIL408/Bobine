const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    synopsis: { type: String },
    releaseDate: { type: Date },
    duration: { type: Number },
    genre: [{ type: String }],
    director: { type: String },
    cast: [{ type: String }],
    poster: { type: String },
    backdrop: { type: String },
    rating: { type: Number },
    tmdbId: { type: Number, unique: true },
    language: { type: String, default: 'fr' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Movie', movieSchema);
