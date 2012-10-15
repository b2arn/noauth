"use strict";
var OAuth = require('./core/oauth2');
var request = require('request');
var url = require('url');
var inherits = require('util').inherits;


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


Fb.prototype.constructResult = function (body, options, cb) {
	var authInfo = this.parseUrlEncodedBody(body);

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
		var found = false;
		for (var i = 0; i < options.fields.length; i++) {
			var key = options.fields[i];
			if (dict[key]) {
				fields[key] = dict[key];
				found = true;
			}
		}

		if (!found) {
			cb(new Error('There are no available fields for [' + options.fields + '], available are [' + Object.keys(dict) + ']'));
			return;
		}
	}
	else {
		fields = dict;
	}

	request({
		method: 'GET',
		url: url.resolve('https://graph.facebook.com/me', url.format({
			query: {
				access_token: authInfo.access_token,
				fields: Object.keys(fields).map(function (i) {
					return fields[i];
				}).join(',')
		}}))}, function (err, res, body) {
			if (err) {
				cb(err);
			}
			else {
				var parsedBody = JSON.parse(body);
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
		}
	);
};

module.exports = Fb;

