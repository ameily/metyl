var Metyl = {};

(function() {

var _factories = [];

Metyl.Event = function(props) {
  this.data = props.data || {};
  this.origin = props.origin || null;
};

Metyl.registerMiddleware = function(callback) {
  _factories.push(callback);
}

Metyl.Application = function() {
  EventEmitter.call(this);
};

Metyl.Application.prototype = Object.create(EventEmitter.prototype);

Metyl.Application.prototype._buildPipeline = function() {
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

Metyl.Application.prototype.process = function(event) {
  var callback = this._buildPipeline();
  var e = new Metyl.Event(event);
  callback(e);
};

Metyl.Application.prototype.renderEventItem = function(elementName, event) {
  this.emit('eventItem', elementName, event);
};

})();
