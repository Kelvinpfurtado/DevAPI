const Team = require("./models/Team");
const History = require("./models/History");
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const app = express();
const PORT = 3000;

// ===== MODELS =====
const User = require("./models/User");
const Collection = require("./models/Collection");

// ===== MONGODB =====
mongoose.connect("mongodb://kelvin_p_furtado:Kelvinpf00%40@ac-tdfuk8r-shard-00-00.k7lvpqw.mongodb.net:27017,ac-tdfuk8r-shard-00-01.k7lvpqw.mongodb.net:27017,ac-tdfuk8r-shard-00-02.k7lvpqw.mongodb.net:27017/devapi?ssl=true&replicaSet=atlas-11ul5p-shard-0&authSource=admin&retryWrites=true&w=majority")
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.log(err));

app.use(cors());
app.use(express.json());

// ===== TEST =====
app.get("/", (req, res) => {
    res.send("Backend running 🚀");
});


// ================= AUTH =================

// REGISTER
app.post("/api/register", async (req, res) => {

    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
        return res.json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
        name,
        email,
        password: hashedPassword
    });

    await newUser.save();

    res.json({ message: "User registered successfully" });
});


// LOGIN
app.post("/api/login", async (req, res) => {

    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
        return res.json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        return res.json({ error: "Wrong password" });
    }

    res.json({
    	message: "Login successful",
    	userId: user._id,
    	name: user.name,
    	email: user.email
    });
});


// ================= USER =================

app.get("/api/user/:id", async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        return res.json({ error: "User not found" });
    }

    res.json(user);
});


// ================= API REQUEST =================

app.post("/api/request", async (req, res) => {

    const {
        url,
        method,
        body: requestBody,
        headers,
        userId
    } = req.body;

    try {

        const response = await axios({
            url,
            method,
            data: requestBody || undefined,
            headers: headers || {}
        });

        // 🔥 SAVE HISTORY
        const history = new History({
            userId,
            method,
            url,
            status: response.status,
            response: response.data
        });

        await history.save();

        res.json({
            status: response.status,
            data: response.data
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            error: error.message
        });
    }
});



app.get("/api/team/invitations/:email", async (req, res) => {

    const teams = await Team.find({
        "invitations.email": req.params.email
    });

    res.json(teams);
});



app.post("/api/team/accept", async (req, res) => {

    const { teamId, email } = req.body;

    const team = await Team.findById(teamId);

    if (!team) {
        return res.json({ error: "Team not found" });
    }

    // REMOVE INVITATION
    team.invitations =
        team.invitations.filter(
            inv => inv.email !== email
        );

    // ADD MEMBER
    team.members.push({ email });

    await team.save();

    res.json({ message: "Invitation accepted" });
});



// ================= COLLECTIONS =================

// CREATE COLLECTION
app.post("/api/collections/create", async (req, res) => {

    const { userId, name } = req.body;

    const newCollection = new Collection({
        userId,
        name,
        requests: []
    });

    await newCollection.save();

    res.json({ message: "Collection created" });
});


app.post("/api/team/create", async (req, res) => {

    const { name, ownerId } = req.body;

    const team = new Team({
        name,
        ownerId,
        members: [],
        invitations: [],
        sharedCollections: []
    });

    await team.save();

    res.json({ message: "Team created" });
});


app.get("/api/team/:userId/:email", async (req, res) => {

    const ownerTeams = await Team.find({
        ownerId: req.params.userId
    });

    const memberTeams = await Team.find({
        "members.email": req.params.email
    });

    // MERGE BOTH
    const allTeams = [...ownerTeams];

    memberTeams.forEach(team => {

        const exists = allTeams.find(
            t => t._id.toString() === team._id.toString()
        );

        if (!exists) {
            allTeams.push(team);
        }
    });

    res.json(allTeams);
});


app.post("/api/team/invite", async (req, res) => {

    const { teamId, email } = req.body;

    const team = await Team.findById(teamId);

    if (!team) {
        return res.json({ error: "Team not found" });
    }

    team.invitations.push({ email });

    await team.save();

    res.json({ message: "Invitation sent" });
});



app.post("/api/team/share-collection", async (req, res) => {

    const { teamId, collectionName, ownerId } = req.body;

    const team = await Team.findById(teamId);

    if (!team) {
        return res.json({ error: "Team not found" });
    }

    // PREVENT DUPLICATES
    const exists = team.sharedCollections.find(
        col => col.name === collectionName
    );

    if (!exists) {
team.sharedCollections.push({
    name: collectionName,
    ownerId
});

        await team.save();
    }

    res.json({
        message: "Collection shared"
    });
});



app.get("/api/team/shared/:email", async (req, res) => {

    const teams = await Team.find({
        "members.email": req.params.email
    });

    res.json(teams);
});




// GET COLLECTIONS (USER BASED)
app.get("/api/collections/:userId", async (req, res) => {

    const collections = await Collection.find({
        userId: req.params.userId
    });

    res.json(collections);
});


// GET SINGLE COLLECTION
app.get("/api/collection/:name/:userId", async (req, res) => {

    const collection = await Collection.findOne({
        name: req.params.name,
        userId: req.params.userId
    });

    if (!collection) {
        return res.json({
            error: "Collection not found"
        });
    }

    res.json(collection);
});

// ADD REQUEST
app.post("/api/collections/add", async (req, res) => {

    const { collectionName, request, userId } = req.body;

    const collection = await Collection.findOne({
        name: collectionName,
        userId
    });

    if (!collection) {
        return res.json({ error: "Collection not found" });
    }

    collection.requests.push(request);

    await collection.save();

    res.json({ message: "Request added" });
});


// UPDATE REQUEST
app.post("/api/collections/update", async (req, res) => {

    const { collectionName, index, request, userId } = req.body;

    const collection = await Collection.findOne({
        name: collectionName,
        userId
    });

    if (!collection) {
        return res.json({ error: "Collection not found" });
    }

    collection.requests[index] = request;

    await collection.save();

    res.json({ message: "Request updated" });
});


// DELETE REQUEST
app.post("/api/collections/delete", async (req, res) => {

    const { collectionName, index, userId } = req.body;

    const collection = await Collection.findOne({
        name: collectionName,
        userId
    });

    if (!collection) {
        return res.json({ error: "Collection not found" });
    }

    collection.requests.splice(index, 1);

    await collection.save();

    res.json({ message: "Request deleted" });
});


// DELETE COLLECTION
app.post("/api/collections/delete-collection", async (req, res) => {

    const { name, userId } = req.body;

    await Collection.deleteOne({
        name,
        userId
    });

    res.json({ message: "Collection deleted" });
});


// ================= DASHBOARD =================

app.get("/api/dashboard/:userId", async (req, res) => {

    const collections = await Collection.find({
        userId: req.params.userId
    });

    let requestCount = 0;

    collections.forEach(col => {
        requestCount += col.requests.length;
    });

    res.json({
        collections: collections.length,
        requests: requestCount,
        teams: 0
    });
});


app.get("/api/history/:userId", async (req, res) => {

    const history = await History.find({
        userId: req.params.userId
    }).sort({ createdAt: -1 });

    res.json(history);
});


// ================= START SERVER =================

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});