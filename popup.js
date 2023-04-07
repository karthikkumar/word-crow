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

function showLoadingWords() {
  document.getElementById("loadingWords").style.display = "block";
}

function hideLoadingWords() {
  document.getElementById("loadingWords").style.display = "none";
}

function fetchRecentWords() {
  showLoadingWords();
  chrome.runtime.sendMessage({ action: "fetchRecentWords" }, (response) => {
    if (response?.words) {
      const wordListContainer = document.getElementById("wordListContainer");
      const wordList = document.getElementById("wordList");
      wordList.innerHTML = "";

      const template = document.getElementById("wordTemplate");
      for (const word of response.words) {
        const listItem = template.content.firstElementChild.cloneNode(true);
        listItem.querySelector(".word").textContent = word;
        listItem.querySelector(".meaning").textContent = "meaning";
        wordList.appendChild(listItem);
      }

      wordListContainer.style.display = "block";
    } else {
      console.error("Failed to fetch recent words");
    }

    hideLoadingWords();
  });
}

function showAuthenticatedContent() {
  document.getElementById("authenticated").style.display = "block";
  fetchRecentWords();
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
