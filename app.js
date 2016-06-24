var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var io = require('socket.io')();


app.set("views", __dirname + "/views");
app.set("view engine", "pug");
app.use("/public", express.static(__dirname + "/public"));
app.use("/vendor", express.static(__dirname + "/bower_components"));

app.use(bodyParser.json());

var redis = require('redis').createClient({
  host: "192.168.100.12"
});

//TODO remove me
redis.ltrim("metasponse", 1, 0);


function getRoomTitle(room) {
  return room.replace(/\w\S*/g, function(txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}


app.get("/subscribe/:room", function(req, res) {
  console.log("room: %s", req.params.room);
  res.render("subscription", {
    room: req.params.room,
    title: getRoomTitle(req.params.room)
  });
});

app.get("/subscribe/:room/backlog.json", function(req, res) {
  redis.lrange(req.params.room, 0, 999, function(err, reply) {
    if(reply) {
      console.log("sending backlog: %d", reply.length);
      res.set('Content-Type', "application/json").status(200);
      res.write('[');
      res.write(reply.join(','));
      res.write(']');
      res.end();
    } else {
      console.log("no backlog to send: %s", err);
      res.status(200).json([]);
    }
  });
});

app.post("/debug/publish", function(req, res) {
  console.log(JSON.stringify(req.body));
  res.status(200).end();
});

app.post("/publish/:room", function(req, res) {
  //TODO
  console.log("publish: %s", req.params.room);
  var event = {
    origin: req.connection.remoteAddress,
    data: req.body
  };

  redis.rpush(req.params.room, JSON.stringify(event));
  redis.ltrim(req.params.room, 0, 999);

  io.in(req.params.room).emit('data', event);

  res.status(200).end();
});

io.on('connect', function(socket) {
  socket.on('join', function(room) {
    console.log("joining room: %s", room);
    socket.join(room);
  });
})

var server = app.listen(3000, "0.0.0.0", function() {
  console.log("Running app");
  io.attach(server);
});
