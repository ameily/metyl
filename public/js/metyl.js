var Metyl = {};

(function() {

Metyl.Event = function(props) {
  this.data = props.data || {};
  this.origin = props.origin || null;
};

Metyl.Application = function() {
  this._pipeline = [];
};

Metyl.Application.prototype._buildPipeline = function() {
  var index = -1;
  return function(event) {
    index += 1;
    if(index >= pipeline.length) {
      return;
    } else {
      pipline[index](event, this);
    }
  }
};

Metyl.Application.prototype.add = function(callback) {
  this._pipeline.push(callback);
};

Metyl.Application.prototype.process = function(event) {
  var callback = this._buildPipeline(this.pipeline);
  var e = new Metyl.Event(event);
  callback(e);
};

})();
