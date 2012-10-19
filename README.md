# NoAuth README

1. Auth should return:
	* auth
		* token - str
		* secret (for oauth 1a is nessesary) - str
		* expires - int ?
		* refreshToken - str ?
		* additional staff - obj ?
	* data
		* id - str
		* mail - str ?
		* name - str ?
		* gender - str ('male' or 'female') ?
		* birth - (dd-mm-yyyy) ?
		* picture - str ?
		* bio - str ?
		* username - str ?
		* location - str ?
		* site str ?
2. appInfo
	* id
	* secret
3. providerInfo
	* auth 2
		* authUrl
		* tokenUrl
	* auth 1
		* requestUrl
		* authUrl
		* accessUrl
