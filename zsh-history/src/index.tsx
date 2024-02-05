import { Action, ActionPanel, List } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { readFileSync } from "fs";

export interface HistoryItem {
  beginTime: Date;
  elapsedSeconds: number;
  command: string;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [page, setPage] = useState<number>(1);
  const [size, setSize] = useState<number>(100);
  const [searchText, setSearchText] = useState<string>("");

  const filteredHistoryList = useMemo(() => {
    return historyList.filter((item) => item.command.includes(searchText));
  }, [historyList, page, size, searchText]);
  const totalPage = useMemo(() => {
    return Math.ceil(filteredHistoryList.length / size);
  }, [filteredHistoryList, size])

  const handleSearchTextChange = (text: string) => {
    setSearchText(text);
  }
  const handlePreviousPage = () => {
    if (page <= 1) return;
    setPage(page - 1);
  }
  const handleNextPage = () => {
    if (page >= totalPage) return;
    setPage(page + 1);
  }

  useEffect(() => {
    const data = readFileSync(`${process.env.HOME}/.zsh_history`, "utf-8");
    if (!data) return;

    const commandSet = new Set<string>();
    const items = data.trim().split(": ").reverse().map((item) => {
      const firstColonIndex = item.indexOf(":");
      const firstSemicolonIndex = item.indexOf(";");
      if (firstColonIndex === -1 || firstSemicolonIndex === -1) return null;

      const beginTime = new Date(parseInt(item.slice(0, firstColonIndex).trim(), 10) * 1000);
      const elapsedSeconds = parseInt(item.slice(firstColonIndex + 1, firstSemicolonIndex).trim(), 10);
      const command = item.slice(firstSemicolonIndex + 1).trim();

      if (commandSet.has(command)) return null;
      commandSet.add(command);

      return {
        beginTime,
        elapsedSeconds,
        command
      };
    }).filter((item) => !!item) as HistoryItem[];

    setHistoryList(items);
    setIsLoading(false);
  }, []);

  return (
    <List navigationTitle={`Show Zsh History【${page}/${totalPage}】(total: ${filteredHistoryList.length})`} isShowingDetail isLoading={isLoading} onSearchTextChange={handleSearchTextChange}>
      {
        filteredHistoryList.slice((page - 1) * size, page * size).map((item, index) => {
          return (
            <List.Item
              key={index}
              title={item.command}
              subtitle={item.beginTime.toLocaleString()}
              detail={
                <List.Item.Detail markdown={item.command} />
              }
              actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Command" content={item.command} />
                <Action title="Previous Page" onAction={handlePreviousPage} shortcut={{
                  modifiers: ["ctrl"],
                  key: "u"
                }} />
                <Action title="Next Page" onAction={handleNextPage} shortcut={{
                  modifiers: ["ctrl"],
                  key: "d"
                }} />
              </ActionPanel>
              }
            />
          )
        })
      }
    </List>
  );
}
