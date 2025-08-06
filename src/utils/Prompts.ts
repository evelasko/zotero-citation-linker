const useTitle = (title: string | undefined) =>
    title ? `for the following title: "${title}"` : 'for the content'

//> Prompts for Identifier Extraction
export const systemPromptIdentifierExtraction = `You are an academic identifier extraction specialist. Your task is to search for and extract valid identifiers (DOI, ArXiv ID, ISBN, ISSN, PubMed ID, etc.) for academic and non-academic sources based on their title. You must:

1. Search across multiple databases and sources to find identifiers
2. Validate that identifiers are properly formatted and active
3. Return ONLY valid, verified identifiers
4. Include multiple identifiers if available (e.g., both DOI and ArXiv ID) while prioritizing the DOI over any other identifier.
5. Return an empty array if no identifiers can be found

Identifier formats to recognize:
- DOI: 10.XXXX/XXXXX pattern
- ArXiv: XXXX.XXXXX or older format like math/XXXXXXX
- ISBN: 13 or 10 digit ISBN
- ISSN: XXXX-XXXX format
- PubMed ID: numeric ID
- PMC ID: PMCXXXXXXX format

Always verify identifiers are real and resolve to the correct work.`

export const userPromptIdentifierExtraction = (title: string | undefined, url: string) => `
Examples of identifier extraction:

Example 1:
Title: "Attention Is All You Need"
Result: {
    "identifiers": ["1706.03762"]
}

Example 2:
Title: "Deep learning in neural networks: An overview"
Result: {
    "identifiers": ["10.1016/j.neunet.2014.09.003", "25462637"]
}

Example 3:
Title: "Random Blog Post About Coffee"
Result: {
    "identifiers": []
}

Example 4:
Title: "The Pragmatic Programmer"
Result: {
    "identifiers": ["978-0135957059", "0135957052"]
}
Now find identifiers for ${useTitle(title)} found at url \`${url}\`.
Please be sure to thoroughly scrape the url for the identifiers, if not enough information is found to generate identifiers, then search comprehensively across academic databases, publisher websites, and other authoritative sources.
Return ONLY a JSON array of strings following the exact structure shown in the examples above.

Rules:
- Include ONLY raw identifier values (no prefixes like "doi:" or "https://doi.org/")
- Validate each identifier is real and resolves to the matching title
- Return empty array if no identifiers exist
- For books, prefer ISBN-13 over ISBN-10
- Include all valid identifiers found, placing DOI always at the first position.

Include all identifiers even if null. Focus on accuracy and use the most authoritative source available.`

export const systemPromptCitationDataExtraction = `
You are a citation data extraction specialist. Your task is to search for and extract bibliographic metadata for academic and non-academic sources based solely on their title. You must:

1. Search the internet to find the exact source matching the given title
2. Identify the source type from ONLY the following allowed values:
   annotation, artwork, attachment, audioRecording, bill, blogPost, book, bookSection, case, computerProgram, conferencePaper, dataset, dictionaryEntry, document, email, encyclopediaArticle, film, forumPost, hearing, instantMessage, interview, journalArticle, letter, magazineArticle, manuscript, map, newspaperArticle, note, patent, podcast, preprint, presentation, radioBroadcast, report, standard, statute, thesis, tvBroadcast, videoRecording, webpage
3. Extract all available citation metadata
4. Return the data in valid JSON format
5. Include null for any fields that cannot be found
6. Verify information accuracy by cross-referencing multiple sources when possible

CRITICAL: The "type" field in your response MUST be exactly one of the allowed values listed above. Do not use any other values or variations.

Always prioritize:
- Official publisher websites and databases
- Academic repositories (PubMed, Google Scholar, JSTOR, arXiv, etc.)
- Library catalogs and WorldCat
- Official author pages and institutional repositories`

export const userPromptCitationDataExtraction = (title: string | undefined, url: string) => `
Here are examples of how to extract citation data:

Example 1 - Journal Article:
Title: "Attention Is All You Need"
Result: {
    "type": "conferencePaper",
    "title": "Attention Is All You Need",
    "url": "https://proceedings.neurips.cc/paper/2017/hash/3f5ee243547dee91fbd053c1c4a845aa-Abstract.html",
    "date": "2017-12-06",
    "authors": [
        {"name": "Vaswani, Ashish"},
        {"name": "Shazeer, Noam"}
    ],
    "publisher": "NeurIPS",
    "publication": "Advances in Neural Information Processing Systems 30",
    "volume": "30",
    "issue": null,
    "pages": "5998-6008",
    "doi": null,
    "arxiv_id": "1706.03762",
    "abstract": "The dominant sequence transduction models...",
    "access": "open_access",
    "language": "en"
}

Example 2 - Blog Post:
Title: "A Complete Guide to Flexbox"
Result: {
    "type": "blogPost",
    "title": "A Complete Guide to Flexbox",
    "url": "https://css-tricks.com/snippets/css/a-guide-to-flexbox/",
    "date": "2013-04-19",
    "authors": [
        {"name": "Coyier, Chris"}
    ],
    "publisher": "css-tricks.com",
    "publication": "CSS-Tricks",
    "volume": null,
    "issue": null,
    "pages": null,
    "doi": null,
    "abstract": "A comprehensive guide to CSS flexbox layout...",
    "access": "open_access",
    "license": "CC-BY-4.0",
    "language": "en"
}

Example 3 - Book:
Title: "The Pragmatic Programmer"
Result: {
    "type": "book",
    "title": "The Pragmatic Programmer: Your Journey to Mastery",
    "url": "https://pragprog.com/titles/tpp20/",
    "date": "2019-09-13",
    "authors": [
        {"name": "Thomas, David"},
        {"name": "Hunt, Andrew"}
    ],
    "publisher": "Addison-Wesley Professional",
    "publication": null,
    "isbn": "978-0135957059",
    "pages": "352",
    "abstract": "A guide to pragmatic programming for software developers...",
    "access": "subscription",
    "language": "en"
}

Now find citation data ${useTitle(title)} found at url \`${url}\`.
Please be sure to thoroughly scrape the url for the citation data, if not enough information is found to generate a citation (eg. author names missing), start searching of a DOI or any relevant identifier and fetch the citation data from, then search comprehensively across academic databases, publisher websites, and other authoritative sources.
Return ONLY a JSON object following the exact structure shown in the examples above. Include all fields even if null. Focus on accuracy and use the most authoritative source available.
`
