var events =require("events");
var util = require("util");
var client = require("../lib/massive.postgres");

var Query = function(_sql,_params){
  
  events.EventEmitter.call(this);

  this.params = _params || [];
  this.sql = _sql;

  this.on("newListener", function(eventName){
    if(eventName == "row"){
      //fire the query
      client.stream(this);
    }
  })
  this.execute = function(callback) {
    client.execute(this,callback);    
  };

  this.toArray = function(callback) {
    client.getRecords(this,callback);   
  }

  this.limit = function (){
    var _limit = "";
    if(arguments.length > 1) _limit = " \nLIMIT (" + arguments[0] + "," + arguments[1] + ")";
    else if(arguments.length > 0) _limit = " \nLIMIT " + arguments[0];

    this.sql+=_limit;
    return this;
  }

  this.order = function(order){
    this.sql+= " \nORDER BY " + order;
    return this;
  }

  this.where = function () {
    var conditions = arguments[0];
    var _conditions = [], 
        prop, 
        op,
        _escapes = [], 
        n = _escapes.length + 1;
    var k;
    var limit = "";
    var order = "";
    
    for (k in conditions) {
      if (!conditions.hasOwnProperty(k)) continue;

      if (k.indexOf(" ") > 0) {
        op = k.substr(k.indexOf(" ") + 1, k.length).replace(/^\s+/, "").trim();
        prop = k.substr(0, k.indexOf(" "));

        if ([ "=", "!", ">", "<", ">=", "<=", "!=", "<>" ].indexOf(op) == -1) {
          op = "=";
        }else if([ "!=", "<>"].indexOf(op) > -1) {
          op = "<>";
        } else if (op == "!") {
          op = "!=";
        }

      } else {
        prop = k;
        op = "=";
      }

      switch (typeof conditions[k]) {
        case "boolean":
          _conditions.push("\"" + prop + "\"" + op + (conditions[k] ? 1 : 0));
          break;
        case "number":
          _conditions.push("\"" + prop + "\"" + op + conditions[k]);
          break;
        default:
          if (Array.isArray(conditions[k])) {
            var array_conditions = [];

            for (var i = 0; i < conditions[k].length; i++) {
              array_conditions.push("$" + (n++));
              _escapes.push(conditions[k][i]);
            }
            _conditions.push("\"" + prop + "\"" + ((op == "!=" || op == "<>") ? " NOT" : "") + " IN (" + array_conditions.join(", ") + ")");
          } else {
            _conditions.push("\"" + prop + "\"" + op + "$" + (n++));
            _escapes.push(conditions[k]);
          }
      } 
    }

    this.sql+= " \nWHERE " + _conditions.join(" \nAND ");
    this.params = _escapes;
    return this;
  };
}

util.inherits(Query,events.EventEmitter);
module.exports = Query;