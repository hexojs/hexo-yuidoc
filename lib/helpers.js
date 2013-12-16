// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
// http://nodejs.org/api/
// https://github.com/yui/yuidoc/blob/2a1fdedbdf6d855536634e151869c6439e77ce37/lib/builder.js#L275
var nativeTypes = {
  'Array': 1,
  'Boolean': 1,
  'Date': 1,
  'decodeURI': 1,
  'decodeURIComponent': 1,
  'encodeURI': 1,
  'encodeURIComponent': 1,
  'eval': 1,
  'Error': 1,
  'EvalError': 1,
  'Function': 1,
  'Infinity': 1,
  'isFinite': 1,
  'isNaN': 1,
  'Math': 1,
  'NaN': 1,
  'Number': 1,
  'Object': 1,
  'parseFloat': 1,
  'parseInt': 1,
  'RangeError': 1,
  'ReferenceError': 1,
  'RegExp': 1,
  'String': 1,
  'SyntaxError': 1,
  'TypeError': 1,
  'undefined': 1,
  'URIError': 1,
  'HTMLElement': 'https://developer.mozilla.org/en/Document_Object_Model_(DOM)/',
  'HTMLCollection': 'https://developer.mozilla.org/en/Document_Object_Model_(DOM)/',
  'DocumentFragment': 'https://developer.mozilla.org/en/Document_Object_Model_(DOM)/',
  'HTMLDocument': 'https://developer.mozilla.org/en/Document_Object_Model_(DOM)/',
  'EventEmitter': 'http://nodejs.org/api/events.html',
  'Buffer': 'http://nodejs.org/api/buffer.html',
  'fs.Stats': 'http://nodejs.org/api/fs.html#fs_class_fs_stats',
  'fs.ReadStream': 'http://nodejs.org/api/fs.html#fs_class_fs_readstream',
  'fs.WriteStream': 'http://nodejs.org/api/fs.html#fs_class_fs_readstream',
  'stream.Readable': 'http://nodejs.org/api/stream.html#stream_class_stream_readable',
  'stream.Writable': 'http://nodejs.org/api/stream.html#stream_class_stream_writable',
  'stream.Duplex': 'http://nodejs.org/api/stream.html#stream_class_stream_duplex',
  'stream.Transform': 'http://nodejs.org/api/stream.html#stream_class_stream_transform',
  'Worker': 'http://nodejs.org/api/cluster.html#cluster_class_worker'
};

Object.keys(nativeTypes).forEach(function(i){
  if (nativeTypes[i] === 1){
    nativeTypes[i] = 'https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/' + i;
  }
});

exports.yuidoc_type = function(types){
  var classes = this.site.yuidoc.findByName(this.page.yuidoc.name).classes,
    result = [];

  types.split('|').forEach(function(type){
    var link = '';

    if (classes.hasOwnProperty(type)){
      link = hexo.config.root + classes[type].path;
    } else if (nativeTypes.hasOwnProperty(type)){
      link = nativeTypes[type];
    }

    if (link){
      result.push('<a href="' + link + '">' + type + '</a>');
    } else {
      result.push('<span>' + type + '</span>');
    }
  });

  return result.join(' | ');
};

exports.yuidoc_params = function(params){
  var arr = [];

  if (params && params.length){
    params.forEach(function(item){
      if (item.optional){
        arr.push('[' + item.name + (item.optdefault ? '=' + item.optdefault : '') + ']');
      } else {
        arr.push(item.name);
      }
    });
  }

  return '(' + arr.join(', ') + ')';
};