var _ = require('lodash'),
  async = require('async'),
  util = require('./util'),
  constants = require('./constants');

var pluralMap = constants.pluralMap,
  singularMap = constants.singularMap,
  itemtypes = constants.itemtypes;

var _getInherited = function(collection, obj){
  if (obj._isProcessed) return;

  var parents = _.compact([].concat(obj.extends, obj.uses));
  obj._isProcessed = true;

  if (!parents.length) return;

  parents.forEach(function(parent){
    var parentClass = collection.classes[parent];

    if (!parentClass) return;

    _getInherited(collection, parentClass);

    itemtypes.forEach(function(i){
      var data = obj[i],
        parentData = parentClass[i],
        dataIndex = _.map(data, 'name');

      parentData.forEach(function(item){
        var index = dataIndex.indexOf(item.name);

        if (index > -1){
          var clone = _.clone(data[index]);
          clone.overwritten_from = parentClass;

          data[index] = clone;
        } else {
          var clone = _.clone(item);
          clone.extended_from = parentClass;

          data.push(clone);
        }
      });
    });
  });
};

var _render = function(data, str, callback){
  var locals = {
    yuidoc: data,
    content: str,
    engine: 'markdown'
  };

  hexo.post.render(null, locals, function(err, result){
    if (err) return callback(err);

    callback(null, result.content);
  });
};

var _renderObj = function(data, obj, callback){
  async.parallel([
    function(next){
      if (!obj.description) return next();

      _render(data, obj.description, function(err, result){
        if (err) return next(err);

        obj.description = result;
        next();
      });
    },
    function(next){
      if (!obj.params || !obj.params.length) return next();

      async.each(obj.params, function(param, next){
        if (!param.description) return next();

        _render(data, param.description, function(err, result){
          if (err) return next(err);

          param.description = result;
          next();
        });
      }, next);
    },
    function(next){
      if (!obj.return || !obj.return.description) return next();

      _render(data, obj.return.description, function(err, result){
        if (err) return next(err);

        obj.return.description = result;
        next();
      });
    }
  ], callback);
};

module.exports = function(file, callback){
  var YUIDoc = hexo.model('YUIDoc'),
    config = hexo.config,
    name = file.params.name,
    doc = YUIDoc.findByName(name),
    path = util.join(config.yuidoc_dir, name === 'index' ? '' : name),
    json = {};

  if (file.type === 'delete'){
    if (doc){
      doc.remove();
    }

    return callback();
  }

  var data = {
    name: name,
    path: path,
    permalink: util.join(config.url, path),
    project: {},
    classes: {},
    modules: {}
  };

  async.series([
    function(next){
      file.read({cache: true}, function(err, content){
        if (err) return next(err);

        try {
          json = JSON.parse(content);
          next();
        } catch (e){
          next(e);
        }
      });
    },
    function(next){
      data.project = json.project;

      // Add and sort classes and modules to data
      ['classes', 'modules'].forEach(function(i){
        Object.keys(json[i]).sort().forEach(function(j){
          data[i][j] = json[i][j];
        });
      });

      // Process classes
      _.each(data.classes, function(obj){
        obj.static = !!obj.static;
        obj.is_constructor = !!obj.is_constructor;
        obj.properties = [];
        obj.methods = [];
        obj.events = [];
        obj.attributes = [];
        obj.title = obj.name;
        obj.path = util.join(path, 'classes', obj.name) + '.html';
        obj.permalink = util.join(config.url, obj.path);
        obj._index = {
          properties: [],
          methods: [],
          events: [],
          attributes: []
        };
      });

      // Process modules
      _.each(data.modules, function(obj){
        obj.title = obj.name;
        obj.path = util.join(path, 'modules', obj.name) + '.html';
        obj.permalink = util.join(config.url, obj.path);

        ['submodules', 'classes', 'fors', 'namespaces'].forEach(function(i){
          var keys = Object.keys(obj[i]).sort(),
            collection = i === 'submodules' ? 'modules' : 'classes',
            result = [];

          keys.forEach(function(key){
            if (data[collection].hasOwnProperty(key)) result.push(data[collection][key]);
          });

          obj[i] = result;
        });
      });

      // Add class items to classes
      _.each(json.classitems, function(obj){
        if (!obj.itemtype) return;

        ['static', 'chainable', 'async', 'final'].forEach(function(i){
          obj[i] = !!obj[i];
        });

        data.classes[obj.class][pluralMap[obj.itemtype]].push(obj);
      });

      // Process class items
      _.each(data.classes, function(obj){
        _getInherited(data, obj);

        itemtypes.forEach(function(i){
          var arr = obj[i] = _.sortBy(obj[i], 'name');
          obj._index[i] = _.map(arr, 'name');

          arr.forEach(function(item){
            item.slug = singularMap[i] + '_' + item.name;
            item.path = obj.path + '#' + item.slug;
            item.permalink = util.join(config.url, item.path);
          });
        });
      });

      next();
    },
    function(next){
      var modules = data.modules;

      async.each(Object.keys(modules), function(key, next){
        _renderObj(data, modules[key], next);
      }, next);
    },
    function(next){
      var classes = data.classes;

      async.each(Object.keys(classes), function(key, next){
        var obj = classes[key];

        async.parallel([
          function(next){
            _renderObj(data, obj, next);
          },
          function(next){
            async.each(itemtypes, function(i, next){
              async.each(obj[i], function(item, next){
                _renderObj(data, item, next);
              }, next);
            }, next);
          }
        ], next);
      }, next);
    },
    function(next){
      if (doc){
        doc.replace(data, function(){
          next();
        });
      } else {
        YUIDoc.insert(data, function(){
          next();
        });
      }
    }
  ], callback);
};