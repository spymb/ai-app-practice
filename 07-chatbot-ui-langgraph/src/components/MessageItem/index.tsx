import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "github-markdown-css/github-markdown.css";
import { SearchIcon, GlobeIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage, WebsearchResult } from "@/types";
import { useState } from "react";

export interface MessageItemProps {
  message: ChatMessage;
}

const UserMessage = (props: { content: string }) => {
  return (
    <p className="rounded-full bg-neutral-100 px-4 py-1.5">{props.content}</p>
  );
};

const AssistantMessage = (props: { content: string }) => {
  return (
    <div className="markdown-body">
      <Markdown remarkPlugins={[remarkGfm]}>{props.content}</Markdown>
    </div>
  );
};

const WebsearchKeywordsMessage = (props: { keywords: string }) => {
  return (
    <div className="flex items-center gap-2 truncate rounded-full bg-neutral-100 px-4 py-1.5">
      <SearchIcon className="shrink-0" size={18} />
      <span className="truncate">
        正在搜索：
        <span className="text-sm text-gray-500">{props.keywords}</span>
      </span>
    </div>
  );
};

const WebsearchResultsMessage = (props: { searchResults: WebsearchResult }) => {
  const { searchResults } = props;
  const [showAll, setShowAll] = useState(false);

  const displayedResults = showAll ? searchResults : searchResults.slice(0, 5);

  return (
    <div className="flex flex-col gap-1 rounder-xl bg-neutral-100 py-3">
      {/* 结果标题 */}
      <p className="flex items-center gap-2 px-4 font-medium">
        <GlobeIcon size={18} />
        已搜索 {searchResults.length} 条结果
      </p>

      {/* 结果列表 */}
      <div className="flex flex-col">
        {displayedResults.map((result, index) => (
          <a
            href={result.link}
            target="_blank"
            key={index}
            className="mx-2 flex flex-col gap-1 rounded-md p-2 hover:bg-neutral-200"
          >
            <p className="font-medium">{result.title}</p>
            <p className="line-clamp-2 text-sm">{result.description}</p>
          </a>
        ))}
      </div>

      {/* 展开收起 */}
      <div className="mt-1 flex justify-center">
        <span
          className="cursor-pointer text-sm text-gray-500"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? "收起" : "展开所有"}
        </span>
      </div>
    </div>
  );
};

function MessageItem(props: MessageItemProps) {
  const { message } = props;

  const isUserMessage = message.type === "user";

  return (
    <div className={cn("flex", isUserMessage && "justify-end")}>
      {isUserMessage && <UserMessage {...message.payload} />}

      {message.type === "assistant" && (
        <AssistantMessage {...message.payload} />
      )}

      {message.type === "websearch-keywords" && (
        <WebsearchKeywordsMessage {...message.payload} />
      )}

      {message.type === "websearch-results" && (
        <WebsearchResultsMessage {...message.payload} />
      )}
    </div>
  );
}

export default MessageItem;
