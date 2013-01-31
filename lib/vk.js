"use strict";
var OAuth = require('./core/oauth2');
var async = require('async');
var inherits = require('util').inherits;
var errors = require('noerror');


var NoError = errors.NoError;
var NoUserDeniedError = errors.NoUserDeniedError;

var Vk = function (opt_appInfo, opt_redirectUrl) {
	OAuth.call(this, opt_appInfo, opt_redirectUrl);
};

inherits(Vk, OAuth);

Vk.prototype.availableFields = ['id', 'name', 'gender', 'birthday', 'location', 'picture', 'username', 'profileUrl'];

Vk.prototype.providerInfo = {
	authUrl: 'http://api.vkontakte.ru/oauth/authorize',
	tokenUrl: 'https://api.vkontakte.ru/oauth/access_token',
	apiUrl: 'https://api.vk.com/method'
};

Vk.prototype.renameRule = {
	picture: 'photo_big',
	username: 'nickname'
};

Vk.prototype.parseRedirectError = function (query, cb) {
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

Vk.prototype.parseError = function (statusCode, parsedBody) {
	if ('error' in parsedBody) {
		return new NoError('ProviderError', 'Error with statusCode = ' + statusCode + ' and message: ' +
			parsedBody.error + ': ' + parsedBody.description, parsedBody);
	}
};

Vk.prototype.constructResult = function (authInfo, options, cb) {
	var self = this;
	var fields;
	var savedResult;

	var nameRule = {
		id: 'uid',
		name: 'first_name,last_name',
		username: 'nickname',
		gender: 'sex',
		birthday: 'bdate',
		location: 'city,country',
		picture: 'photo_big'
	};

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
				var xFields = [];
				for (var i = 0; i < fields.length; i++) {
					if (fields[i] !== 'profileUrl') {
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
				self.makeApiRequest({
					slug: '/getProfiles',
					token: authInfo.access_token,
					params: {
						uids: authInfo.user_id,
						fields: fields.map(function (el) {
							return el in nameRule ? nameRule[el] : el;
						}).join(',')
					}
				}, cb);
			}
		},
		function (body, cb) {
			savedResult = body.response[0];
			if ('city' in savedResult) {
				self.makeApiRequest({
					slug: '/places.getCityById',
					token: authInfo.access_token,
					params: { cids: savedResult.city }
				}, cb);
			}
			else {
				cb();
			}
		},
		function (body, cb) {
			if (body) {
				savedResult.city = body.response.length === 0 ? '' : body.response[0].name;
			}
			if ('country' in savedResult) {
				self.makeApiRequest({
					slug: '/places.getCountryById',
					token: authInfo.access_token,
					params: { cids: savedResult.country }
				}, cb);
			}
			else {
				cb();
			}
		},
		function (body, cb) {
			if (body) {
				savedResult.country = body.response.length === 0 ? '' : body.response[0].name;
			}

			if (fields.indexOf('profileUrl') !== -1) {
				savedResult.profileUrl = 'https://vk.com/' + (savedResult.nickname ? savedResult.nickname : 'id' + savedResult.uid);
			}
			savedResult.birthday = null;
			if (savedResult.bdate) {
				var bd = savedResult.bdate.split('.');
				savedResult.birthday = [bd[2], bd[1], bd[0]].join('-');
			}
			savedResult.id = savedResult.uid + '';
			savedResult.name = savedResult.first_name + ' ' + savedResult.last_name;
			savedResult.location = '';
			if (savedResult.city) {
				savedResult.location = savedResult.city;
			}
			if (savedResult.country) {
				savedResult.location += (savedResult.location ? ', ' : '') + savedResult.country;
			}
			savedResult.gender = savedResult.sex === 2 ? 'male' : 'female';
			cb(null, {
				auth: {
					access_token: authInfo.access_token,
					expires: authInfo.expires_in
				},
				data: self.removeWasteFields(savedResult, self.renameRule, fields)
			});
		}
	], cb);
};


module.exports = Vk;
