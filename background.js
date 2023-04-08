// const SPREADSHEET_ID = "1s7yof0W_O0d5Hec6EoNxvu8MrscrjNaXVdX67eNOwXw";
const FILE_NAME = "Word Crow";
const SHEET_NAME = "List";
const TOP_10_RANGE = "A1:B10";
const CONTEXT_MENU_ID = "collectWord";

chrome.contextMenus.create({
  id: CONTEXT_MENU_ID,
  title: "Collect Word",
  contexts: ["selection"],
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
    fetchRecentWordsFromSheet().then((words) => {
      sendResponse({ words });
    });

    // This line is necessary to use sendResponse asynchronously
    return true;
  }
});

function storeSelectedWordLocally(word, meaning) {
  const key = "words";
  chrome.storage.local.get(key, (result) => {
    const words = result[key] || [];
    const updatedWords = [...words];
    updatedWords.unshift({ word, meaning });
    if (updatedWords.length > 10) {
      updatedWords.splice(10);
    }
    chrome.storage.local.set({ words: updatedWords });
  });
}

async function fetchDataFromSheet(
  spreadsheetId,
  sheetName,
  range,
  accessToken
) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!${range}?access_token=${accessToken}`;
  const response = await fetch(url);
  const data = await response.json();
  return data?.values?.length > 0 ? data.values : [];
}

async function findSpreadsheetIdByName(fileName, accessToken) {
  const query = `mimeType='application/vnd.google-apps.spreadsheet' and trashed = false and name='${fileName}'`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    query
  )}&fields=files(id,name)&access_token=${accessToken}`;

  const response = await fetch(url);
  const data = await response.json();

  return data?.files?.length > 0 ? data.files[0].id : null;
}

async function fetchRecentWordsFromSheet() {
  const accessToken = await chrome.identity
    .getAuthToken({ interactive: true })
    .then(({ token }) => token)
    .catch((error) => {
      console.error("Error fetching access token: ", error);
    });

  if (accessToken) {
    const spreadsheetId = await findSpreadsheetIdByName(FILE_NAME, accessToken);
    if (spreadsheetId) {
      const words = await fetchDataFromSheet(
        spreadsheetId,
        SHEET_NAME,
        TOP_10_RANGE,
        accessToken
      );
      return words;
    }
  }
}

function findOrCreateSheet(callback) {
  chrome.identity.getAuthToken({ interactive: true }, (token) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }

    // Search for the spreadsheet by name
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(
      FILE_NAME
    )}' and mimeType='application/vnd.google-apps.spreadsheet'&fields=files(id)&access_token=${token}`;
    fetch(searchUrl)
      .then((response) => response.json())
      .then((data) => {
        if (data.files.length > 0) {
          // Spreadsheet found, return the ID
          callback(data.files[0].id);
        } else {
          // Spreadsheet not found, create a new one
          const createUrl = `https://sheets.googleapis.com/v4/spreadsheets?access_token=${token}`;
          fetch(createUrl, {
            method: "POST",
            body: JSON.stringify({
              properties: {
                title: FILE_NAME,
              },
              sheets: [
                {
                  properties: {
                    title: SHEET_NAME,
                  },
                },
              ],
            }),
            headers: {
              "Content-Type": "application/json",
            },
          })
            .then((response) => response.json())
            .then((newSheet) => {
              // Return the ID of the newly created spreadsheet
              callback(newSheet.spreadsheetId);
            })
            .catch((error) => {
              console.error("Error:", error);
            });
        }
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  });
}

function storeSelectedWordInSheet(spreadsheetId, word, meaning) {
  chrome.identity.getAuthToken({ interactive: true }, (token) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }

    const sheetsApi = "https://sheets.googleapis.com/v4/spreadsheets";
    const range = encodeURIComponent(`${SHEET_NAME}!A:B`);
    const url = `${sheetsApi}/${spreadsheetId}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS&access_token=${token}`;

    fetch(url, {
      method: "POST",
      body: JSON.stringify({
        values: [[word, meaning]],
      }),
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => {
        if (response.ok) {
          // TODO: display CAW on the extension icon
        } else {
          console.error("Failed to store the selected word");
        }
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  });
}

async function fetchMeaning(word) {
  const url = `https://wordnik-proxy-cjsf2syxhq-em.a.run.app/word.json/${word}/definitions?limit=1&includeRelated=false&useCanonical=false&includeTags=false`;
  const result = await fetch(url)
    .then((response) => response.json())
    .then((data) => {
      if (data.length > 0) {
        return { word, meaning: data[0].text };
      } else {
        return { word };
      }
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
    });
  return result || { word };
}

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId === CONTEXT_MENU_ID) {
    const selectionText = info.selectionText;
    const selectedWord = selectionText.trim().split(" ")[0];

    // get a meaning of the word from the Wordnik API through a proxy
    // store it in the local storage before storing it in the sheet
    const { word, meaning = "" } = await fetchMeaning(selectedWord);
    storeSelectedWordLocally(word, meaning);

    findOrCreateSheet((spreadsheetId) => {
      storeSelectedWordInSheet(spreadsheetId, word, meaning);
    });
  }
});
