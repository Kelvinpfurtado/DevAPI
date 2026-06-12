const mongoose = require("mongoose");

const collectionSchema = new mongoose.Schema({
    userId: String,   // 🔥 link to user
    name: String,
    requests: [
        {
            method: String,
            url: String,
            body: Object
        }
    ]
});

module.exports = mongoose.model("Collection", collectionSchema);