var _ = require('lodash');

// Default config
hexo.config = _.extend({
  yuidoc_dir: 'api'
}, hexo.config);

// Model
hexo.model.register('YUIDoc', require('./model'));

// Generator
hexo.extend.generator.register(require('./generator'));

// Processor
hexo.extend.processor.register('_yuidoc/*name.json', require('./processor'));

// Helpers
var helpers = require('./helpers');

hexo.extend.helper.register('yuidoc_type', helpers.yuidoc_type);
hexo.extend.helper.register('yuidoc_params', helpers.yuidoc_params);
hexo.extend.helper.register('get_current_yuidoc', helpers.get_current_yuidoc);

// Expose the model to template variables
hexo.locals({
  yuidoc: function(){
    return hexo.model('YUIDoc')
  }
});