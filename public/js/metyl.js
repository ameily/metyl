var Metyl = {};

(function () {

Metyl.Event = function(props) {
  this.data = props.data;
  this.origin = props.origin;
  this.timestamp = props.timestamp;
  this.moment = moment.unix(this.timestamp);
};

Metyl.zeroPad = function(i, count) {
  var s = i.toString();
  if(s.length < count) {
    return Array(count - s.length + 1).join('0') + s;
  }
  return s;
}

})();
