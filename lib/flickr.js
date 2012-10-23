"use strict";
var inherits = require('util').inherits;
var request = require('request');
var url = require('url');
var OAuth1 = require('./core/oauth1a');
var errors = require('./core/errors');
var async = require('async');

var NoError = errors.NoError;
var NoConnectionError = errors.NoConnectionError;

var Flickr = function (opt_appInfo, opt_redirectUrl) {
	OAuth1.call(this, opt_appInfo, opt_redirectUrl);
};

inherits(Flickr, OAuth1);

Flickr.prototype.defaultScope = 'read';

Flickr.prototype.addScope = function (callbackUrl, options) {
	return callbackUrl + '&perms=' + (options.scope ? options.scope : this.defaultScope);
};

Flickr.prototype.availableFields = ['id', 'name', 'username', 'location', 'bio', 'picture'];

Flickr.prototype.providerInfo = {
	requestUrl: 'http://www.flickr.com/services/oauth/request_token',
	authUrl: 'http://www.flickr.com/services/oauth/authorize',
	accessUrl: 'http://www.flickr.com/services/oauth/access_token'
};

Flickr.prototype.parseBody = function (body) {
	return this.parseUrlEncodedBody(body);
};

Flickr.prototype.renameRule = {
	id: 'person.id',
	username: 'person.username._content',
	name: 'person.realname._content',
	location: 'person.location._content',
	bio: 'person.description._content'
};

Flickr.prototype.checkRequestUrlError = function (body, cb) {
	if(body.oauth_problem) {
		cb(new NoError('ProviderError', body.oauth_problem, body));
	}
	else {
		cb(null, body);
	}
};

Flickr.prototype.parseError = function (body, cb) {
	if (body.stat === 'fail') {
		cb(new NoError('ProviderTechnicalError', body.message, body));
	}
	else {
		cb(null, body);
	}
};

Flickr.prototype.constructResult = function (authInfo, options, cb) {
	var self = this;
	var savedFields;

	async.waterfall([
		function (cb) {
			self.genFields(options, cb);
		},
		function (fields, cb) {
			var usrUrl = 'http://api.flickr.com/services/rest/';
			var picUrl = 'http://farm{icon-farm}.staticflickr.com/{icon-server}/buddyicons/{nsid}.jpg';

			var params = {
				method: 'flickr.people.getInfo',
				format: 'json',
				nojsoncallback: 1,
				api_key: self.appInfo.id,
				user_id: authInfo.user_nsid
			};

			savedFields = fields;

			request({
				url: url.resolve(usrUrl, url.format({query: params})),
				method: 'GET',
				headers: {Authorization: self.generateAuthorizationHeader('GET', usrUrl, params, authInfo.oauth_token, authInfo.oauth_token_secret)}
			}, function (err, res, body) {
				if (err) {
					cb(new NoConnectionError(err, res));
				}
				self.parseError(self.parseJsonBody(body), function (err, body) {
					cb(err, savedFields, body);
				});
			});
		},
		function (fields, body, cb) {
			if (fields.indexOf('picture' !== -1)) {
				var picReplace = {
					'icon-farm': body.person.iconfarm,
					'icon-server': body.person.iconserver,
					'nsid': body.person.nsid
				};
				var picUrl = 'http://farm{icon-farm}.staticflickr.com/{icon-server}/buddyicons/{nsid}.jpg';
				body.picture = picUrl.replace(/\{([\w\-]+)\}/g, function (match, expr) {
					return picReplace[expr];
				});
			}
			cb(null, {
				auth: {
					token: authInfo.oauth_token,
					secret: authInfo.oauth_token_secret
				},
				data: self.removeWasteFields(body, self.renameRule, fields)
			});
		}
	], cb);
};


module.exports = Flickr;
