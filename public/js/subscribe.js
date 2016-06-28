

(function() {

var _factories = [];

Metyl.Event = function(props) {
  this.data = props.data;
  this.origin = props.origin;
  this.timestamp = props.timestamp;
  this.moment = moment(this.timestamp);
};

Metyl.registerMiddleware = function(callback) {
  _factories.push(callback);
}

Metyl.Subscription = function() {
  EventEmitter.call(this);
  this.todayEventCount = 0;
  this.weekEventCount = 0;
  this.eventsPerDay = 0.0;
};

Metyl.Subscription.prototype = Object.create(EventEmitter.prototype);

Metyl.Subscription.subscribe = function(room, callback) {
  this.room = room;
  this.socket = io();

  this.socket.on('data', this.process.bind(this)) function(event) {
    console.log("Got data event: %s", event.origin);
    if(!isReady) {
        backlog.push(event);
    } else {
        app.process(event);
        updateEventCounts(event);
    }
  }).on('connect', function() {
      console.log("Connected");
      socket.emit('join', '#{room}');
  }).on('error', function(error) {
      console.log("error");
  });

}

Metyl.Subscription.prototype._buildPipeline = function() {
  var index = -1;
  var app = this;
  var next = null;

  next = function(event) {
    index += 1;
    if(index >= _factories.length) {
      return;
    } else {
      _factories[index](event, app, next);
    }
  }

  return next;
};

Metyl.Subscription.prototype.process = function(event) {
  var callback = this._buildPipeline();
  var e = new Metyl.Event(event);
  this.lastEventTimestamp = e.timestamp;
  this.weekCount += 1;
  this.dayCount += 1;
  this.updateEventsPerWeek();
  callback(e);
};

Metyl.Subscription.prototype.updateEventsPerWeek = function() {
  var now = moment();
  var minutes = now.day() * 24;
  minutes += now.hour() * 60;
  minutes += now.minute();

  this.eventsPerDay = this.weekEventCount / (minutes / 1440);
  return this.eventsPerDay;
};

Metyl.Subscription.prototype.renderEventItem = function(elementName, event) {
  this.emit('renderEventItem', elementName, event);
};

})();
