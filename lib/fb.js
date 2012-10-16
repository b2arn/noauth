"use strict";
var OAuth = require('./core/oauth2');
var request = require('request');
var url = require('url');
var inherits = require('util').inherits;
var NoError = require('./core/error');
var async = require('async');


var Fb = function (opt_appInfo, opt_redirectUrl) {
	OAuth.call(this, opt_appInfo, opt_redirectUrl);
};

inherits(Fb, OAuth);

Fb.prototype.scopeGen = function (scope) {
	return scope.join(',');
};

Fb.prototype.providerInfo = {
	authUrl: 'https://www.facebook.com/dialog/oauth',
	tokenUrl: 'https://graph.facebook.com/oauth/access_token'
};

Fb.prototype.parseBody = function (body) {
	return this.parseUrlEncodedBody(body);
};

Fb.prototype.parseError = function (body, cb) {
	if ('error' in body) {
		console.log(new NoError('badInput', body.error.type, body.error.message, body.error));
		cb(new NoError('badInput', body.error.type, body.error.message, body.error));
	}
	else {
		cb(null, body);
	}
};

Fb.prototype.constructResult = function (body, options, cb) {
	var authInfo = body;

	var dict = {
		id: 'id',
		name: 'name',
		email: 'email',
		gender: 'gender',
		birthday: 'birthday',
		photo: 'picture.width(700)',
		bio: 'bio',
		website: 'website',
		location: 'location',
		locale: 'locale',
		username: 'username'
	};

	var fields = {};

	if (options && options.fields) {
		for (var i = 0; i < options.fields.length; i++) {
			var key = options.fields[i];
			if (dict[key]) {
				fields[key] = dict[key];
			}
			else {
				cb(new Error('Unknown field ' + key));
				return;
			}
		}
	}
	else {
		fields = dict;
	}

	var self = this;

	request({
		method: 'GET',
		url: url.resolve('https://graph.facebook.com/me', url.format({
			query: {
				access_token: authInfo.access_token,
				fields: Object.keys(fields).map(function (i) {
					return fields[i];
				}).join(',')
		}}))}, function (err, res, body) {
			async.waterfall([
				function (cb) {
					if (err) {
						console.log(new NoError('network', null, err.messege, err));
						cb(new NoError('network', null, err.messege, err));
					}
					else {
						var parsedBody = self.parseJsonBody(body);
						self.parseError(parsedBody, cb);
					}
				},
				function (parsedBody, cb) {
					var data = {};
					for (var key in parsedBody) {
						if (key === 'location') {
							data.location = parsedBody.location.name;
							continue;
						}

						if (key === 'picture' && parsedBody[key].data) {
							data.photo = parsedBody[key].data.url;
							continue;
						}

						if (key === 'website') {
							data.site = parsedBody[key];
							continue;
						}

						data[key] = parsedBody[key];
					}
					cb(null, {
						auth: {
							token: authInfo.access_token,
							expires: authInfo.expires
						},
						data: data
					});
				}
			], cb);
		}
	);
};

module.exports = Fb;

