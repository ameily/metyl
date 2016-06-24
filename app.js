var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var io = require('socket.io')(app);

app.set("views", __dirname + "/views");
app.set("view engine", "pug");
app.use("/public", express.static(__dirname + "/public"));
app.use("/vendor", express.static(__dirname + "/bower_components"));

app.use(bodyParser.json());


function getNamespaceTitle(namespace) {
  return namespace.replace(/\w\S*/g, function(txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}


app.get("/subscribe/:namespace", function(req, res) {
  console.log("namespace: %s", req.params.namespace);
  res.render("subscription", {
    namespace: req.params.namespace,
    title: getNamespaceTitle(req.params.namespace)
  });
});

app.post("/debug/publish", function(req, res) {
  console.log(JSON.stringify(req.body));
  res.status(200).end();
});

app.post("/publish/:room", function(req, res) {
  //TODO
  io.of('/' + req.params.room).emit('event', {
    origin: req.connection.remoteAddress,
    data: req.body
  });

  res.status(200).end();
})

app.listen(3000, "0.0.0.0", function() {
  console.log("Running app");
});
