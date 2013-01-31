"use strict";
var url = require('url');
var inherits = require('util').inherits;
var request = require('request');
var Auth = require('./auth');
var async = require('async');

var OAuth2 = function (opt_appInfo, opt_redirectUrl) {
	Auth.call(this, opt_appInfo, opt_redirectUrl);
};

inherits(OAuth2, Auth);

OAuth2.prototype.scopeGen = function (scope) {
	return scope.join(',');
};

OAuth2.prototype.tokenName = 'access_token';

OAuth2.prototype.createAuthRequestUrl = function (options, cb) {
	var params = {
		response_type: 'code',
		client_id: this.appInfo.id,
		redirect_uri: this.redirectUrl,
	};

	if (options) {
		for (var key in options) {
			params[key] = options[key];
		}
	}

	if (params.scope || this.defaultScope) {
		params.scope = this.scopeGen(params.scope ? params.scope : this.defaultScope);
	}
	cb(null, url.resolve(this.providerInfo.authUrl, url.format({ query: params })));
};

OAuth2.prototype.exchangeAuthGrant = function (resultInfo, options, cb) {
	if (resultInfo.constructor === String) {
		resultInfo = this.parseResultUrl(resultInfo);
	}

	var self = this;

	async.waterfall([
		function (cb) {
			self.parseRedirectError(resultInfo, cb);
		},
		function (resultInfo, cb) {
			var params = {
				code: resultInfo.code,
				client_id: self.appInfo.id,
				client_secret: self.appInfo.secret,
				redirect_uri: self.redirectUrl,
				grant_type: 'authorization_code'
			};

			request({
				url: self.providerInfo.tokenUrl,
				method: 'POST',
				headers: {'Content-Type': 'application/x-www-form-urlencoded'},
				body: Object.keys(params).map(function (key) {
					return key + '=' + params[key];
				}).join('&')
			}, self.createErrorHandler(cb));
		},
		function (parsedBody, cb) {
			self.constructResult(parsedBody, options, cb);
		}
	], cb);
};

/*
	options: {
		method: {default: 'GET', optional: true},
		slug: {optional: true},
		base: {optional: true},
		params: {optional: true},
		token: {optional: true},
		headers: {optional: true},
		body: {optional: true}
	}
*/
OAuth2.prototype.makeApiRequest = function (options, cb) {
	if (options.token) {
		if (!options.params) {
			options.params = {};
		}
		options.params[this.tokenName] = options.token;
	}

	request({
		method: options.method || 'GET',
		headers: options.headers,
		body: options.body,
		url: url.resolve((options.base || this.providerInfo.apiUrl) + (options.slug || ''), url.format({ query: options.params }))
	}, this.createErrorHandler(cb));
};


module.exports = OAuth2;
