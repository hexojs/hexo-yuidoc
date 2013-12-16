var _ = require('lodash'),
  util = require('./util');

var model = module.exports = new hexo.model.Schema({
  name: String,
  path: String,
  permalink: String,
  project: Object,
  modules: Object,
  classes: Object
});

model.static('findByName', function(name){
  return this.findOne({name: name});
});

// Remove routes
model.pre('remove', function(){
  var route = hexo.route;

  _.each(this.classes, function(obj){
    route.remove(obj.path);
  });

  _.each(this.modules, function(obj){
    route.remove(obj.path);
  });
});