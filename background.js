import {
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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "signIn") {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError || !token) {
        console.error(chrome.runtime.lastError);
        sendResponse({ signedIn: false });
      } else {
        sendResponse({ signedIn: true });
      }
    });

    // This line is necessary to use sendResponse asynchronously
    return true;
  }

  if (request.action === "fetchRecentWords") {
    fetchRecentWordsFromSheet(FILE_NAME, SHEET_NAME, TOP_10_RANGE).then(
      (words) => {
        sendResponse({ words });
      }
    );

    // This line is necessary to use sendResponse asynchronously
    return true;
  }
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId === CONTEXT_MENU_ID) {
    const selectionText = info.selectionText;
    const selectedWord = selectionText.trim().split(" ")[0];

    // get a meaning of the word from the Wordnik API through a proxy
    // store it in the local storage before storing it in the sheet
    const { word, meaning = "" } = await fetchDefinition(selectedWord);
    storeSelectedWordLocally(word, meaning);

    storeSelectedWordInSheet(FILE_NAME, SHEET_NAME, word, meaning);
  }
});
