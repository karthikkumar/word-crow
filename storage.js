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

export { storeSelectedWordLocally };
