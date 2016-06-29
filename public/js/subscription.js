

(function() {

var _factories = [];



Metyl.registerMiddleware = function(callback) {
  _factories.push(callback);
};


Metyl.Subscription = function() {
  EventEmitter.call(this);
  this.isReady = false;
  this.socket = null;
  this.room = null;
  this.pending = null;
  this.stats = null;
  this.inactiveInterval = null;
  this.statsInterval = null;
  this.resetDayTimeout = null;
  this.resetWeekTimeout = null;
};

Metyl.Subscription.prototype = Object.create(EventEmitter.prototype);

Metyl.Subscription.prototype.initialize = function(room, callback) {
  var self = this;

  this.isReady = false;
  if(this.socket) {
    // Leave the current room
    this.socket.emit('leave', this.room);
  } else {
    this.socket = io();
  }

  if(this.inactiveInterval) {
    // Clear the inactive tracking interval
    clearInterval(this.inactiveInterval);
    this.inactiveInterval = null;
  }

  if(this.statsInterval) {
    // Clear the statistics update interval
    clearInterval(this.statsInterval);
    this.statsInterval = null;
  }

  if(this.resetDayTimeout) {
    // Clear the daily reset timeout
    clearTimeout(this.resetDayTimeout);
    this.resetDayTimeout = null;
  }

  if(this.resetWeekTimeout) {
    // Clear the weekly reset timeout
    clearTimeout(this.resetWeekTimeout);
    this.resetWeekTimeout = null;
  }

  this.room = room;
  // We keep a list of events we receive while we're processing the backlog.
  // After we're done processing the backlog we can process the events that
  // came in.
  this.pending = [];

  // Statistics for today and this week.
  this.stats = {
    // The number of events today
    today: 0,
    // The number of events this week
    week: 0,
    // The amount of time, in seconds, that no event has been received. We set this
    // to null so that the UI shows "Never"
    inactiveTime: null,
    // Events per day this week
    ratePerDay: 0.0
  };

  this.socket.on('data', function(e) {
    // Receive an event from the server.
    if(self.isReady) {
      // Process the event
      self.process(e);
    } else {
      // We are currently processing the backlog. Add the event to the pending
      // list so it can be processed later.
      self.pending.push(e);
    }
  }).on('connect', function() {
    // Connect to the room we need.
    self.socket.emit('join', room);
    // load the backlog
    self.loadBacklog(callback);
  }).on('error', function(error) {
    self.emit('error', error);
  });
};


/**
 * Build the pipeline that processes an incomming event. The pipline will push
 * the event through all middleware.
 */
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

/**
 * Process an incomming event.
 */
Metyl.Subscription.prototype.process = function(e) {
  var event = new Metyl.Event(e);
  var callback = this._buildPipeline();

  // Kick off the pipeline
  callback(event);

  if(this.isReady) {
    // We only update today's statistics when the event came from the server
    // and not the backlog.
    this.stats.today += 1;
    this.stats.week += 1;
    this.stats.inactiveTime = 0;
    this.pushInactivity(true);
    this.pushStats();
  }
};

/**
 * Load the backlog of events. This is called when we first join a room. We
 * immediately load the last X-number of events so we aren't looking at an
 * empty list.
 */
Metyl.Subscription.prototype.loadBacklog = function(callback) {
  var self = this;
  var url = "/subscribe/" + this.room + "/backlog.json";

  $.ajax(url, {
    success: function(data) {
      var last = null;
      // Process each event in the backlog.
      data.events.forEach(function(event) {
        self.process(event);
        last = event.timestamp;
      });

      // Process each event that we received while processing the backlog.
      self.pending.forEach(function(event) {
        self.process(event);
        last = event.timestamp;
      });

      // Update statistics
      self.stats.week = data.stats.week;
      self.stats.today = data.stats.today;
      if(last) {
        self.stats.inactiveTime = moment().diff(moment.unix(last)) / 1000.0;
      }

      // Clear the pending events because we've already processed them.
      self.pending = null;
      self.isReady = true;

      // Push statistics and inactivity to the UI.
      self.pushInactivity();
      self.pushStats();

      // Set up an interval that updates the inactive event time. The interval
      // is called every second.
      self.inactiveInterval = setInterval(function() {
        self.pushInactivity();
      }, 1000);

      // Set up an interval that updates today's statistics. The interval is
      // called every minute.
      self.statsInterval = setInterval(function() {
        self.pushStats();
      }, 60000);

      // We need to reset today's statistics at the end of the end. At this
      // point we don't know how long it is before tomorrow begins. So, we do
      // some math to get the number of milliseconds from now till tomorrow and
      // then reset today's stats at that point.
      var now = moment();
      var msTillTomorrow = now.clone().add(1, 'day').startOf('day').diff(now);
      this.resetDayTimeout = setTimeout(function() {
        self.resetDay();
      }, msTillTomorrow);

      // Likewise, we don't know how long it is before the next week begins.
      // So, we do some more math to set a timeout when next week begins.
      var msTillNextWeek = now.clone().add(1, 'week').startOf('week').diff(now);
      this.resetWeekTimeout = setTimeout(function() {
        self.resetWeek();
      }, msTillNextWeek);

      if(callback) {
        callback();
      }
    },
    error: function() {
      self.emit('error', 'backlog failed');
    }
  });
};

/**
 * Render an event item to the event list in the UI.
 */
Metyl.Subscription.prototype.renderEventItem = function(elementName, event) {
  this.emit('renderItem', elementName, event);
};

/**
 * Push today's statistics to the UI.
 */
Metyl.Subscription.prototype.pushStats = function() {
  var now = moment();
  var minutes = (now.hours() * 60) + (now.day() * 1440);
  this.stats.ratePerDay = this.stats.week / (minutes / 1440);
  this.emit('stats', this.stats);
};

/**
 * Push inactivity time to the UI.
 */
Metyl.Subscription.prototype.pushInactivity = function(justPush) {
  this.emit('inactive', this.stats.inactiveTime);

  if(!justPush) {
    this.stats.inactiveTime += 1;
  }
};


/**
 * Called at the beginning of tomorrow. Creates another timeout to call this
 * function again at the next day.
 */
Metyl.Subscription.prototype.resetDay = function() {
  var self = this;

  this.stats.today = 0;
  this.pushStats();
  setTimeout(function() {
    self.resetDay();
  }, 86400000);
};


/**
 * Called at the beginning of next week. Creates another timeout to call this
 * function again at the beginning of the following week.
 */
Metyl.Subscription.prototype.resetWeek = function() {
  var self = this;

  this.stats.week = 0;
  this.pushStats();
  setTimeout(function() {
    self.resetWeek();
  }, 604800000);
};

})();
