var es = require('event-stream');
var path = require('path');
var child_process = require('child_process');
var async = require('async');
var dargs = require('dargs');
var PluginError = require('gulp-util').PluginError;
var winExt = /^win/.test(process.platform)?".cmd":"";

var protractor = function(options) {
	var files = [],
		child, args;

	options = options || {};
	args = options.args || {};

	if (!options.configFile) {
		this.emit('error', new PluginError('gulp-protractor', 'Please specify the protractor config file'));
	}
	return es.through(function(file) {
		files.push(file.path);
	}, function() {
		var stream = this;

		// Attach Files, if any
		if (files.length) {
			args.specs = files.join(',');
		}

		// Pass in args
		args = dargs(args, ['seleniumAddress', 'seleniumServerJar', 'seleniumPort', 'rootElement', 'stackTrace', 'stackTrace']);

		// Pass in the config file
		args.unshift(options.configFile);

		// Attach debug if we have to
		if(options.debug) {
			args.unshift('debug');
		}

		child = child_process.spawn(path.resolve('./node_modules/.bin/protractor'+winExt), args, {
			stdio: 'inherit'
		}).on('exit', function(code) {
			if (child) {
				child.kill();
			}
			if (stream) {
				if (code) {
					stream.emit('error', new PluginError('gulp-protractor', 'protractor exited with code ' + code));
				}
				else {
					stream.emit('end');
				}
			}
		});
	});
};

var webdriver_update = function(cb) {
	child_process.spawn(path.resolve('./node_modules/.bin/webdriver-manager'+winExt), ['update'], {
		stdio: 'inherit'
	}).once('close', cb);
};

var webdriver_start = function(cb) {
	var child = child_process.spawn(path.resolve('./node_modules/.bin/webdriver-manager'+winExt), ['start'], {
		stdio: 'pipe'
	});

   	child.on('close', cb);

    child.stdout.on('data', function(data) {
      var sentinal = 'Started org.openqa.jetty.jetty.Server';
      console.log(data.toString());
      if (data.toString().indexOf(sentinal) !== -1) {
        cb(null, child);
      }
    });
};

module.exports = {
	protractor: protractor,
	webdriver: function(cb) {
		async.series([webdriver_update, webdriver_start], cb);
	}
};