
var Log = require('./logger'),
  logger = new Log(global.logLevel),
  localtunnel = require('localtunnel');


var Tunnel = function Tunnel(key, port, uniqueIdentifier, callback) {
  if (typeof callback !== 'function') {
    callback = function(){};
  }

  logger.debug('[%s] Launching LocalTunnel', new Date());

  var tunnel = localtunnel(port, function(err, tunnel) {
    if (err) {
      console.error(err);
      logger.debug('[%s] LocalTunnel launching failed', new Date());
      return process.exit('SIGINT');
    }

    logger.debug('[%s] LocalTunnel launched', new Date());
    callback(tunnel ? tunnel.url : null);
  });

  tunnel.on('close', function() {
    logger.debug('[%s] LocalTunnel closed', new Date());
  });

  return tunnel;
};


exports.Tunnel = Tunnel;
