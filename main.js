let config = {
    azServerUrl: "https://hub-mtls.auth-int.thalesgroup.com",
    tokenEndpoint: "/as/token.oauth2",
    azEndpoint: "/as/authorization.oauth2",
    logoutEndpoint: "/idp/startSLO.ping",
    clientId: "oidc_az_code_p03_opaque",
    clientSecret: "oidc_az_code_p03_opaque_secret",
    redirectUri: "https://oxs-oidc-int.glitch.me/"
}

const oidcClient = createClient(config);

window.onload = async () => {
    console.log("Runnig window.onload");

    document.getElementById("login-button").addEventListener("click", () => login());
    document.getElementById("register-button").addEventListener("click", () => register());
    document.getElementById("password-button").addEventListener("click", () => password());

    if (oidcClient.isUserAuthenticated()) {
        console.log("Valid Session exists");
        updateUI();
    }

    if (window.location.search.includes("code=")) {
        console.log("Redirect from OIDC authorization with code");
        showSpinner();
        await oidcClient.handleRedirectBack();
        console.log(oidcClient.getOidcClaims());
        console.log(oidcClient.getAccessToken());
        window.history.replaceState({}, document.title, window.location.pathname);
        updateUI();
        hideSpinner();
    } else if (window.location.search.includes("error=")) {
        console.log("Redirect from OIDC authorization with error");
        accessDenied();
    }
}



function accessDenied() {
    displayElement("error-container");
}

function backHome() {
    hideElement("editForm");
    displayElement("content");
}

function login() {
    console.log("Login");
    let userLang = navigator.language || navigator.userLanguage;
    console.log(userLang);
    oidcClient.loginWithRedirect({ scope: "openid profile email" });
}

function register() {
    console.log("Register");
    let userLang = navigator.language || navigator.userLanguage;
    console.log(userLang);
    oidcClient.loginWithRedirect({ scope: "openid profile email", locale: userLang, acr_values: "78499b2eea75ee216b3b40610b6b8c0e" });
}

function password() {
    console.log("Password");
    let userLang = navigator.language || navigator.userLanguage;
    console.log(userLang);
    oidcClient.loginWithRedirect({ scope: "openid profile email", locale: userLang, acr_values: "aed91a829faaa0e427d800fdae2e4662" });
}

function logout() {
    console.log("Logout");
    //oidcClient.logoutWithRedirect();
    oidcClient.logout();
}

function updateUI() {
    console.log("updateUI");
    if (oidcClient.isUserAuthenticated) {
        console.log("not authenticated")
        document.getElementById("firstname").innerText = getName();
        document.getElementById("token").innerText = JSON.stringify(oidcClient.getOidcClaims(),null,2);
        displayAuthUserElements();
    } else {
        console.log("authenticated")
        displayNonAuthUserElements();

    }
}

function displayAuthUserElements() {
    document.querySelectorAll('.public').forEach(e => hideElement(e.id));
    document.querySelectorAll('.protected').forEach(e => displayElement(e.id));
}

function displayNonAuthUserElements() {
    document.querySelectorAll('.public').forEach(e => displayElement(e.id));
    document.querySelectorAll('.protected').forEach(e => hideElement(e.id));
}

function displayElement(id) {
    console.log("showing " + id);
    document.getElementById(id).classList.remove("hidden");
}

function hideElement(id) {
    console.log("hiding " + id);
    document.getElementById(id).classList.add("hidden");
}

function showSpinner() {
    displayElement("wait-div");
}

function hideSpinner() {
    hideElement("wait-div");
}


function getName() {
    let username = oidcClient.getOidcClaims().name ? oidcClient.getOidcClaims().name : oidcClient.getOidcClaims().sub;
    if (oidcClient.getOidcClaims("email")) {
        username += " (" + oidcClient.getOidcClaims().email + ")";
    }
    console.log(username);
    return username;
}

function getRole() {
    console.log(oidcClient.getOidcClaims().role);
    return oidcClient.getOidcClaims().role;
}