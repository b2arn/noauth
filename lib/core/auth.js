"use strict";
var url = require('url');


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

Auth.prototype.parseError = function () {
	throw new Error('usage of non implemented method');
};


module.exports = Auth;
