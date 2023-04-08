function storeSelectedWordLocally(word, definition) {
  const key = "words";
  chrome.storage.local.get(key, (result) => {
    const words = result[key] || [];
    const updatedWords = [...words];
    updatedWords.unshift({ word, definition });
    if (updatedWords.length > 10) {
      updatedWords.splice(10);
    }
    chrome.storage.local.set({ words: updatedWords });
  });
}

function storeFetchedWordsLocally(words) {
  if (words.length > 0) {
    const latestWords = words.map(([word, definition]) => ({
      word,
      definition,
    }));
    latestWords.splice(10);
    chrome.storage.local.set({ words: latestWords });
  }
}

function deleteAWordLocally(index) {
  const key = "words";
  chrome.storage.local.get(key, (result) => {
    const words = result[key] || [];
    words.splice(index, 1);
    chrome.storage.local.set({ words });
  });
}

export {
  storeSelectedWordLocally,
  storeFetchedWordsLocally,
  deleteAWordLocally,
};
