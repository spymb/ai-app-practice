import express, { type Request, type Response } from "express";
import {
  AIMessage,
  AIMessageChunk,
  HumanMessage,
  ToolMessage,
} from "@langchain/core/messages";

import { context } from "./context";
import * as agent from "./agent";
import { isToolCall } from "./utils";

// 和前端共享的
// 自定义的消息类型
import type { ChatMessage } from "../src/types";

const app = express();

// 添加 JSON 请求体解析中间件
app.use(express.json());

const sseHandler = async (req: Request, res: Response) => {
  let query = "";
  let websearch = false;

  if (req.method === "GET") {
    query = req.query.query as unknown as string;
    websearch = req.query.websearch === "true";
  }

  if (req.method === "POST") {
    query = req.body.query;
    websearch = req.body.websearch;
  }

  const abortController = new AbortController();

  // 执行 agent
  const stream = agent.stream({
    signal: abortController.signal,
    query,
  });

  // 设置 SSE 响应头
  res.setHeader("Content-Type", "text/event-stream; chartset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // 提前发送响应头
  res.flushHeaders();

  // 如果客户端断开连接，则取消模型请求
  req.on("end", () => {
    // 这会让下面的 for await 循环抛出 Error: Aborted 异常
    abortController.abort();
  });

  // 接收模型流式响应
  try {
    for await (const message of stream) {
      // 发送给前端
      res.write(`data: ${JSON.stringify(message)}\n\n`);
    }
  } catch (error) {
    // 在此处理前端的主动中断动作
    console.error(error);
  }

  // 最后发送一个 close 事件，触发前端 EventSource 的自定义 close 事件，
  // 该事件必须通过 EventSource.addEventListener('close') 添加。
  // 这里必须带一个 data: 否则前端的自定义 close 事件不会触发，原因是：
  // 前端的自定义事件会在 message 事件触发后再触发。
  res.send("event: close\ndata:\n\n");
};

/**
 * 历史消息查询接口
 */
app.get("/history", (req, res) => {
  const messages: ChatMessage[] = [];
  // 把 langchain 的 BaseMessage 转换为前端的 ChatMessage
  for (const message of context) {
    if (message instanceof HumanMessage) {
      messages.push({
        type: "user",
        payload: { content: message.content.toString() },
      });
    }

    if (message instanceof AIMessageChunk) {
      if (isToolCall(message)) {
        for (const item of message.tool_calls) {
          messages.push({
            type: "tool_call",
            payload: {
              id: item.id!,
              name: item.name,
              args: item.args,
            },
          });
        }
      }
    } else {
      messages.push({
        type: "assistant",
        payload: { content: message.content.toString() },
      });
    }

    if (message instanceof ToolMessage) {
      messages.push({
        type: "tool_result",
        payload: {
          tool_call_id: message.tool_call_id!,
          name: message.name!,
          content: message.content.toString(),
        },
      });
    }
  }

  res.json(messages);
});

/**
 * 全量上下文查询接口（方便调试）
 */
app.get("/context", (req, res) => {
  res.json(context);
});

/**
 * SSE 通信接口（EventSource GET 版本）
 */
app.get("/sse", sseHandler);

/**
 * SSE 通信接口（fetch POST 版本）
 */
app.post("/sse", sseHandler);

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
