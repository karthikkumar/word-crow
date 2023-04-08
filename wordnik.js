async function fetchDefinition(word) {
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
      console.error("Error fetching definition:", error);
    });
  return result || { word };
}

export { fetchDefinition };
