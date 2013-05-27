var config = {
    filename: __filename
  , ns: 'is'
  , scripts: {
    infiniteScroll: require('./lib')
  }
};

module.exports = ui;
ui.decorate = 'derby';

function ui(derby, options) {
  derby.createLibrary(config, options)
}