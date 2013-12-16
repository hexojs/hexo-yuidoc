var _ = require('lodash'),
  util = require('./util');

var pluralMap = {
  method: 'methods',
  property: 'properties',
  event: 'events',
  attribute: 'attributes'
};

var singularMap = {};

_.each(pluralMap, function(val, key){
  singularMap[val] = key;
});

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
          types = _.unique([pluralMap[itemSplit[1]] || 'methods', 'methods', 'properties', 'attributes', 'events']),
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

    // @TODO Add inherited methods
    // Add class items
    _.each(json.classitems, function(obj){
      if (!obj.itemtype) return;

      ['static', 'chainable', 'async', 'final'].forEach(function(i){
        obj[i] = !!obj[i];
      });

      if (obj.itemtype === 'method'){
        if (!obj.params) obj.params = [];
      }

      data.classes[obj.class][pluralMap[obj.itemtype]].push(obj);
    });

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

      ['properties', 'methods', 'events', 'attributes'].forEach(function(i){
        obj[i] = _.sortBy(obj[i], 'name');

        obj[i].forEach(function(item){
          item.slug = singularMap[i] + '_' + item.name;
          item.path = obj.path + '#' + item.slug;
          item.permalink = util.join(config.url, item.path);
        });

        obj._index[i] = _.map(obj[i], 'name');
      });
    });

    // Render description
    ['classes', 'modules', 'classitems'].forEach(function(name){
      _.each(json[name], function(item){
        if (!item.description) return;

        item.description = _render(item.description);

        if (item.params){
          item.params.forEach(function(param){
            param.description = _render(param.description);
          });
        }

        if (item.return){
          item.return.description = _render(item.return.description);
        }
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