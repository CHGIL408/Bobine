const mongoose = require('mongoose');

const showtimeSchema = new mongoose.Schema(
  {
    movie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie',
      required: true,
    },
    cinema: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cinema',
      required: true,
    },
    datetime: { type: Date, required: true },
    format: {
      type: String,
      enum: ['Standard', 'IMAX', '3D', 'UltraAVX', 'ScreenX', 'DBOX', 'VF', 'VOST'],
      default: 'Standard',
    },
    availableSeats: { type: Number },
    price: { type: Number },
  },
  { timestamps: true },
);
module.exports = mongoose.model('Showtime', showtimeSchema);
