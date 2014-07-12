var _ = require('lodash'),
  constants = require('./constants'),
  util = require('./util');

var pluralMap = constants.pluralMap,
  singularMap = constants.singularMap,
  cache = {};

var model = module.exports = new hexo.model.Schema({
  name: String,
  path: String,
  permalink: String,
  project: Object,
  modules: Object,
  classes: Object
});

model.static('findByName', function(name){
  var data = cache[name] = cache[name] || this.findOne({name: name});
  return data;
});

model.static('findClass', function(name){
  var keys = Object.keys(cache);

  for (var i = 0, len = keys.length; i < len; i++){
    var obj = cache[keys[i]];

    if (obj.classes.hasOwnProperty(name)){
      return obj.classes[name];
    }
  }
});

model.static('findModule', function(name){
  var keys = Object.keys(cache);

  for (var i = 0, len = keys.length; i < len; i++){
    var obj = cache[keys[i]];

    if (obj.modules.hasOwnProperty(name)){
      return obj.modules[name];
    }
  }
});

model.method('findItem', function(classname, name, type){
  if (!this.classes.hasOwnProperty(classname)) return;

  var classObj = this.classes[classname];
  type = singularMap[type] || type;

  if (!type) return;

  var index = classObj._index[type].indexOf(name);

  if (index === -1) return;

  return classObj[type][index];
});

model.method('findMethod', function(classname, name){
  return this.findItem(classname, name, 'method');
});

model.method('findAttribute', function(classname, name){
  return this.findItem(classname, name, 'attribute');
});

model.method('findProperty', function(classname, name){
  return this.findItem(classname, name, 'property');
});

model.method('findEvent', function(classname, name){
  return this.findItem(classname, name, 'event');
});

// Remove routes
model.pre('remove', function(data, next){
  var route = hexo.route;

  _.each(data.classes, function(obj){
    route.remove(obj.path);
  });

  _.each(data.modules, function(obj){
    route.remove(obj.path);
  });

  next();
});

model.post('save', function(data){
  cache[data.name] = data;
});

model.post('remove', function(data){
  delete cache[data.name];
});