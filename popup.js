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

function showWords(words) {
  if (words.length === 0) {
    return;
  }
  const wordListContainer = document.getElementById("wordListContainer");
  const wordList = document.getElementById("wordList");
  wordList.innerHTML = "";

  const template = document.getElementById("wordTemplate");
  let word, definition;
  for (const item of words) {
    if (Array.isArray(item)) {
      [word, definition] = item;
    } else {
      word = item.word;
      definition = item.definition;
    }
    const listItem = template.content.firstElementChild.cloneNode(true);
    listItem.querySelector(".word").textContent = word;
    listItem.querySelector(".definition").textContent = definition;
    wordList.appendChild(listItem);
  }

  wordListContainer.style.display = "block";
}

function fetchRecentWords() {
  showLoadingWords();

  // show recent words from local storage until the recent words are fetched from the sheet
  const key = "words";
  chrome.storage.local.get(key, (result) => {
    const words = result[key];
    if (words?.length > 0) {
      showWords(words);
    }
  });

  chrome.runtime.sendMessage({ action: "fetchRecentWords" }, (words) => {
    if (words?.length > 0) {
      showWords(words);
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
    if (response && response.signedIn) {
      window.close();
    } else {
      console.error("Failed to sign in");
    }
  });
});

// Check the authentication status when the popup is opened
checkAuthenticationStatus();
