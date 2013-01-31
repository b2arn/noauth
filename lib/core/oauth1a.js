"use strict";
var crypto = require('crypto');
var url = require('url');
var request = require('request');
var Auth = require('./auth');
var inherits = require('util').inherits;
var async = require('async');
var NoError = require('noerror').NoError;


var OAuth1 = function (opt_appInfo, opt_redirectUrl) {
	Auth.call(this, opt_appInfo, opt_redirectUrl);
	/*var self = this;
	this.boundCheckRequestUrlError = function (body) {
		self.checkRequestUrlError(body);
	};*/
};

inherits(OAuth1, Auth);

OAuth1.prototype.encodeRFC3986  = function (str) {
	return encodeURIComponent(str)
		.replace(/!/g,'%21')
		.replace(/\*/g,'%2A')
		.replace(/\(/g,'%28')
		.replace(/\)/g,'%29')
		.replace(/'/g,'%27');
};

OAuth1.prototype.createRedirectUrl = function (base, token, redirectUrl) {
	var args = {
		oauth_token: token,
		oauth_callback: redirectUrl
	};

	return url.resolve(base, url.format({query: args}));
};

OAuth1.prototype.needStorage = true;

OAuth1.prototype.setStorage = function (storage) {
	this.storage = storage;
};

OAuth1.prototype.addScope = function (uri, options) {
	return uri;
};

/*OAuth1.prototype.checkRequestUrlError = function (body) {
	var parsedBody = this.parseUrlEncodedBody(body);
	if(parsedBody.oauth_callback_confirmed === false) {
		throw new NoError('ProviderTechnicalError', 'OAuth is not confirmed', parsedBody);
	}
	else {
		return body;
	}
};*/

OAuth1.prototype.generateAuthorizationHeader = function (method, url, additionalParams, token, secret) {
	var appInfo = this.appInfo;
	var params = {
		oauth_consumer_key: appInfo.id,
		oauth_signature_method: 'HMAC-SHA1',
		oauth_timestamp: Math.floor(Date.now() / 1000),
		oauth_nonce: crypto.randomBytes(32).toString('base64').replace(/[^0-9a-zA-Z]/g, ''),
		oauth_version: '1.0'
	};

	if (token) {
		params.oauth_token = token;
	}

	for (var key in additionalParams) {
		params[key] = additionalParams[key];
	}

	var self = this;

	var encodedParams = Object.keys(params).sort().map(function (i) {
		return self.encodeRFC3986(i) + '=' + self.encodeRFC3986(params[i]);
	}).join('&');

	var signatureBaseString = [
		method,
		this.encodeRFC3986(url),
		this.encodeRFC3986(encodedParams)
	].join('&');

	var signingKey = [appInfo.secret, secret ? secret : ''].join('&');

	params.oauth_signature = crypto.createHmac('sha1', signingKey).update(signatureBaseString).digest('base64');

	return 'OAuth ' + Object.keys(params).sort().map(function (j) {
		return j + '=\"' + encodeURIComponent(params[j]) + '\"';
	}).join(',');

};

OAuth1.prototype.createAuthRequestUrl = function (options, cb) {
	var redirectUrl = (options && 'state' in options ? url.resolve(this.redirectUrl, url.format({query: {state: options.state}})) : this.redirectUrl);

	var params = {
		oauth_callback: redirectUrl
	};

	var authHeader = this.generateAuthorizationHeader('POST', this.providerInfo.requestUrl, params);
	var self = this;
	var savedBody;

	async.waterfall([
		function (cb) {
			request({
				url: self.providerInfo.requestUrl,
				body: null,
				headers: {Authorization: authHeader},
				method: 'POST'
			}, self.createErrorHandler(cb));
		},
		function (parsedBody, cb) {
			savedBody = parsedBody;
			self.storage.put(savedBody.oauth_token, savedBody.oauth_token_secret, cb);
		},
		function (cb) {
			var callbackUrl = self.createRedirectUrl(self.providerInfo.authUrl, savedBody.oauth_token, redirectUrl);
			cb(null, self.addScope(callbackUrl, options));
		}
	], cb);


};

OAuth1.prototype.exchangeAuthGrant = function (resultInfo, options, cb) {
	if (resultInfo.constructor === String) {
		resultInfo = this.parseResultUrl(resultInfo);
	}

	var params = {
		oauth_verifier: resultInfo.oauth_verifier,
	};

	var self = this;

	async.waterfall([
		function (cb) {
			self.parseRedirectError(resultInfo, cb);
		},
		function (query, cb) {
			resultInfo = query;
			self.storage.get(resultInfo.oauth_token, cb);
		},
		function (result, cb) {
			var authHeader = self.generateAuthorizationHeader('POST', self.providerInfo.accessUrl, params, resultInfo.oauth_token, result);

			request({
				url: self.providerInfo.accessUrl,
				body: null,
				headers: {Authorization: authHeader},
				method: 'POST'
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
		token || oauth_token: {optional: false},
		secret || oauth_token_secret: {optional: false},
		body: {optional: true},
		headers: {optional: true}
	}
*/
OAuth1.prototype.makeApiRequest = function (options, cb) {
	var requestUrl = (options.base || this.providerInfo.apiUrl) + options.slug;
	var method = options.method || 'GET';

	if (!options.headers) {
		options.headers = {};
	}
	options.headers.Authorization = this.generateAuthorizationHeader(method, requestUrl, options.params, options.token, options.secret);

	request({
		method: method,
		url: url.resolve(requestUrl, url.format({ query: options.params })),
		body: options.body,
		headers: options.headers,
	}, this.createErrorHandler(cb));
};


module.exports = OAuth1;
