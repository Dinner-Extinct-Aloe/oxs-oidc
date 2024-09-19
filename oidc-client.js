const localStorageKey = "sessionData";

function createClient(config) {
    let client = new OIDCClient(config);
    return client;
}

class OIDCClient {

    config;
    accessToken;
    oidcClaims;
    accessTokenExpiration;

    constructor(config) {
        console.log("Creating a new instance of OIDCClient");
        this.config = config;
        this.getLocalStorageData();
    }

    loginWithRedirect(parameters) {
        console.log("oauthAuthorize");
        let queryStringParams = {
            response_type: 'code',
            client_id: this.config.clientId,
            redirect_uri: this.config.redirectUri,
            ...parameters
        }
        let authUrl = this.config.azServerUrl + this.config.azEndpoint + "?" + new URLSearchParams(queryStringParams).toString();
        window.location.replace(authUrl);
    }

    logoutWithRedirect() {
        console.log("oauthLogout");
        let queryStringParams = {
            //post_logout_redirect_uri: this.config.redirectUri
          TargetResource: this.config.redirectUri

        }
        let authUrl = this.config.azServerUrl + this.config.logoutEndpoint + "?" + new URLSearchParams(queryStringParams).toString();
        window.location.replace(authUrl);
        this.clearLocalStorageData();
    }

    async handleRedirectBack() {
        const codeMatch = window.location.href.match('[?#&]code=([^&]*)');
        if (codeMatch && codeMatch[1]) {
            return await this.fetchTokens(codeMatch[1]);
        }
    }

    async fetchTokens(azCode) {
        console.log("fetchTokens  with code " + azCode);

        let bodyParams = {
            grant_type: 'authorization_code',
            code: azCode,
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            redirect_uri: this.config.redirectUri
        }

        let response = await fetch(this.config.azServerUrl + this.config.tokenEndpoint, {
            method: "POST",
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams(bodyParams).toString()
        })

        console.log(response);
        let body = await response.json();
        this.parseAzServerResponse(body);
        this.storeLocalStorageData(body);
        console.log("OIDC Claims");
        console.log(this.oidcClaims);
    }

    parseAzServerResponse(body) {
        this.accessToken = body.access_token;
        this.oidcClaims = this.verifyIdToken(body.id_token, this.config.azServerUrl, this.config.clientId).payload;
        this.accessTokenExpiration = Math.floor(Date.now() / 1000) + 1;
    }

    getLocalStorageData() {
        let azServerData = localStorage.getItem(localStorageKey);
        if (azServerData) {
            this.parseAzServerResponse(JSON.parse(azServerData))
        }
    }

    clearLocalStorageData() {
        localStorage.clear();
    }


    storeLocalStorageData(body) {
        localStorage.setItem(localStorageKey, JSON.stringify(body));
    }

    getOidcClaims() {
        return this.oidcClaims;
    }

    getAccessToken() {
        return this.accessToken;
    }

    isUserAuthenticated() {
        if (!this.oidcClaims) {
            return false;
        }

        if (this.isExpired(this.oidcClaims.exp)) {
            return false;
        }
        return true;
    }

    isNumber = n => typeof n === 'number';

    verifyIdToken(idToken, expectedIssuer, expectedAudience) {
        let decodedToken = this.decodeJWT(idToken);
        var aud = decodedToken.payload.aud;
        var sub = decodedToken.payload.sub;
        var iss = decodedToken.payload.iss;
        var exp = decodedToken.payload.exp;
        var iat = decodedToken.payload.iat;

        if (!iss || typeof iss !== 'string') {
            throw new Error("Issuer (iss) not present");
        }

        if (iss !== expectedIssuer) {
            throw new Error("Issuer (iss) mismatch :" +expectedIssuer+ "Iss: "+iss)
        }

        if (!sub || typeof sub !== 'string') {
            throw new Error("Subject (sub) not present");
        }

        if (!aud || typeof aud !== 'string') {
            throw new Error("Audience (aud) not present");
        }

        if (aud !== expectedAudience) {
            throw new Error("Audience (aud) mismatch");
        }

        if (!exp || !this.isNumber(exp)) {
            throw new Error("Expiration Time (exp) not present");
        }

        if (this.isExpired(exp)) {
            throw new Error("Token expired");
        }

        if (!iat || !this.isNumber(exp)) {
            throw new Error("Issued At (iat) not present");
        }
        return decodedToken;
    }

    isExpired(exp) {
        let expTimeDate = new Date(0);
        expTimeDate.setUTCSeconds(exp);
        let now = new Date();

        if (now > expTimeDate) {
            return true;
        }
        return false;
    }

    decodeJWT(Jwt) {
        let parts = Jwt.split('.');
        let header;
        let payload;

        if (parts.length !== 3) {
            throw new Error('Malformed JWT');
        }

        header = JSON.parse(this.base64urldecodeStr(parts[0]));
        payload = JSON.parse(this.base64urldecodeStr(parts[1]));

        return {
            header: header,
            payload: payload,
            encoded: {
                header: parts[0],
                payload: parts[1],
                signature: parts[2]
            }
        };
    }

    base64urldecodeStr(str) {
        str = str.replace(/-/g, '+').replace(/_/g, '/');
        return atob(str);
    }
}