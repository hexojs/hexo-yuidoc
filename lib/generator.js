var _ = require('lodash');

module.exports = function(locals, render, callback){
  locals.yuidoc.each(function(data){
    var name = data.name;

    _.each(data.classes, function(obj){
      obj.yuidoc_name = name;
      render(obj.path, ['api/class', 'api/index', 'api'], obj);
    });

    _.each(data.modules, function(obj){
      obj.yuidoc_name = name;
      render(obj.path, ['api/module', 'api/index', 'api'], obj);
    });
  });

  callback();
};