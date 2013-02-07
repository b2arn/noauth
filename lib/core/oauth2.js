"use strict";
var url = require('url');
var inherits = require('util').inherits;
var request = require('./utils').request;
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

OAuth2.prototype.exchangeAuthGrant = function (query, options, cb) {
	if (query.constructor === String) {
		query = this.parseResultUrl(query);
	}

	var self = this;
	var hasError = false;

	try {
		self.parseRedirectError(query);
	}
	catch (err) {
		hasError = true;
		cb(err);
	}

	if (!hasError) {
		async.waterfall([
			function (cb) {
				var params = {
					code: query.code,
					client_id: self.appInfo.id,
					client_secret: self.appInfo.secret,
					redirect_uri: self.redirectUrl,
					grant_type: 'authorization_code'
				};

				self.makeApiRequest({
					method: 'POST',
					base: self.providerInfo.tokenUrl,
					body: Object.keys(params).map(function (key) {
							return key + '=' + params[key];
						}).join('&'),
					headers: {'Content-Type': 'application/x-www-form-urlencoded'}
				}, cb);
			},
			function (parsedBody, cb) {
				self.constructResult(parsedBody, options, cb);
			}
		], cb);
	}
};

/*
	options: {
		method: {default: 'GET', optional: true},
		path: {optional: true},
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
		url: url.resolve((options.base || this.providerInfo.apiUrl) + (options.path || ''), url.format({ query: options.params }))
	}, this.createErrorHandler(cb));
};


module.exports = OAuth2;
