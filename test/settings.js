"use strict";

var settings = {
	services: {
		instagram: {
			appInfo: {
				id: '018f4dae63fe4f9e87eeb3e5c38be62e',
				secret: '52a88a37e2ca4715af6d9ba3131b0589'
			},
			username: 'noauth',
			password: '1q2W3e4R5t'
		},
		tumblr: {
			appInfo: {
				id: 'oSrORhndY8ejG8Or14VBxNCoPM3NC0XBrUefEoWkSWPIac4tby',
				secret: 'f1vHbId6T7WWfU5Kho3xhCWkkG7kWTxyNsV0Wl4biLah6em3gA'
			},
			username: 'noauthtest@gmail.com',
			password: '1q2W3e4R5t'
		},
        twitter: {
            appInfo: {
                id: 'rf5WxTqNG88Pftnx2CmgA',
                secret: 'Jh7BsiFpiT4XhKE0iXhPUtFhmc73jeZXJo8DneI4gOg'
            },
            username: 'noauthtest',
            password: '1q2W3e4R5t'
        }
	},
	callbackUrl: 'http://localhost:3000/test'
};


module.exports = settings;
