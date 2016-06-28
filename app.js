var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var moment = require('moment');
var io = require('socket.io')();


app.set("views", __dirname + "/views");
app.set("view engine", "pug");
app.use("/public", express.static(__dirname + "/public"));
app.use("/vendor", express.static(__dirname + "/bower_components"));

app.use(bodyParser.json());

var redis = require('redis').createClient({
  host: "127.0.0.1"
});


function getRoomTitle(room) {
  return room.replace(/\w\S*/g, function(txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

/**
 * Get the redis keys used for the specified room at the specified date.
 */
function getRedisKeys(room, date) {
  var base = "metyl.rooms." + room;
  var date = date || moment();

  var day = date.format("DDMMYYYY");
  var week = date.format("wwYYYY");
  return {
    // redis key for the list of events
    events: base + '.events',
    // redis key for the number of events today
    todayCount: base + ".counts.day." + day,
    // redis key for the number of events this week
    weekCount: base + '.counts.week.' + week
  };
}

/**
 * Get the backlog for a room. Retrieves the list of events and daily/weekly
 * statistics from redis.
 */
function getBacklog(room, callback) {
  var keys = getRedisKeys(room);
  var ret = {};

  // First, get the event backlog
  redis.lrange(keys.events, 0, 999, function(err, events) {
    ret.events = (events || []).map(function(jsonEvent) {
      return JSON.parse(jsonEvent);
    });

    ret.stats = {};

    // Get the number of events that happened today
    redis.get(keys.todayCount, function(err, todayCount) {
      ret.stats.today = todayCount || 0;

      // Get the number of events that happened this week
      redis.get(keys.weekCount, function(err, weekCount) {
        ret.stats.week = weekCount || 0;

        // We got everything, return the backlog and statistics
        callback(null, ret);
      });
    });
  });
}


/**
 * Load the subscription view.
 */
app.get("/subscribe/:room", function(req, res) {
  console.log("room: %s", req.params.room);
  res.render("subscription", {
    room: req.params.room,
    title: getRoomTitle(req.params.room)
  });
});

/**
 * API: get the backlog of events.
 */
app.get("/subscribe/:room/backlog.json", function(req, res) {
  getBacklog(req.params.room, function(err, data) {
    res.status(200).json(data);
  });
});

/**
 * API Debug: print JSON body. Useful when learning webhook request bodies.
 */
app.post("/debug/publish", function(req, res) {
  res.status(200).end();
});

/**
 * API: publish an event. This is called by webhooks in Gitlab.
 */
app.post("/publish/:room", function(req, res) {
  var keys = getRedisKeys(req.params.room);
  console.log("publish: %s", req.params.room);
  var event = {
    origin: req.connection.remoteAddress,
    data: req.body,
    timestamp: moment().unix()
  };

  // Push the event onto the backlog
  redis.rpush(keys.events, JSON.stringify(event));
  // resize the backlog to only include the latest 1,000 events
  redis.ltrim(keys.events, 0, 999);
  // Increment the number of events that happened today
  redis.incr(keys.todayCount);
  // Increment the number of events that happened this week
  redis.incr(keys.weekCount);

  // Distribute the event to all our clients
  io.in(req.params.room).emit('data', event);

  res.status(200).end();
});


io.on('connect', function(socket) {
  socket.on('join', function(room) {
    socket.join(room);
  }).on('leave', function(room) {
    socket.leave(room);
  });
})

var server = app.listen(3000, "0.0.0.0", function() {
  console.log("Running app");
  io.attach(server);
});
