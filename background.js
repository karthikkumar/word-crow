import {
  getAccessToken,
  storeSelectedWordInSheet,
  fetchRecentWordsFromSheet,
  deleteAWord,
} from "./google-sheets.js";
import { fetchDefinition } from "./wordnik.js";
import {
  storeSelectedWordLocally,
  storeFetchedWordsLocally,
  deleteAWordLocally,
} from "./storage.js";

const CONTEXT_MENU_ID = "collectWord";
const FILE_NAME = "Word Crow";
const SHEET_NAME = "List";
const TOP_10_RANGE = "A1:B10";

function createContextMenu() {
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: "Collect Word",
    contexts: ["selection"],
  });
}

chrome.runtime.onInstalled.addListener(() => {
  createContextMenu();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "signIn") {
    getAccessToken().then((accessToken) => {
      if (chrome.runtime.lastError || !accessToken) {
        console.error(chrome.runtime.lastError);
        sendResponse({ signedIn: false });
      } else {
        sendResponse({ signedIn: true });
      }
    });
  } else if (request.action === "fetchRecentWords") {
    fetchRecentWordsFromSheet(FILE_NAME, SHEET_NAME, TOP_10_RANGE)
      .then((words) => {
        if (words?.length > 0) {
          storeFetchedWordsLocally(words);
          sendResponse(words);
        }
      })
      .catch((error) => {
        console.error("Failed to fetch recent words", error);
      });
  } else if (request.action === "deleteWord") {
    const { word, index } = request;
    deleteAWord(FILE_NAME, SHEET_NAME, word, index)
      .then(() => {
        deleteAWordLocally(index - 1);
        sendResponse({ deleted: true });
      })
      .catch((error) => {
        sendResponse({ deleted: false });
        console.error("Failed to delete a word", error);
      });
  }

  // This line is necessary to use sendResponse asynchronously
  return true;
});

function clearBadge() {
  setTimeout(() => {
    chrome.action.setBadgeText({ text: "" });
  }, 3000);
}

function showSuccessBadge() {
  chrome.action.setBadgeText({ text: "CAW" });
  chrome.action.setBadgeBackgroundColor({ color: "green" });
  clearBadge();
}

function showErrorBadge() {
  chrome.action.setBadgeText({ text: "ERR" });
  chrome.action.setBadgeBackgroundColor({ color: "red" });
  clearBadge();
}

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId === CONTEXT_MENU_ID) {
    try {
      const selectionText = info.selectionText;
      const selectedWord = selectionText.trim().split(" ")[0];

      // get a definition of the word from the Wordnik API through a proxy
      const { word, definition } = await fetchDefinition(selectedWord);
      // store it in the local storage before storing it in the sheet
      storeSelectedWordLocally(word, definition);
      await storeSelectedWordInSheet(FILE_NAME, SHEET_NAME, word, definition);
      // display CAW on the extension icon on success
      showSuccessBadge();
    } catch (error) {
      // display ERR on the extension icon on failure
      showErrorBadge();
      console.error(error);
    }
  }
});
