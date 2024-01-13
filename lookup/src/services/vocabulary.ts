import axios from "axios";
import { load as cheerioLoad } from "cheerio";

type DefinitionFunc = (word: string) => Promise<string>;

const headers: Record<string, string> = {
  "User-Agent": "Raycast Lookup",
};

const COUNTRY_FLAG_DICT: Record<string, string> = {
  "us-flag-icon": "\u{1f1fa}\u{1f1f8}",
  "uk-flag-icon": "\u{1f1ec}\u{1f1e7}",
};

export const getDefinitions: DefinitionFunc = async (word: string) => {
  let markdownStr = "";
  try {
    const { data: htmlContent } = await axios.get<string>(`https://www.vocabulary.com/dictionary/${word}`, {
      headers,
    });
    const $ = cheerioLoad(htmlContent);
    const wordArea = $("#pageContent .definition-columns .word-area");
    let ipaStr = "";
    wordArea.find(".ipa-section .ipa-with-audio").each((_, el) => {
      const children = $(el).children();
      const country = children.first().attr("class") || "";
      const flag = COUNTRY_FLAG_DICT[country];
      const ipa = children.last().text().trim();
      ipaStr += `&nbsp;${flag}&nbsp;${ipa}&nbsp;`;
    });
    let wordFormsStr = "Other forms:";
    wordArea.find(".word-forms b").each((_, el) => {
      const form = $(el).text().trim();
      wordFormsStr += `&nbsp;**${form}**`;
    });
    const shortStr = wordArea.find(".short").first().text().trim();
    const longStr = wordArea.find(".long").first().text().trim();

    let definitionStr = "";
    const wordDefinition = $("#pageContent .definition-columns .col-1 .word-definitions").first();
    wordDefinition.find("ol > li > .definition").each((_, el) => {
      el.children.forEach((childNode) => {
        switch (childNode.nodeType) {
          case 1:
            definitionStr += `***${$(childNode).text().trim()}***&nbsp;`;
            break;
          case 3:
            definitionStr += `${childNode.nodeValue.trim()}\n\n`;
            break;
          default:
            console.error("Unrecognized node type");
        }
      });
    });

    markdownStr = `## ${word}\n${ipaStr}\n\n${wordFormsStr}\n\n${shortStr}\n\n${longStr}\n\n${definitionStr}`;
  } catch (e) {
    markdownStr = "# Error";
    console.error(e);
  }

  return markdownStr;
};
