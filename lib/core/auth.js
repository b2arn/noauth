"use strict";
var url = require('url');
var errors = require('./errors');
var async = require('async');


var NoError = errors.NoError;
var NoOtherError = errors.NoOtherError;
var NoConnectionError = errors.NoConnectionError;
var NoInputError = errors.NoInputError;

var Auth = function (opt_appInfo, opt_redirectUrl) {
	this.appInfo = opt_appInfo;
	this.redirectUrl = opt_redirectUrl;
};

Auth.prototype.needStorage = false;

Auth.prototype.renameRule = {};

Auth.prototype.defaultScope = null;

Auth.prototype.parseRedirectError = function (query) { };

Auth.prototype.availableFields = ['id', 'name', 'email', 'gender', 'birthday', 'picture', 'bio', 'site', 'location', 'locale', 'username', 'lastName',
	'firstName', 'profileUrl'];

Auth.prototype.checkBodyIsObject = function (statusCode, parsedBody) {
	if (parsedBody.constructor !== Object) {
		return new NoError('ProviderError', 'Can\'t parse body ' + parsedBody + '\nstatusCode = ' + statusCode, {body: parsedBody, statusCode: statusCode});
	}
};

Auth.prototype.checkStatusCode = function (code, body) {
	if (code >= 500) {
		return new NoOtherError(code, body);
	}
};

Auth.prototype.rename = function (src, rule) {
	var data = {};
	for (var key in rule) {
		var valArr = rule[key].split('.');
		var newSrc = src;
		var found = true;
		for (var i = 0; i < valArr.length; i++) {
			if (valArr[i] in newSrc) {
				newSrc = newSrc[valArr[i]];
			}
			else {
				found = false;
				break;
			}
		}

		if (!found) {
			continue;
		}

		var keyArr = key.split('.');
		var newData = data;
		for (i = 0; i < keyArr.length - 1; i++) {
			if (!(keyArr[i] in newData)) {
				newData[keyArr[i]] = {};
			}
			else if (newData[keyArr[i]].constructor !== Object) {
				throw new NoError('Other','Strange data in keys of rules: ' + newData[keyArr[i]] + ' is not an Object');
			}
			newData = newData[keyArr[i]];
		}

		newData[keyArr[keyArr.length - 1]] = newSrc;
	}

	return data;
};

Auth.prototype.setInfo = function (appInfo, redirectUrl) {
	this.appInfo = appInfo;
	this.redirectUrl = redirectUrl;
};

Auth.prototype.constructResult = function (body, options, cb) {
	cb(null, this.parseBody(body));
};

Auth.prototype.genFields = function (options) {
	var result = {};
	if (options && options.fields) {
		for (var i = 0; i < options.fields.length; i++) {
			var key = options.fields[i];
			this.checkField(key);

			if (key in result) {
				throw new NoInputError(key, 'duplicate');
			}
			result[key] = null;
		}
		result = Object.keys(result);
	}
	else {
		result = this.availableFields;
	}

	return result;
};

Auth.prototype.removeWasteFields = function (body, rule, fields) {
	var data = this.rename(body, rule);
	var result = {};
	for (var i = 0; i < fields.length; i++) {
		var field = fields[i];
		if (field in data) {
			result[field] = data[field];
		}
		else if (field in body) {
			result[field] = body[field];
		}
	}
	return result;
};

Auth.prototype.checkField = function (field) {
	var isKnownField = this.availableFields.some(function (el) {
		return el === field;
	});
	if (!isKnownField) {
		throw new NoInputError(field, 'wrong field');
	}
};

Auth.prototype.createErrorHandler = function (cb) {
	var self = this;
	return function (err, res, body) {
		if (err) {
			cb(new NoConnectionError(err));
		}
		else {
			self.handleError(res.statusCode, body, cb);
		}
	};
};

Auth.prototype.parse = function (body) {
	if (body && body.constructor === String) {
		try {
			return JSON.parse(body);
		}
		catch (err) {
			if (body.indexOf('=')) {
				return this.parseUrlEncodedBody(body);
			}
			else {
				return body;
			}
		}
	}
};

Auth.prototype.handleError = function (statusCode, body, cb) {
	var parsedBody = this.parse(body);
	var err =
		this.checkStatusCode(statusCode, body) ||
		this.checkBodyIsObject(statusCode, parsedBody) ||
		this.parseError(statusCode, parsedBody) ||
		(statusCode >= 400 ? new NoError('ProviderError', 'Unknown error with body: ' + parsedBody, body) : null);
	cb(err, parsedBody);
};

Auth.prototype.parseJsonBody = function (body) {
	return JSON.parse(body);
};

Auth.prototype.parseUrlEncodedBody = function (body) {
	if (body.indexOf('=') === -1) {
		return body;
	}
	return url.parse('?' + body, true).query;
};

Auth.prototype.parseResultUrl = function (uri) {
	return url.parse(uri, true).query;
};

Auth.prototype.createAuthRequestUrl = function (options, cb) {
	throw new Error('usage of non implemented method');
};

Auth.prototype.exchangeAuthGrant = function (resultInfo, options, cb) {
	throw new Error('usage of non implemented method');
};

Auth.prototype.parseError = function (statusCode, parsedBody) {
	throw new Error('usage of non implemented method');
};


module.exports = Auth;
