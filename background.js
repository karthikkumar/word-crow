import {
  getAccessToken,
  storeSelectedWordInSheet,
  fetchRecentWordsFromSheet,
} from "./google-sheets.js";
import { fetchDefinition } from "./wordnik.js";
import { storeSelectedWordLocally } from "./storage.js";

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

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  try {
    if (request.action === "signIn") {
      const accessToken = await getAccessToken();
      if (chrome.runtime.lastError || !accessToken) {
        console.error(chrome.runtime.lastError);
        sendResponse({ signedIn: false });
      } else {
        sendResponse({ signedIn: true });
      }
    } else if (request.action === "fetchRecentWords") {
      const words = await fetchRecentWordsFromSheet(
        FILE_NAME,
        SHEET_NAME,
        TOP_10_RANGE
      );
      sendResponse({ words });
    }
  } catch (error) {
    console.error(error);
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

      // get a meaning of the word from the Wordnik API through a proxy
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
