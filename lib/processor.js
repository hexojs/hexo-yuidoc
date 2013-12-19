var _ = require('lodash'),
  constants = require('./constants'),
  util = require('./util');

var pluralMap = constants.pluralMap,
  singularMap = constants.singularMap,
  itemtypes = constants.itemtypes;

module.exports = function(data, callback){
  var YUIDoc = hexo.model('YUIDoc'),
    config = hexo.config,
    renderSync = hexo.render.renderSync;

  var name = data.params.name,
    doc = YUIDoc.findOne({name: name});

  // @TODO remove all routes before updating/deleting
  if (data.type === 'delete' && doc){
    doc.remove();

    return callback();
  }

  data.read({cache: true}, function(err, content){
    if (err) return callback(err);

    var swig = require('swig'),
      json = JSON.parse(content),
      path = util.join(config.yuidoc_dir, name === 'index' ? '' : name);

    var data = {
      name: name,
      path: path,
      permalink: util.join(config.url, path),
      project: json.project,
      classes: {},
      modules: {}
    };

    /**
    * Crosslink tag
    *
    * This tag plugin helps you cross-reference classes. It uses this pattern:
    *
    * ```
    * {% crosslink Class/item:type [link text] %}
    * ```
    *
    * `type` can be ignored. The value is `method` by default.
    */
    // @TODO crosslink for module
    var _crossLink = function(){
      var args = this.args,
        text = args.length > 1 ? args.slice(1).join(' ') : args[0],
        split = args[0].split('/'),
        classObj = data.classes[split[0]],
        link = config.root;

      // Only class name
      if (split.length === 1){
        link += classObj.path;
      } else {
        var itemSplit = split[1].split(':'),
          item = itemSplit[0],
          types = _.unique([].concat(pluralMap[itemSplit[1]] || 'methods', itemtypes)),
          childObj;

        for (var i = 0, len = types.length; i < len && !childObj; i++){
          var index = classObj._index[types[i]].indexOf(item);

          if (index > -1){
            childObj = classObj[types[i]][index];
          }
        }

        if (childObj) link += childObj.path;
      }

      var out = [
        '(function(){',
          '_output += "<a href=\'' + link + '\'>' + text + '</a>";',
        '})();'
      ].join('\n');

      return out;
    };

    swig.init({
      tags: _.extend({
        crosslink: _crossLink,
        crossLink: _crossLink,
        cross_link: _crossLink
      }, hexo.extend.tag.list())
    });

    var _render = function(str){
      str = swig.compile(str)();

      str = renderSync({
        text: str,
        engine: 'markdown'
      });

      return str;
    };

    // Add and sort classes and modules
    ['classes', 'modules'].forEach(function(i){
      Object.keys(json[i]).sort().forEach(function(j){
        data[i][j] = json[i][j];
      });
    });

    // Process attributes in classes
    _.each(data.classes, function(obj){
      obj.is_constructor = !!obj.is_constructor;
      obj.static = !!obj.static;
      obj.properties = [];
      obj.methods = [];
      obj.events = [];
      obj.attributes = [];

      if (!obj.params) obj.params = [];
    });

    // Process attributes in modules
    _.each(data.modules, function(obj){
      var name = obj.title = obj.name;
      obj.path = util.join(path, 'modules', name) + '.html';
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

    // Add class items
    _.each(json.classitems, function(obj){
      if (!obj.itemtype) return;

      ['static', 'chainable', 'async', 'final'].forEach(function(i){
        obj[i] = !!obj[i];
      });

      if (!obj.params) obj.params = [];

      data.classes[obj.class][pluralMap[obj.itemtype]].push(obj);
    });

    // Find inherited items
    var _getInherited = function(obj){
      var parents = _.compact([].concat(obj.extends, obj.uses));

      if (obj._isProcessed) return;

      obj._isProcessed = true;

      if (!parents.length) return;

      parents.forEach(function(parent){
        var parentObj = data.classes[parent];

        if (!parentObj) return;
        if (!parentObj._isProcessed) _getInherited(parentObj);

        itemtypes.forEach(function(i){
          var data = obj[i],
            parentData = parentObj[i],
            dataIndex = _.map(data, 'name');

          parentData.forEach(function(item){
            var index = dataIndex.indexOf(item.name);

            if (index == -1){
              var clone = _.clone(item);
              clone.extended_from = parentObj;

              data.push(clone);
            } else {
              var clone = _.clone(data[index]);
              clone.overwritten_from = parentObj;

              data[index] = clone;
            }
          });
        });
      });
    };

    // Sort class items
    _.each(data.classes, function(obj){
      var name = obj.title = obj.name;

      obj.path = util.join(path, 'classes', name) + '.html',
      obj.permalink = util.join(config.url, obj.path);

      obj._index = {
        properties: [],
        methods: [],
        events: [],
        attributes: []
      };

      _getInherited(obj);

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

    var _renderObj = function(obj){
      if (obj.description) obj.description = _render(obj.description);

      if (obj.params){
        obj.params.forEach(function(param){
          param.description = _render(param.description);
        });
      }

      if (obj.return && obj.return.description){
        obj.return.description = _render(obj.return.description);
      }
    };

    // Render description
    _.each(data.modules, _renderObj);

    _.each(data.classes, function(obj){
      _renderObj(obj);

      itemtypes.forEach(function(i){
        obj[i].forEach(_renderObj);
      });
    });

    if (doc){
      doc.replace(data, function(){
        callback();
      });
    } else {
      YUIDoc.insert(data, function(){
        callback();
      });
    }
  });
};