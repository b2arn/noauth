"use strict";
var crypto = require('crypto');
var url = require('url');
var request = require('request');
var Auth = require('./auth');
var inherits = require('util').inherits;
var async = require('async');
var NoError = require('./errors').NoError;

function sha1 (key, body) {
	return crypto.createHmac('sha1', key).update(body).digest('base64');
}

function rfc3986 (str) {
	return encodeURIComponent(str)
		.replace(/!/g,'%21')
		.replace(/\*/g,'%2A')
		.replace(/\(/g,'%28')
		.replace(/\)/g,'%29')
		.replace(/'/g,'%27');
}

function createRedirectUrl (base, token, redirectUrl) {
	var args = {
		oauth_token: token,
		oauth_callback: redirectUrl
	};

	return url.resolve(base, url.format({query: args}));
}

var OAuth1 = function (opt_appInfo, opt_redirectUrl) {
	Auth.call(this, opt_appInfo, opt_redirectUrl);
};

inherits(OAuth1, Auth);

OAuth1.prototype.needStorage = true;

OAuth1.prototype.setStorage = function (storage) {
	this.storage = storage;
};

OAuth1.prototype.addScope = function (callbackUrl, options) {
	return callbackUrl;
};

OAuth1.prototype.checkRequestUrlError = function (body, cb) {
	if(body.oauth_callback_confirmed === false) {
		cb(new NoError('ProviderTechnicalError', 'OAuth is not confirmed', body));
	}
	else {
		cb(null, body);
	}
};

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

	var encodedParams = Object.keys(params).sort().map(function (i) {
		return rfc3986(i) + '=' + rfc3986(params[i]);
	}).join('&');

	var signatureBaseString = [
		method,
		rfc3986(url),
		rfc3986(encodedParams)
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
			}, cb);
		},
		function (res, body, cb) {
			self.checkRequestUrlError(self.parseBody(body), cb);
		},
		function (body, cb) {
			savedBody = body;
			self.storage.put(body.oauth_token, body.oauth_token_secret, cb);
		},
		function (cb) {
			var callbackUrl = createRedirectUrl(self.providerInfo.authUrl, savedBody.oauth_token, redirectUrl);
			cb(null, self.addScope(callbackUrl, options));
		}
	], cb);


};

OAuth1.prototype.exchangeAuthGrant = function (resultInfo, options, cb) {
	if (typeof resultInfo === 'string') {
		resultInfo = this.parseResultUrl(resultInfo);
	}

	var params = {
		oauth_verifier: resultInfo.verifier
	};

	var self = this;

	this.storage.get(resultInfo.token, function (err, result) {
		if (err) {
			cb(err);
		}
		else {
			var authHeader = self.generateAuthorizationHeader('POST', self.providerInfo.accessUrl, params, resultInfo.token, result);

			request({
				url: self.providerInfo.accessUrl,
				body: null,
				headers: {Authorization: authHeader},
				method: 'POST'
			}, function (err, res, body) {
				self.handleAuthResponse(err, res, body, options, cb);
			});
		}
	});
};

OAuth1.prototype.parseResultUrl = function (uri) {
	var parsedUri = url.parse(uri, true);
	return {
		state: parsedUri.query.state,
		token: parsedUri.query.oauth_token,
		verifier: parsedUri.query.oauth_verifier
	};
};


module.exports = OAuth1;
