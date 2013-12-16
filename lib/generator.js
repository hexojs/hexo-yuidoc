var _ = require('lodash');

module.exports = function(locals, render, callback){
  locals.yuidoc.each(function(data){
    var path = data.path;

    _.each(data.classes, function(obj, name){
      obj.yuidoc = data;
      render(obj.path, ['api/class', 'api/index', 'api'], obj);
    });

    _.each(data.modules, function(obj, name){
      obj.yuidoc = data;
      render(obj.path, ['api/module', 'api/index', 'api'], obj);
    });
  });

  callback();
};