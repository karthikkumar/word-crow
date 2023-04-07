// const SPREADSHEET_ID = "1s7yof0W_O0d5Hec6EoNxvu8MrscrjNaXVdX67eNOwXw";
const FILE_NAME = "Word Crow";
const SHEET_NAME = "List";
const CONTEXT_MENU_ID = "collectWord";

chrome.contextMenus.create({
  id: CONTEXT_MENU_ID,
  title: "Collect Word",
  contexts: ["selection"],
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log({ request, sender });
  if (request.action === "signIn") {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      console.log("Successfully signed in : ", { token });
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
});

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
          console.log("Spreadsheet found, ID: " + data.files[0].id);
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
              console.log("Spreadsheet created, ID: " + newSheet.spreadsheetId);
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

function storeSelectedWordInSheet(spreadsheetId, selectedWord) {
  chrome.identity.getAuthToken({ interactive: true }, (token) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }

    const sheetsApi = "https://sheets.googleapis.com/v4/spreadsheets";
    const range = encodeURIComponent(`${SHEET_NAME}!A:A`);
    const url = `${sheetsApi}/${spreadsheetId}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS&access_token=${token}`;

    fetch(url, {
      method: "POST",
      body: JSON.stringify({
        range: `${SHEET_NAME}!A:A`,
        values: [[selectedWord]],
      }),
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => {
        if (response.ok) {
          console.log("Selected word stored in Google Sheet");
        } else {
          console.error("Failed to store the selected word");
        }
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  });
}

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === CONTEXT_MENU_ID) {
    const selectionText = info.selectionText;
    const word = selectionText.trim().split(" ")[0];
    console.log({ selectionText, word });

    findOrCreateSheet((spreadsheetId) => {
      storeSelectedWordInSheet(spreadsheetId, word);
    });
  }
});
