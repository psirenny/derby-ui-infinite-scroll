var _ = require('lodash')
  , _a = require('underscore-awesomer')
  , _s = require('underscore.string');

var getFn = function (str) {
  return _.keypath(DERBY.app, str)
};

exports._canPage = function (e, el, dom, model, dir) {
  if (this.loading) return false;

  switch (dir) {
    case 'down': return this.canPageDown(e, el, dom, model);
    case 'up': return this.canPageUp(e, el, dom, model);
  }
};

exports._canPageDown = function (e, el, dom, model) {
  return model.get('bottomPage.items').length >= model.get('options.pageSize');
};

exports._canPageUp = function (e, el, dom, model) {
  return  model.get('topPage.items').length >= model.get('options.pageSize');
};

exports._getPageTarget = function (e, el, dom, model) {
  switch (dir) {
    case 'down': return this.getPageTargetDown(e, el, dom, model);
    case 'up': return this.getPageTargetUp(e, el, dom, model);
  }
};

exports._nearBottom = function (e, el, dom, model) {
  var height = $(el).height()
    , scrollHeight = el.scrollHeight
    , scrollTop = $(el).scrollTop()
    , topStubHeight = model.get('stubs.top.height')
    , bottomStubHeight = model.get('stubs.bottom.height');

  var checkBound = function (bound) {
    if (_s.endsWith(bound, '%')) {
      bound = _s.toNumber(_s.rtrim(bound, '%')) / 100;
      return 1 - ((scrollTop - topStubHeight) / (scrollHeight - height - topStubHeight - bottomStubHeight)) < bound;
    } else {
      bound = _s.toNumber(_s.rtrim(bound, 'px'));
      return scrollHeight - height - scrollTop - bottomStubHeight < bound;
    }
  };

  return _.some(model.get('options.bounds'), checkBound);
};

exports._nearBoundary = function (e, el, dom, model, dir) {
  switch (dir) {
    case 'down': return this.nearBottom(e, el, dom, model);
    case 'up': return this.nearTop(e, el, dom, model);
  }
};

exports._nearTop = function (e, el, dom, model) {
  var height = $(el).height()
    , scrollHeight = el.scrollHeight
    , scrollTop = $(el).scrollTop()
    , topStubHeight = model.get('stubs.top.height')
    , bottomStubHeight = model.get('stubs.bottom.height');

  var checkBound = function (bound) {
    if (_s.endsWith(bound, '%')) {
      bound = _s.toNumber(_s.rtrim(bound, '%')) / 100;
      return (scrollTop - topStubHeight) / (scrollHeight - height - topStubHeight - bottomStubHeight) < bound;
    } else {
      bound = _s.toNumber(_s.rtrim(bound, 'px'));
      return scrollTop - topStubHeight < bound;
    }
  };

  return _.some(model.get('options.bounds'), checkBound);
};

exports._page = function (e, el, dom, model, dir) {
  this.loading = true;

  switch (dir) {
    case 'down': this.pageDown(e, el, dom, model); break;
    case 'up': this.pageUp(e, el, dom, model); break;
  }

  this.loading = false;
};

exports._pageDown = function (e, el, dom, model) {
  var _this = this
    , n = model.get('bottomPageNumber') + 1
    , scrollHeight = el.scrollHeight
    , stub = model.at('stubs.bottom')
    , target = this.getPageTargetDown(e, el, dom, model)
    , reverse = model.get('options.reverseDown');

  this.root.fetch(target, function (err, results) {
    console.log('here');
    console.log(results.get());
  });
  return;

  this.root.subscribe(target, function (err, results) {
    if (err) return console.error(err);
    model.set('pages.' + n + '.id', n);
    model.ref('pages.' + n + '.ref', results);
    model.fn('pages.' + n + '.items', results, function (results) { return reverse ? results.reverse() : results; });
    model.push('pageNumbers', n);
    stub.set('height', Math.max(0, stub.get('height') - (el.scrollHeight - scrollHeight)));
    stub.set('length', Math.max(0, stub.get('length') - results.get().length));
    if (model.get('options.maxPages')) _this.trimPages(e, el, dom, model);
  });
};

exports._pageUp = function (e, el, dom, model) {
  return;
  var _this = this
    , n = model.get('topPageNumber') - 1
    , scrollHeight = el.scrollHeight
    , stub = model.at('stubs.top')
    , target = this.getPageTargetUp(e, el, dom, model)
    , reverse = model.get('options.reverseUp');

  this.root.subscribe(target, function (err, results) {
    if (err) return console.error(err);
    model.set('pages.' + n + '.id', n);
    model.ref('pages.' + n + '.ref', results);
    model.fn('pages.' + n + '.items', results, function (results) { return reverse ? results.reverse() : results; });
    model.unshift('pageNumbers', n);
    stub.set('height', Math.max(0, stub.get('height') - (el.scrollHeight - scrollHeight)));
    stub.set('length', Math.max(0, stub.get('length') - results.get().length));
    if (model.get('options.maxPages')) _this.trimPages(e, el, dom, model);
  });
};

exports._scroll = function (e, el, dom, model) {
  var _this = this
    , dirs = model.get('options.directions');

  var dir = _.find(dirs, function (dir) {
    return _this.nearBoundary(e, el, dom, model, dir) && _this.canPage(e, el, dom, model, dir);
  });

  this.page(e, el, dom, model, dir);
};

exports.trimPages = function (e, el, dom, model) {
  var excess = model.get('pageNumbers').length - model.get('options.maxPages');
  if (excess <= 0) return;

  _.times(excess, function () {
    var topStubHeight = model.get('stubs.top.height')
      , bottomStubHeight = model.get('stubs.bottom.height')
      , curScrollHeight = el.scrollHeight
      , loc = ($(el).scrollTop() - topStubHeight) / (curScrollHeight - $(el).height() - bottomStubHeight - topStubHeight);

    if (loc > .5) {
      var n = model.shift('pageNumbers'), s = 'top';
    } else {
      var n = model.pop('pageNumbers'), s = 'bottom';
    }

    page = model.at('pages.' + n);
    stub = model.at('stubs.' + s);
    stub.incr('height', curScrollHeight - el.scrollHeight);
    stub.incr('length', page.get('items').length);
    page.unsubscribe();
    page.del();
  });
};

exports.init = function (model) {
  var options = {
      bottomStub: model.get('bottomstub') || 'bottomStub'
    , bounds: model.get('bounds') || '500px'
    , canPage: model.get('canpage')
    , canPageDown: model.get('canpagedown')
    , canPageUp: model.get('canpageup')
    , directions: (model.get('directions') || 'down, up').replace(' ', '').split(',')
    , getPageTarget: model.get('target')
    , getPageTargetDown: model.get('down')
    , getPageTargetUp: model.get('up')
    , init: model.at('init')
    , key: (model.get('key') || 'id').replace(' ', '').split(',')
    , maxPages: model.get('maxpages') || 3
    , nearBoundary: model.get('nearboundary')
    , nearBottom: model.get('nearbottom')
    , nearTop: model.get('neartop')
    , page: model.get('page')
    , pageDown: model.get('pagedown')
    , pageUp: model.get('pageup')
    , pageSize: model.get('pagesize') || 10
    , reverseDown: model.get('reversedown') || false
    , reverseUp: model.get('reverseup') || false
    , scope: model.get('scope')
    , scroll: model.get('scroll')
    , throttle: model.get('throttle') || 2000
    , topStub: model.get('topstub') || 'topStub'
    , window: model.get('window') || 'window'
  };

  if (!_.isArray(options.bounds)) {
    options.bounds = [options.bounds];
  }

  if (!options.getPageTarget) {
    _.each(options.directions, function (dir) {
      if (!options['getPageTarget' + _s.capitalize(dir)]) {
        console.error(_s.sprintf('did not set a %s fn', dir));
      }
    });
  }

  if (!_.isArray(options.key)) {
    options.key = [options.key];
  }

  this.data = {options: options};
  this.root = model.parent().parent();
  this.scope = options.scope ? this.root.at(options.scope) : model;
};

exports.create = function (model, dom) {
  if (typeof $ === 'undefined') {
    return console.log('jQuery required');
  }

  var _this = this
    , data = this.data
    , options = data.options
    , root = this.root
    , scope = this.scope
    , stubs = scope.at('stubs');

  var window = dom.element(options.window);
  if (!window) return console.error('cannot find window');

  var fns = [
      'canPage'
    , 'canPageDown'
    , 'canPageUp'
    , 'nearBottom'
    , 'nearBoundary'
    , 'nearTop'
    , 'page'
    , 'pageDown'
    , 'pageUp'
    , 'getPageTarget'
    , 'getPageTargetDown'
    , 'getPageTargetUp'
    , 'scroll'
  ];

  _.each(fns, function (fn) {
    _this[fn] = options[fn] ? getFn(options[fn]) : _this['_' + fn];
  });

  scope.set('options', options);
  scope.set('pages', {1: {id: 1}});
  scope.ref('pages.1.ref', options.init);
  scope.fn('pages.1.items', options.init, function (items) { return items; });
  scope.set('pageNumbers', [1]);
  scope.fn('pageCount', scope.at('pageNumbers'), function (pageNumbers) { return pageNumbers.length; });
  scope.fn('topPageNumber', scope.at('pageNumbers'), function (pageNumbers) { return pageNumbers[0]; });
  scope.fn('topPage', scope.at('pages'), scope.at('topPageNumber'), function (pages, topPageNumber) { return pages[topPageNumber]; });
  scope.fn('topItem', scope.at('topPage'), function (topPage) { return _.keypath(topPage, 'items.0'); });
  scope.fn('bottomPageNumber', scope.at('pageNumbers'), function (pageNumbers) { return pageNumbers[pageNumbers.length - 1]; });
  scope.fn('bottomPage', scope.at('pages'), scope.at('bottomPageNumber'), function (pages, bottomPageNumber) { return pages[bottomPageNumber]; });
  scope.fn('bottomItem', scope.at('bottomPage'), function (bottomPage) { return bottomPage.items ? bottomPage.items[bottomPage.items.length - 1] : null; });
  stubs.set('bottom.height', 0);
  stubs.set('top.height', 0);
  stubs.fn('bottom.cssHeight', stubs.at('bottom.height'), function (height) { return height + 'px'; });
  stubs.fn('top.cssHeight', stubs.at('top.height'), function (height) { return height + 'px'; });
  scope.refList('pageList', scope.at('pages'), scope.at('pageNumbers'));
  scope.fn('itemList', scope.at('pageList'), function (pageList) { return _.flatten(_.pluck(pageList, 'items')); });

  _.each(options.key, function (key) {
    scope.fn('bottom' + _s.capitalize(key), scope.at('bottomPage'), function (bottomPage) { return bottomPage.items ? bottomPage.items[bottomPage.items.length - 1][key] : null; });
    scope.fn('top' + _s.capitalize(key), scope.at('topPage'), function (topPage) { return _.keypath(topPage, 'items.0.' + key); });
  });

  dom.addListener(window, 'scroll', _.throttle(function (e) {
    _this.emit('scroll', e);
    _this.scroll(e, e.srcElement, dom, scope);
  }, options.throttle));
};