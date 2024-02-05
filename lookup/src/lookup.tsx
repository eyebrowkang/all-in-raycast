import {
  List,
  ActionPanel,
  Action,
  Detail,
  LocalStorage,
  Icon,
  confirmAlert,
  Alert,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import { fetchDefinition } from "./services/vocabulary";

interface Preferences {
  maxHistoryItem: string;
}
const MAX_HISTORY_ITEM = getMaxHistoryItem();

function getMaxHistoryItem(): number {
  const preferences = getPreferenceValues<Preferences>();
  const { maxHistoryItem } = preferences;
  const num = parseInt(maxHistoryItem, 10);
  if (isNaN(num) || num <= 0) {
    return 200;
  }
  return num;
}

interface HistoryItem {
  word: string;
  definition: string;
  createdAt: number;
  updatedAt: number;
}

export default function Command() {
  const [word, setWord] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const showInputWordItem = useMemo(() => {
    return word && !history.some((item) => item.word === word);
  }, [word, history]);
  const filteredHistory = useMemo(() => {
    return history.filter((item) => item.word.includes(word));
  }, [word, history]);

  const syncHistory = async () => {
    setIsLoading(true);
    const historyItems = await getSortedHistoryItems();
    setHistory(historyItems);
    setIsLoading(false);
  };

  useEffect(() => {
    syncHistory();
  }, []);

  return (
    <List
      navigationTitle={`Lookup${history.length ? " ( " + history.length + " items )" : ""}`}
      isLoading={isLoading}
      isShowingDetail
      onSearchTextChange={(text) => setWord(text.trim())}
    >
      {showInputWordItem && (
        <List.Item key={word} title={word} actions={<ListItemActionPanel word={word} cleanup={syncHistory} />} />
      )}
      {filteredHistory.map((historyItem) => (
        <List.Item
          key={historyItem.word}
          title={historyItem.word}
          subtitle={new Date(historyItem.updatedAt).toLocaleString()}
          detail={<List.Item.Detail markdown={historyItem.definition} />}
          actions={
            <ListItemActionPanel word={historyItem.word} definition={historyItem.definition} cleanup={syncHistory} />
          }
        />
      ))}
    </List>
  );
}

interface DefinitionProps {
  word: string;
  definition?: string;
  cleanup: () => void;
}
interface ListItemActionPanelProps extends DefinitionProps {}
function ListItemActionPanel(props: ListItemActionPanelProps) {
  const { word, definition, cleanup } = props;

  return (
    <ActionPanel>
      <Action.Push
        title="Lookup"
        icon={Icon.MagnifyingGlass}
        target={<DefinitionView word={word} definition={definition} cleanup={cleanup} />}
      />
      <Action
        title="Delete Entry"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={{ modifiers: ["ctrl"], key: "x" }}
        onAction={async () => {
          await LocalStorage.removeItem(word);
          cleanup();
        }}
      />
      <Action
        title="Delete All Entries"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
        onAction={async () => {
          await confirmAlert({
            title: "Delete All",
            icon: Icon.Trash,
            message: "Are you sure you want to delete all entries?",
            primaryAction: {
              title: "Delete All",
              style: Alert.ActionStyle.Destructive,
              onAction: async () => {
                await LocalStorage.clear();
                cleanup();
              },
            },
          });
        }}
      />
    </ActionPanel>
  );
}

function DefinitionView(props: DefinitionProps) {
  const { word, definition: definitionCache, cleanup } = props;

  const [definition, setDefinition] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const getDefinition = async (word: string) => {
    setIsLoading(true);
    if (!definitionCache) {
      const result = await fetchDefinition(word);
      if (result) {
        setDefinition(result);
        addHistoryItem(word, result);
      } else {
        // cross mark "❌" (U+274C).
        setDefinition(`# ${word}\n\n## \u{274c} No definition found.`);
      }
    } else {
      setDefinition(definitionCache);
      updateHistoryItem(word);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    getDefinition(word);

    return () => {
      cleanup();
    };
  }, []);

  return <Detail navigationTitle={word} isLoading={isLoading} markdown={definition} />;
}

async function getSortedHistoryItems(): Promise<HistoryItem[]> {
  const all = await LocalStorage.allItems();
  const parsedItems = Object.values(all).map((value) => JSON.parse(value)) as HistoryItem[];
  return parsedItems.sort((a, b) => b.updatedAt - a.updatedAt);
}

async function addHistoryItem(word: string, definition: string): Promise<void> {
  const historyItems = await getSortedHistoryItems();
  while (historyItems.length >= MAX_HISTORY_ITEM) {
    const { word } = historyItems.pop()!;
    await LocalStorage.removeItem(word);
  }
  const value = JSON.stringify({
    word,
    definition,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  await LocalStorage.setItem(word, value);
}

async function updateHistoryItem(word: string): Promise<void> {
  const value = await LocalStorage.getItem<string>(word);
  if (value) {
    const item = JSON.parse(value) as HistoryItem;
    item.updatedAt = Date.now();
    await LocalStorage.setItem(word, JSON.stringify(item));
  }
}
