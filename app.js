var express = require('express');
var app = express();

app.set("views", __dirname + "/views");
app.set("view engine", "pug");
app.use("/public", express.static(__dirname + "/public"));
app.use("/vendor", express.static(__dirname + "/bower_components"));

app.get("/", function(req, res) {
  res.render("subscription");
});

app.listen(3000, function() {
  console.log("Running app");
});
