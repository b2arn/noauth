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
		cb(new NoError('badInput', body.error.type, body.error.message, body.error));
	}
	else {
		cb(null, body);
	}
};

Fb.prototype.renameRule = {
	location: 'location.name',
	picture: 'picture.data.url',
	site: 'website'
};

Fb.prototype.constructResult = function (authInfo, options, cb) {
	var nameRule = {
		picture: 'picture.width(700)',
		site: 'website'
	};

	var self = this;

	async.waterfall([
		function (cb) {
			self.genFields(options, cb);
		},
		function (fields, cb) {
			request({
				method: 'GET',
				url: url.resolve('https://graph.facebook.com/me', url.format({
					query: {
						access_token: authInfo.access_token,
						fields: fields.map(function (el) {
							return el in nameRule ? nameRule[el] : el;
						}).join(',')
				}}))}, function (err, res, body) {
					if (err) {
						cb(new NoError('network', null, err.messege, err));
					}
					else {
						self.parseError(self.parseJsonBody(body), function (err, body) {
							cb(err, {fields: fields, body: body});
						});
					}
				}
			);
		},
		function (result, cb) {
			var data = self.removeWasteFields(result.body, self.renameRule, result.fields);
			if (data.birthday) {
				var bd = data.birthday.split('/');
				data.birthday = [bd[1], bd[0], bd[2]].join('-');
			}
			cb(null, {
				auth: {
					token: authInfo.access_token,
					expires: parseInt(authInfo.expires, 10)
				},
				data: data
			});
		}
	], cb);
};


module.exports = Fb;
