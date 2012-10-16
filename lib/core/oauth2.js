"use strict";
var url = require('url');
var inherits = require('util').inherits;
var request = require('request');
var Auth = require('./auth');


var OAuth2 = function (opt_appInfo, opt_redirectUrl) {
	Auth.call(this, opt_appInfo, opt_redirectUrl);
};

inherits(OAuth2, Auth);

OAuth2.prototype.defaultScope = null;

OAuth2.prototype.scopeGen = function (scope) {
	throw new Error('usage of non implemented method');
};

OAuth2.prototype.createAuthRequestUrl = function (options, cb) {
	var params = {
		response_type: 'code',
		client_id: this.appInfo.id,
		redirect_uri: this.redirectUrl,
	};

	var scope;

	if (options) {
		for (var key in options) {
			params[key] = options[key];
		}
		if (key === 'scope') {
			scope = options[key];
		}
	}

	if (scope || this.defaultScope) {
		params.scope = this.scopeGen(scope ? scope : this.defaultScope);
	}

	cb(null, url.resolve(this.providerInfo.authUrl, url.format({query: params})));
};

OAuth2.prototype.exchangeAuthGrant = function (resultInfo, options, cb) {
	if (typeof resultInfo === 'string') {
		resultInfo = this.parseResultUrl(resultInfo);
	}

	var params = {
		code: resultInfo.code,
		client_id: this.appInfo.id,
		client_secret: this.appInfo.secret,
		redirect_uri: this.redirectUrl,
		grant_type: 'authorization_code'
	};

	var self = this;

	request({
		url: this.providerInfo.tokenUrl,
		method: 'POST',
		headers: {'Content-Type': 'application/x-www-form-urlencoded'},
		body: Object.keys(params).map(function (key) {
			return key + '=' + params[key];
		}).join('&')
	}, function (err, response, body) {
		self.handleAuthResponse(err, response, body, options, cb);
	});
};

OAuth2.prototype.parseResultUrl = function (uri) {
	return url.parse(uri, true).query;
};


module.exports = OAuth2;
