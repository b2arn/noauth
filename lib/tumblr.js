"use strict";
var inherits = require('util').inherits;
var  OAuth1 = require('./core/oauth1a');
var errors = require('./core/errors');
var async = require('async');


var NoError = errors.NoError;

var Tumblr = function (opt_appInfo, opt_redirectUrl) {
	OAuth1.call(this, opt_appInfo, opt_redirectUrl);
};

inherits(Tumblr, OAuth1);

Tumblr.prototype.providerInfo = {
	requestUrl: 'http://www.tumblr.com/oauth/request_token',
	authUrl: 'http://www.tumblr.com/oauth/authorize',
	accessUrl: 'http://www.tumblr.com/oauth/access_token',
	apiUrl: 'http://api.tumblr.com/v2'
};

Tumblr.prototype.availableFields = ['id', 'profileUrl', 'name', 'username'];

Tumblr.prototype.parseError = function (statusCode, parsedBody) {
	if (parsedBody === 'Missing or invalid request token.') {
		return new NoError('ProviderError', 'Error with statusCode = ' + statusCode + ' and message: ' + parsedBody);
	}
	if ('meta' in parsedBody && parsedBody.meta.status >= 400) {
		return new NoError('ProviderError', 'Error with statusCode = ' + parsedBody.meta.status + ' and message: ' + parsedBody.meta.msg, parsedBody);
	}
};

Tumblr.prototype.renameRule = {
	id: 'response.user.name',
	name: 'response.user.name'
};

Tumblr.prototype.constructResult = function (authInfo, options, cb) {
	var self = this;
	var fields;
	async.waterfall([
		function (cb) {
			var hasError = false;
			try {
				fields = self.genFields(options);
			}
			catch (err) {
				hasError = true;
				cb(err);
			}

			if (!hasError) {
				self.makeApiRequest({
					path: '/user/info',
					token: authInfo.oauth_token,
					secret: authInfo.oauth_token_secret
				}, cb);
			}
		},
		function (res, parsedBody, cb) {
			parsedBody.profileUrl = 'http://' + parsedBody.response.user.name + '.tumblr.com';
			for (var i = 0; i < parsedBody.response.user.blogs.length; i++) {
				var blog = parsedBody.response.user.blogs[i];
				if (blog.primary) {
					parsedBody.username = blog.title;
				}
			}
			cb(null, {
				auth: {
					token: authInfo.oauth_token,
					secret: authInfo.oauth_token_secret
				},
				data: self.removeWasteFields(parsedBody, self.renameRule, fields)
			});
		}
	], cb);
};


module.exports = Tumblr;
