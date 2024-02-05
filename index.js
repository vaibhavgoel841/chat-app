const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const connect = require("./config/db-config");
const path = require("path");
const { MongoClient } = require("mongodb");
const Group = require("./models/group");
const Chat = require("./models/chat");
const bodyParser = require("body-parser");

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

// Your routes and other code here

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.get("/", (req, res) => {
  // Use the 'path' module to construct the correct file path
  res.sendFile(path.join(__dirname, "public", "chat.html"));
});

io.on("connection", (socket) => {
  console.log("a user connected", socket.id);
  socket.on("disconnect", () => {
    console.log("user disconnected", socket.id);
  });
  socket.on("join_room", (data) => {
    console.log("joining a room", data.roomid);
    socket.join(data.roomid);
  });

  socket.on("new_msg", async (data) => {
    console.log("received new message", data);
    const chat = await Chat.create({
      roomid: data.roomid,
      sender: data.sender,
      content: data.message,
    });
    io.to(data.roomid).emit("msg_rcvd", data);
  });
});

app.get(`/chat/:roomName/:userName`, async (req, res) => {
  const roomName = req.params.roomName;
  console.log(roomName);
  try {
    // Use Mongoose to find the group by its name
    const group = await Group.findOne({ name: roomName });
    const userName = req.body.userName;
    if (group) {
      // If the group (room) exists, you can access its ID
      const roomId = group._id;
      // console.log(roomId);
      // // console.log(roo,)
      console.log(`Room ID for "${roomName}" is ${roomId}`);
      const chats = await Chat.find({
        roomid: roomId,
      });
      console.log(chats);
      res.render("index", {
        roomid: roomId,
        user: req.params.userName,
        groupname: roomName,
        previousmsgs: chats,
      });
    } else {
      // If the group (room) does not exist
      console.log(`Room "${roomName}" not found in the database`);
      // Handle the case when the room does not exist, e.g., show an error message
      // ...
      res.redirect("/join-group"); // Redirect to the same page
    }
  } catch (error) {
    console.error("Error while finding the room:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/join-room", async (req, res) => {
  res.sendFile(path.join(__dirname, "public", "join-room.html"));
});
app.get("/group", async (req, res) => {
  res.sendFile(path.join(__dirname, "public", "create-room.html"));
});
app.post("/group", async (req, res) => {
  console.log(req.body);
  await Group.create({
    name: req.body.name,
  });
  res.redirect("/group");
});

server.listen(3000, async () => {
  console.log("listening on *:3000");
  await connect();
  console.log("DB connected");
});
