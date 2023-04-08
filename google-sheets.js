async function getAccessToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      const error = chrome.runtime.lastError;
      if (error || !token) {
        console.error(error);
        reject(error);
      } else {
        resolve(token);
      }
    });
  });
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

async function findOrCreateSheet(fileName, sheetName) {
  const accessToken = await getAccessToken();

  // Search for the spreadsheet by name
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(
    fileName
  )}' and mimeType='application/vnd.google-apps.spreadsheet'&fields=files(id)&access_token=${accessToken}`;

  const spreadsheetId = await fetch(searchUrl)
    .then((response) => response.json())
    .then((data) => {
      if (data.files.length > 0) {
        // Spreadsheet found, return the ID
        return data.files[0].id;
      } else {
        // Spreadsheet not found, create a new one
        const createUrl = `https://sheets.googleapis.com/v4/spreadsheets?access_token=${token}`;
        fetch(createUrl, {
          method: "POST",
          body: JSON.stringify({
            properties: {
              title: fileName,
            },
            sheets: [
              {
                properties: {
                  title: sheetName,
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
            return newSheet.spreadsheetId;
          })
          .catch((error) => {
            console.error("Error:", error);
          });
      }
    })
    .catch((error) => {
      console.error("Error:", error);
    });

  return spreadsheetId;
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

// async function insertRow(sheetId, sheetName, accessToken) {
//   const sheetsApiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`;
//   const data = {
//     requests: [
//       {
//         insertDimension: {
//           range: {
//             sheetId: sheetName,
//             dimension: "ROWS",
//             startIndex: 0,
//             endIndex: 1,
//           },
//           inheritFromBefore: false,
//         },
//       },
//     ],
//   };

//   const response = await fetch(sheetsApiUrl, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${accessToken}`,
//     },
//     body: JSON.stringify(data),
//   });

//   if (!response.ok) {
//     throw new Error(
//       `Error inserting row in Google Sheet: ${response.statusText}`
//     );
//   }

//   return response.json();
// }

// async function updateTopRow(sheetId, range, values, accessToken) {
//   const sheetsApiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?valueInputOption=RAW`;
//   const data = { values };

//   const response = await fetch(sheetsApiUrl, {
//     method: "PUT",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${accessToken}`,
//     },
//     body: JSON.stringify(data),
//   });

//   if (!response.ok) {
//     throw new Error(
//       `Error updating top row in Google Sheet: ${response.statusText}`
//     );
//   }

//   return response.json();
// }

async function storeSelectedWordInSheet(fileName, sheetName, word, definition) {
  try {
    const accessToken = await getAccessToken();
    const spreadsheetId = await findOrCreateSheet(fileName, sheetName);

    const sheetsApi = "https://sheets.googleapis.com/v4/spreadsheets";
    const range = encodeURIComponent(`${sheetName}!A:B`);
    const url = `${sheetsApi}/${spreadsheetId}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS&access_token=${accessToken}`;
    const success = await fetch(url, {
      method: "POST",
      body: JSON.stringify({
        values: [[word, definition]],
      }),
      headers: {
        "Content-Type": "application/json",
      },
    }).then((response) => {
      if (response.ok) {
        return true;
      } else {
        throw new Error("Failed to store the selected word");
      }
    });

    if (success) {
      // TODO: display CAW on the extension icon
    }
  } catch (error) {
    console.error("Error:", error);
    // TODO: display ERR on the extension icon
  }
}

async function fetchRecentWordsFromSheet(fileName, sheetName, range) {
  const accessToken = await chrome.identity
    .getAuthToken({ interactive: true })
    .then(({ token }) => token)
    .catch((error) => {
      console.error("Error fetching access token: ", error);
    });

  if (accessToken) {
    const spreadsheetId = await findSpreadsheetIdByName(fileName, accessToken);
    if (spreadsheetId) {
      const words = await fetchDataFromSheet(
        spreadsheetId,
        sheetName,
        range,
        accessToken
      );
      return words;
    }
  }
}

export { storeSelectedWordInSheet, fetchRecentWordsFromSheet };
