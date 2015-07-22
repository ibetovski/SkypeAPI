var chalk = require('chalk'),
    fs = require('fs'),
    moment = require('moment'),
    util = require('util');

var showDebug = false;

function stdout() {
    var args = Array.prototype.slice.call(arguments);
    process.stdout.write('[' + moment().format('YYYY-MM-DD HH:mm:ss') + '] ' + chalk.green('[SkypeAPI] ') + util.format.apply(this, args) + '\n');
}

function stderr() {
    var args = Array.prototype.slice.call(arguments);
    process.stderr.write('[' + moment().format('YYYY-MM-DD HH:mm:ss') + '] ' + chalk.green('[SkypeAPI] ') + util.format.apply(this, args) + '\n');
}

exports.console = stdout;

exports.log = function () {
    stdout.apply(this, arguments);
};

exports.info = function () {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[INFO]');
    stdout.apply(this, args);
};

exports.warn = function () {
    var args = Array.prototype.slice.call(arguments);
    args.unshift(chalk.yellow('[WARNING]'));
    stdout.apply(this, args);
};

exports.error = function () {
    var args = Array.prototype.slice.call(arguments);
    args.unshift(chalk.red('[ERROR]'));
    stderr.apply(this, args);
};

exports.fatal = function () {
    var args = Array.prototype.slice.call(arguments);
    args.unshift(chalk.red('[FATAL]'));
    stderr.apply(this, args);
    process.exit(1);
};

exports.debug = function () {
    if (showDebug) {
        var args = Array.prototype.slice.call(arguments);
        args.unshift(chalk.cyan('[DEBUG]'));
        stderr.apply(this, args);
    }
}