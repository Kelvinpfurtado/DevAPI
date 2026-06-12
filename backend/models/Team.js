const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema({

    name: String,

    ownerId: String,

    members: [
        {
            email: String
        }
    ],

    invitations: [
        {
            email: String
        }
    ],

sharedCollections: [
    {
        name: String,
        ownerId: String
    }
]
});

module.exports = mongoose.model("Team", teamSchema);