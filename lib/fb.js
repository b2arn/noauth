"use strict";
var OAuth = require('./core/oauth2');
var request = require('request');
var url = require('url');
var inherits = require('util').inherits;
var errors = require('noerror');
var async = require('async');


var NoError = errors.NoError;
var NoUserDeniedError = errors.NoUserDeniedError;

var Fb = function (opt_appInfo, opt_redirectUrl) {
	OAuth.call(this, opt_appInfo, opt_redirectUrl);
};

inherits(Fb, OAuth);

Fb.prototype.providerInfo = {
	authUrl: 'https://www.facebook.com/dialog/oauth',
	tokenUrl: 'https://graph.facebook.com/oauth/access_token',
	apiUrl: 'https://graph.facebook.com'
};

Fb.prototype.parseError = function (statusCode, parsedBody) {
	if ('error' in parsedBody) {
		return new NoError('ProviderError', 'Error with statusCode = ' + statusCode + ' and message ' + parsedBody.error.message, {statusCode: statusCode,
			body: parsedBody.error});
	}
};

Fb.prototype.parseRedirectError = function (query, cb) {
	var err;
	if ('error' in query) {
		if (query.error_reason === 'user_denied') {
			err = new NoUserDeniedError();
		}
		else {
			err = new NoError('ProviderError', 'Error "' + query.error.replace('_', ' ') + '" reason: "' + query.error_reason.replace('_', ' ') +
				'" description "' + query.error_description.replace('+', ' ') + '"', query);
		}
	}
	cb(err, query);
};

Fb.prototype.renameRule = {
	location: 'location.name',
	picture: 'picture.data.url',
	site: 'website',
	lastName: 'last_name',
	firstName: 'first_name'
};

Fb.prototype.constructResult = function (authInfo, options, cb) {
	var nameRule = {
		picture: 'picture.width(700)',
		site: 'website',
		lastName: 'last_name',
		firstName: 'first_name'
	};

	var self = this;
	var savedFields;

	async.waterfall([
		function (cb) {
			self.genFields(options, cb);
		},
		function (fields, cb) {
			var xFields = [];
			for (var i = 0; i < fields.length; i++) {
				if (fields[i] !== 'profileUrl'){
					xFields.push(fields[i]);
				}
			}

			if (fields.indexOf('profileUrl') !== -1) {
				if (fields.indexOf('username') === -1) {
					xFields.push('username');
				}

				if (fields.indexOf('id') === -1) {
					xFields.push('id');
				}
			}

			savedFields = fields;
			/*request({
				method: 'GET',
				url: url.resolve('https://graph.facebook.com/me', url.format({
					query: {
						access_token: authInfo.access_token,
						fields: xFields.map(function (el) {
							return el in nameRule ? nameRule[el] : el;
						}).join(',')
				}}))}, self.createErrorHandler(cb));*/
			self.makeApiRequest('GET', '/me', {
				access_token: authInfo.access_token,
				fields: xFields.map(function (el) {
					return el in nameRule ? nameRule[el] : el;
				}).join(',')
			}, cb);
		},
		function (parsedBody, cb) {
			if (savedFields.indexOf('profileUrl') !== -1) {
				parsedBody.profileUrl = 'https://www.facebook.com/' + (parsedBody.username ? parsedBody.username : parsedBody.id);
			}
			var data = self.removeWasteFields(parsedBody, self.renameRule, savedFields);
			if (data.birthday) {
				var bd = data.birthday.split('/');
				data.birthday = [bd[2],  bd[0], bd[1]].join('-');
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
