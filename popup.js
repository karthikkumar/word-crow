function showSpinner() {
  document.getElementById("spinner").style.display = "block";
}

function hideSpinner() {
  document.getElementById("spinner").style.display = "none";
}

function showUnthenticatedContent() {
  document.getElementById("unauthenticated").style.display = "block";
}

function hideUnthenticatedContent() {
  document.getElementById("unauthenticated").style.display = "none";
}

function showAuthenticatedContent() {
  document.getElementById("authenticated").style.display = "block";
}

function checkAuthenticationStatus() {
  showSpinner();

  chrome.identity.getAuthToken({ interactive: false }, (token) => {
    hideSpinner();
    if (chrome.runtime.lastError || !token) {
      showUnthenticatedContent();
    } else {
      hideUnthenticatedContent();
      showAuthenticatedContent();
    }
  });
}

document.getElementById("signInButton").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "signIn" }, (response) => {
    console.log(response);
    if (response && response.signedIn) {
      window.close();
    } else {
      console.error("Failed to sign in");
    }
  });
});

// Check the authentication status when the popup is opened
checkAuthenticationStatus();
