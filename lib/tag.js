var _ = require('lodash'),
  constants = require('./constants');

var pluralMap = constants.pluralMap,
  itemtypes = constants.itemtypes;

/**
* Crosslink tag
*
* This tag plugin helps you cross-reference other classes. It uses this pattern:
*
* ```
* {% crosslink class/item:[type] [link text] %}
* ```
*/
exports.crosslink = function(args, content, options){
  var text = args.length > 1 ? args.slice(1).join(' ') : args[0],
    split = args[0].split('/'),
    link = '',
    classObj;

  if (options.locals.yuidoc){
    classObj = options.locals.yuidoc.classes[split[0]];
  } else {
    classObj = hexo.model('YUIDoc').findClass(split[0]);
  }

  if (!classObj) return text;

  if (split.length === 1){
    link = classObj.path;
  } else {
    var itemSplit = split[1].split(':'),
      item = itemSplit[0],
      types = _.unique([].concat(pluralMap[itemSplit[1]] || 'methods', itemtypes));

    for (var i = 0, len = types.length; i < len; i++){
      var index = classObj._index[types[i]].indexOf(item);

      if (index > -1){
        link = classObj[types[i]][index].path;
        break;
      }
    }
  }

  if (link){
    return '<a href="' + hexo.config.root + link + '">' + text + '</a>';
  } else {
    return text;
  }
};