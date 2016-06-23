var express = require('express');
var app = express();
var bodyParser = require('body-parser');

app.set("views", __dirname + "/views");
app.set("view engine", "pug");
app.use("/public", express.static(__dirname + "/public"));
app.use("/vendor", express.static(__dirname + "/bower_components"));

app.use(bodyParser.json());

app.get("/", function(req, res) {
  res.render("subscription");
});

app.post("/debug/publish", function(req, res) {
  console.log(JSON.stringify(req.body));
  res.status(200).end();
});

app.post("/publish", function(req, res) {
  //TODO
  res.status(200).end();
})

app.listen(3000, "0.0.0.0", function() {
  console.log("Running app");
});
