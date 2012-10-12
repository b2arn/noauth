# NoAuth README

1. Auth should return:
	* auth
		* token
		* secret (for oauth 1a)
		* expires ?
		* additional staff
	* data
		* id
		* mail ?
		* name ?
		* sex ?
		* birth ?
		* photo ?
		* bio ?
		* location ?
		* site ?
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
