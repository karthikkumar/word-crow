async function fetchDefinition(word) {
  const proxyURL = "https://wordnik-proxy-cjsf2syxhq-em.a.run.app";
  const limit = 10;
  const params = `limit=${limit}&includeRelated=false&useCanonical=false&includeTags=false`;
  const sourceDictionaries = "ahd,wordnet";
  const url = `${proxyURL}/word.json/${word}/definitions?${params}&sourceDictionaries=${sourceDictionaries}`;
  const result = await fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Error response from Wordnik Proxy. Try URL: " + url);
      }
      return response.json();
    })
    .then((data) => {
      if (data?.length > 0) {
        // Sort the definitions by their score, if available
        const sortedDefinitions = data
          .filter(({ text }) => !!text)
          .sort((a, b) => (b.score || 0) - (a.score || 0));
        // Get the best definition (the first item in the sorted array)
        const bestDefinition = sortedDefinitions[0];
        return { word, definition: data[0].text };
      }
    })
    .catch((error) => {
      console.error("Error fetching definition:", error);
    });
  return result
    ? { word, definition: result.definition }
    : { word, definition: "" };
}

export { fetchDefinition };
