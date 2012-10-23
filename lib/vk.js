"use strict";
var OAuth = require('./core/oauth2');
var url = require('url');
var async = require('async');
var request = require('request');
var inherits = require('util').inherits;
var errors = require('./core/errors');


var NoError = errors.NoError;
var NoConnectionError = errors.NoConnectionError;

var Vk = function (opt_appInfo, opt_redirectUrl) {
	OAuth.call(this, opt_appInfo, opt_redirectUrl);
};

inherits(Vk, OAuth);

Vk.prototype.scopeGen = function (scope) {
	return scope.join(',');
};

Vk.prototype.availableFields = ['id', 'name', 'gender', 'birthday', 'location', 'picture', 'username'];

Vk.prototype.providerInfo = {
	authUrl: 'http://api.vkontakte.ru/oauth/authorize',
	tokenUrl: 'https://api.vkontakte.ru/oauth/access_token'
};

Vk.prototype.parseBody = function (body) {
	return this.parseJsonBody(body);
};

Vk.prototype.parseError = function (body, cb) {
	if ('error' in body) {
		cb(new NoError('ProviderTechnicalError', body.error + ': ' + body.description, body));
	}
	else {
		cb(null, body);
	}
};

Vk.prototype.constructResult = function (authInfo, options, cb) {
	var self = this;
	var savedFields;

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
			self.genFields(options, cb);
		},
		function (fields, cb) {
			savedFields = fields;

			request({
				method: 'GET',
				url: url.resolve('https://api.vk.com/method/getProfiles', url.format({
					query: {
						access_token: authInfo.access_token,
						uids: authInfo.user_id,
						fields: fields.map(function (el) {
							return el in nameRule ? nameRule[el] : el;
						}).join(',')
					}
				}))
			}, function (err, res, body) {
				if (err) {
					cb(new NoConnectionError(err, res));
				}
				else {
					cb(null, JSON.parse(body).response[0]);
				}
			});
		},
		function (result, cb) {
			request({
				method: 'GET',
				url: url.resolve('https://api.vk.com/method/places.getCityById', url.format({
					query: {
						access_token: authInfo.access_token,
						cids: result.data.city
					}
				}))
			}, function (err, res, body) {
				if (err) {
					cb(err);
				}
				else {
					var response = JSON.parse(body).response;
					if (response.length === 0) {
						delete result.data.city;
					}
					else {
						result.data.city = response[0].name;
					}

					cb(null, result);
				}
			});
		},
		function (result, cb) {
			request({
				method: 'GET',
				url: url.resolve('https://api.vk.com/method/places.getCountryById', url.format({
					query: {
						access_token: authInfo.access_token,
						cids: result.data.country
					}
				}))
			}, function (err, res, body) {
				if (err) {
					cb(err);
				}
				else {
					var response = JSON.parse(body).response;
					delete result.data.country;
					result.data.city += response.length > 0 ? ', ' + response[0].name : '';
					cb(null, result);
				}
			});
		}
	],
	function (err, result) {
		if (err) {
			cb(err);
		}
		else {
			cb(null, {
				auth: {
					access_token: result.auth.access_token,
					expires: result.auth.expires_in
				},
				data: {
					id: result.data.uid + '',
					name: result.data.first_name + ' ' + result.data.last_name,
					gender: result.data.sex === 2 ? 'male' : 'female',
					birthday: result.data.bdate,
					location: result.data.city,
					picture: result.data.photo_big
				}
			});
		}
	});

};


module.exports = Vk;
