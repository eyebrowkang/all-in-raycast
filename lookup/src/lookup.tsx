import { List, ActionPanel, Action, Detail } from "@raycast/api";
import { useState, useEffect } from "react";
import { getDefinitions } from "./services/vocabulary";

interface HistoryItem {
  word: string;
  definition: string;
}

export default function Command() {
  const [word, setWord] = useState<string>("");
  const history: HistoryItem[] = [];

  return (
    <List isShowingDetail onSearchTextChange={setWord}>
      {word && (
        <List.Item
          title={word}
          actions={
            <ActionPanel>
              <Action.Push title="Lookup" target={<DefinitionView word={word} />} />
            </ActionPanel>
          }
        />
      )}
      {history.map((historyItem) => (
        <List.Item
          key={historyItem.word}
          title={historyItem.word}
          detail={<List.Item.Detail markdown={historyItem.definition} />}
          actions={
            <ActionPanel>
              <Action.Push title="Lookup" target={<DefinitionView word={historyItem.word} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

interface DefinitionProps {
  word: string;
}

function DefinitionView(props: DefinitionProps) {
  const [explanation, setExplanation] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const lookupWord = async (word: string) => {
      setIsLoading(true);
      const result = await getDefinitions(word);
      setExplanation(result);
      setIsLoading(false);
    };

    lookupWord(props.word.trim());
  }, []);

  return <Detail isLoading={isLoading} markdown={explanation} />;
}
