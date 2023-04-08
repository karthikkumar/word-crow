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
  if (words.length > 10) {
    chrome.storage.local.set({ words: [...words].splice(10) });
  }
}

export { storeSelectedWordLocally, storeFetchedWordsLocally };
