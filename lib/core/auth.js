"use strict";
var url = require('url');
var NoError = require('./error');
var async = require('async');

var Auth = function (opt_appInfo, opt_redirectUrl) {
	this.appInfo = opt_appInfo;
	this.redirectUrl = opt_redirectUrl;
};

Auth.prototype.needStorage = false;

Auth.prototype.createAuthRequestUrl = function (options, callback) {
	throw new Error('usage of non implemented method');
};

Auth.prototype.exchangeAuthGrant = function (resultInfo, options, callback) {
	throw new Error('usage of non implemented method');
};

Auth.prototype.parseResultUrl = function (url) {
	throw new Error('usage of non implemented method');
};

Auth.prototype.setInfo = function (appInfo, redirectUrl) {
	this.appInfo = appInfo;
	this.redirectUrl = redirectUrl;
};

Auth.prototype.parseBody = function (body) {
	throw new Error('usage of non implemented method');
};

Auth.prototype.parseJsonBody = function (body) {
	return JSON.parse(body);
};

Auth.prototype.parseUrlEncodedBody = function (body) {
	return url.parse('?' + body, true).query;
};

Auth.prototype.parseError = function (body, callback) {
	throw new Error('usage of non implemented method');
};

Auth.prototype.constructResult = function (body, options, callback) {
	callback(null, this.parseBody(body));
};

Auth.prototype.handleAuthResponse = function (err, res, body, options, cb) {
	var self = this;
	async.waterfall([
		function (cb) {
			if (err) {
				console.log(new NoError('network', null, err.message, err));
				cb(new NoError('network', null, err.message, err));
			}
			else {
				var parsedBody = self.parseBody(body);
				self.parseError(parsedBody, cb);
			}
		},
		function (result, cb) {
			self.constructResult(result, options, cb);
		}
	], cb);
};

module.exports = Auth;
