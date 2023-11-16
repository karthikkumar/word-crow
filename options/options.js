function checkAuthenticationStatus() {
  showSpinner();

  chrome.identity.getAuthToken({ interactive: false }, (token) => {
    hideSpinner();
    if (chrome.runtime.lastError || !token) {
      //   showUnthenticatedContent();
    } else {
      //   hideUnthenticatedContent();
      //   showAuthenticatedContent();
    }
  });
}

document
  .getElementById("word-crow-options__signin")
  .addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "signIn" }, (response) => {
      if (response && response.signedIn) {
      } else {
        console.error("Failed to sign in");
      }
    });
  });
