const mongoose = require("mongoose")

const matchSchema = new mongoose.Schema({
  homeTeam: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
  awayTeam: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
  date: { type: Date, required: true },
  venue: { type: String, required: true },
  status: { 
    type: String, 
    enum: ["scheduled", "live", "completed", "upcoming"], 
    default: "scheduled" 
  },
  homeScore: { type: Number, default: 0 },
  awayScore: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  events: { type: Array, default: [] },
  minute: { type: Number, default: 0 },
  time: { type: String }, // If you store time separately
  week: { type: Number }, // If you store week
  createdAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})

// Add method to determine match status based on date
matchSchema.methods.calculateStatus = function() {
  if (this.status === "completed") {
    return "completed"; // Keep completed status
  }
  
  const now = new Date();
  const matchDate = new Date(this.date);
  const matchEndTime = new Date(matchDate.getTime() + (2 * 60 * 60 * 1000)); // Assume 2 hours match duration
  
  if (matchDate > now) {
    return "upcoming";
  } else if (now >= matchDate && now <= matchEndTime) {
    return "live";
  } else {
    return "scheduled"; // Default if date passed but not marked completed
  }
}

// Pre-save hook to update status automatically
matchSchema.pre('save', function(next) {
  // Only auto-update status if it's not being explicitly set
  if (!this.isModified('status')) {
    this.status = this.calculateStatus();
  }
  next();
});

module.exports = mongoose.model("Match", matchSchema)