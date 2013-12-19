var _ = require('lodash');

var pluralMap = exports.pluralMap = {
  method: 'methods',
  property: 'properties',
  event: 'events',
  attribute: 'attributes'
};

var singularMap = exports.singularMap = {};

_.each(pluralMap, function(val, key){
  singularMap[val] = key;
});

exports.itemtypes = Object.keys(singularMap);