var _ = require('lodash');

exports.join = function(){
  var args = _.toArray(arguments),
    result = '';

  for (var i = 0, len = args.length - 1; i < len; i++){
    var str = args[i];

    if (str) result += str + (str[str.length - 1] === '/' ? '' : '/');
  }

  result += args[i];

  return result;
};