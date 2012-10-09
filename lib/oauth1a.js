"use strict";
var crypto = require('crypto');
var url = require('url');
var request = require('request');
var urlSafeBase64 = require('authen').tools.urlSafeBase64;
var async = require('async');
var Auth = require('./auth');
var inherits = require('util').inherits;


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

OAuth1.prototype.extendsRedirectUrl = true;

OAuth1.prototype.generateAuthorizationHeader = function (url, additionalParams, token, secret) {
	var appInfo = this.appInfo;
	var params = {
		oauth_consumer_key: appInfo.id,
		oauth_signature_method: 'HMAC-SHA1',
		oauth_timestamp: Math.floor(Date.now() / 1000),
		oauth_nonce: urlSafeBase64.encode(crypto.randomBytes(32)).replace(/[^0-9a-zA-Z]/g, ''),
		oauth_version: '1.0'
	};

	if(token) {
		params.oauth_token = token;
	}

	for (var key in additionalParams) {
		params[key] = additionalParams[key];
	}

	var encodedParams = Object.keys(params).sort().map(function (i) {
		return rfc3986(i) + '=' + rfc3986(params[i]);
	}).join('&');

	var signatureBaseString = [
		'POST',
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
	var redirectUrl = this.redirectUrl + (options && options.state ? ('/' + encodeURIComponent(JSON.stringify(options.state))) : '');
	var params = {
		oauth_callback: redirectUrl
	};

	var authHeader = this.generateAuthorizationHeader(this.providerInfo.requestUrl, params);
	var self = this;

	request({
		url: this.providerInfo.requestUrl,
		body: null,
		headers: {Authorization: authHeader},
		method: 'POST'
	}, function (err, res, body) {
		if (err) {
			cb(err);
		} else {
			var result = self.parseBody(body);
			if(result.oauth_callback_confirmed === false) {
				cb(new Error('OAuth is not confirmed'));
			}
			cb(null, createRedirectUrl(self.providerInfo.authUrl, result.oauth_token, redirectUrl));
		}
	});
};

OAuth1.prototype.exchangeAuthGrant = function (resultInfo, options, cb) {
	var result;
	if (typeof resultInfo === 'string') {
		result = this.parseResultUrl(resultInfo);
	}
	else {
		result = resultInfo;
	}

	var params = {
		oauth_verifier: result.verifier
	};

	var authHeader = this.generateAuthorizationHeader(this.providerInfo.accessUrl, params, result.token);
	var self = this;

	request({
		url: this.providerInfo.accessUrl,
		body: null,
		headers: {Authorization: authHeader},
		method: 'POST'
	}, function (err, res, body) {
		cb(err, self.parseBody(body));
	});
};

OAuth1.prototype.parseResultUrl = function (uri) {
	console.log('uri', uri);
	var uriPath = url.parse(uri).path;
	console.log('uriPath', uriPath);
	var redirectPath = url.parse(this.redirectUrl).pathname;
	console.log('redirectPath', redirectPath);
	var cropedUri = uriPath.substring(redirectPath.length, uriPath.length);
	console.log('cropedUri', cropedUri);
	var result = {};
	var parsedUri = url.parse(cropedUri, true);
	console.log('parsedUri', parsedUri);
	var path = parsedUri.pathname;
	console.log('path', path);
	result.state = path ? JSON.parse(decodeURIComponent(path.split('/').pop())) : null;
	result.token = parsedUri.query.oauth_token;
	result.verifier = parsedUri.query.oauth_verifier;
	return result;
};

OAuth1.prototype.parseError = function () {
	throw new Error('usage of non implemented method');
};


module.exports = OAuth1;
