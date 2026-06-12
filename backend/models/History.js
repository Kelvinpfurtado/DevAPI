const mongoose = require("mongoose");

const historySchema = new mongoose.Schema({
    userId: String,
    method: String,
    url: String,
    status: Number,
    response: Object,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("History", historySchema);