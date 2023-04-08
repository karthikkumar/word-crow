async function getAccessToken() {
  return chrome.identity
    .getAuthToken({ interactive: true })
    .then(({ token }) => token);
}

async function findSpreadsheetIdByName(fileName, accessToken) {
  const query = `mimeType='application/vnd.google-apps.spreadsheet' and trashed = false and name='${fileName}'`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    query
  )}&fields=files(id,name)&access_token=${accessToken}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Error searching for spreadsheet");
  }

  const data = await response.json();
  return data?.files?.length > 0 ? data.files[0].id : null;
}

async function findOrCreateSheet(fileName, sheetName) {
  const accessToken = await getAccessToken();

  // Search for the spreadsheet by name
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(
    fileName
  )}' and mimeType='application/vnd.google-apps.spreadsheet'&fields=files(id)&access_token=${accessToken}`;

  return fetch(searchUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Error searching for spreadsheet");
      }
      return response.json();
    })
    .then((data) => {
      if (data.files?.length > 0) {
        // Spreadsheet found, return the ID
        return data.files[0].id;
      } else {
        // Spreadsheet not found, create a new one
        const createUrl = `https://sheets.googleapis.com/v4/spreadsheets?access_token=${token}`;
        return fetch(createUrl, {
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
          .then((response) => {
            if (!response.ok) {
              throw new Error("Error creating spreadsheet");
            }
            return response.json();
          })
          .then((newSheet) => newSheet.spreadsheetId);
      }
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

async function findSheetId(spreadsheetId, sheetName, accessToken) {
  const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?access_token=${accessToken}`;
  return fetch(metadataUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          `Error fetching spreadsheet metadata: ${response.statusText}`
        );
      }
      return response.json();
    })
    .then((data) => {
      const sheet = data.sheets.find(
        (sheet) => sheet.properties.title === sheetName
      );
      if (sheet) {
        return sheet.properties.sheetId;
      } else {
        throw new Error("Sheet not found");
      }
    });
}

async function insertRow(spreadsheetId, sheetName, accessToken) {
  const sheetId = await findSheetId(spreadsheetId, sheetName, accessToken);
  const sheetsApiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
  const data = {
    requests: [
      {
        insertDimension: {
          range: {
            sheetId,
            dimension: "ROWS",
            startIndex: 0,
            endIndex: 1,
          },
          inheritFromBefore: false,
        },
      },
    ],
  };

  return fetch(sheetsApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(data),
  }).then((response) => {
    if (!response.ok) {
      throw new Error(
        `Error inserting row in Google Sheet: ${response.statusText}`
      );
    }
    return response.json();
  });
}

async function updateTopRow(spreadsheetId, sheetName, values, accessToken) {
  const updateRange = `${sheetName}!A1:B1`;
  const sheetsApiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${updateRange}?valueInputOption=RAW`;

  return fetch(sheetsApiUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ values: [values] }),
  }).then((response) => {
    if (!response.ok) {
      throw new Error(
        `Error updating top row in Google Sheet: ${response.statusText}`
      );
    }
    return response.json();
  });
}

async function storeSelectedWordInSheet(fileName, sheetName, word, definition) {
  const accessToken = await getAccessToken();
  const spreadsheetId = await findOrCreateSheet(fileName, sheetName);
  await insertRow(spreadsheetId, sheetName, accessToken);
  await updateTopRow(spreadsheetId, sheetName, [word, definition], accessToken);
}

async function fetchRecentWordsFromSheet(fileName, sheetName, range) {
  const accessToken = await getAccessToken();
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

export { getAccessToken, storeSelectedWordInSheet, fetchRecentWordsFromSheet };
