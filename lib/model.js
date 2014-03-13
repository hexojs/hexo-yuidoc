var _ = require('lodash'),
  constants = require('./constants'),
  util = require('./util');

var pluralMap = constants.pluralMap,
  singularMap = constants.singularMap,
  itemtypes = constants.itemtypes;

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

model.static('findClass', function(name){
  var result;

  this.each(function(obj){
    if (obj.classes.hasOwnProperty(name)){
      result = obj.classes[name];
      return false;
    }
  });

  return result;
});

model.static('findModule', function(name){
  var result;

  this.each(function(obj){
    if (obj.modules.hasOwnProperty(name)){
      result = obj.modules[name];
      return false;
    }
  });

  this.each()
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
model.pre('remove', function(){
  var route = hexo.route;

  _.each(this.classes, function(obj){
    route.remove(obj.path);
  });

  _.each(this.modules, function(obj){
    route.remove(obj.path);
  });
});