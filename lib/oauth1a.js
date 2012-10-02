"use strict";
var crypto = require('crypto');
var url = require('url');
var request = require('request');
var urlSafeBase64 = require('authen').tools.urlSafeBase64;
var async = require('async');


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

var OAuth = function () {};

OAuth.prototype.generateAuthorizationHeader = function (url, method, additionalParams, row) {
	var params = {
		oauth_consumer_key: row.oauth_consumer_key,
		oauth_signature_method: 'HMAC-SHA1',
		oauth_timestamp: Math.floor(Date.now() / 1000),
		oauth_nonce: urlSafeBase64.encode(crypto.randomBytes(32)).replace(/[^0-9a-zA-Z]/g, ''),
		oauth_version: '1.0'
	};

	if(row.oauth_token) {
		params.oauth_token = row.oauth_token;
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

	var signingKey = [row.oauth_consumer_secret, row.oauth_token_secret ? row.oauth_token_secret : ''].join('&');

	params.oauth_signature = crypto.createHmac('sha1', signingKey).update(signatureBaseString).digest('base64');

	return 'OAuth ' + Object.keys(params).sort().map(function (j) {
		return j + '=\"' + encodeURIComponent(params[j]) + '\"';
	}).join(',');

};

OAuth.prototype.redirect = function (res, callbackUrl, storage, i, cb) {
	var method = 'POST';

	var params = {
		oauth_callback: callbackUrl
	};

	var self = this;

	async.waterfall([
		function (cb) {
			storage.getRow(i, cb);
		},
		function (row, cb) {
			var authHeader = self.generateAuthorizationHeader(row.requestUrl, method, params, row);
			request({
				url: row.requestUrl,
				body: null,
				headers: {Authorization: authHeader},
				method: method
			}, function (err, res, body) {
				cb(err, url.parse('?' + body, true).query);
			});
		},
		function (result, cb) {
			if(result.oauth_callback_confirmed === false) {
				cb(new Error('OAuth is not confirmed'));
			}
			storage.updateRow(i, {
				oauth_token: result.oauth_token,
				oauth_token_secret: result.oauth_token_secret
			}, cb);
		}
	],
	function (err, row) {
		if (!err) {
			res.redirect(self.createRedirectUri(row.authenUrl, row.oauth_token, callbackUrl));
		}
		cb(err, null);
	});
};

OAuth.prototype.callback = function (req, storage, cb) {
	var method = 'POST';

	var self = this;
	var str = req.path.split('/');
	var i = parseInt(str[str.length - 1], 10);

	async.waterfall([
		function (cb) {
			storage.updateRow(i, {
				oauth_token: req.query.oauth_token
			}, cb);
		},
		function (row, cb) {
			var params = {
				oauth_verifier: req.query.oauth_verifier
			};
			var authHeader = self.generateAuthorizationHeader(row.accessUrl, method, params, row);
			request({
				url: row.accessUrl,
				body: null,
				headers: {Authorization: authHeader},
				method: method
			}, function (err, res, body) {
				cb(err, url.parse('?' + body, true).query);
			});
		},
		function (result, cb) {
			storage.updateRow(i, {
				oauth_token: result.oauth_token,
				oauth_token_secret: result.oauth_token_secret,
			}, function (err, val) {
				cb(err, result);
			});
		}
	],
	function (err, result){
		cb(err, result);
	});
};

OAuth.prototype.createRedirectUri = function (base, token, callbackUrl) {
	var args = {
		oauth_token: token,
		oauth_callback: callbackUrl
	};
	return url.resolve(base, url.format({query: args}));
};


module.exports = OAuth;
