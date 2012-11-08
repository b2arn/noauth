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
	console.log(options);
	console.log(params);
	console.log(url.format({query: params}));
	console.log(url.resolve(this.providerInfo.authUrl, url.format({query: params})));
	cb(null, url.resolve(this.providerInfo.authUrl, url.format({query: params})));
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


module.exports = OAuth2;
