import { HumanMessage } from "@langchain/core/messages";
import { context } from "./context";
import { llm } from "./llm";
import { tools } from "./tools";
import { ChatMessage } from "../src/types";
import { executeToolCalls, isToolCall } from "./utils";

export type StreamOptions = {
  signal: AbortSignal;
  query: string;
};

export async function* stream(
  options: StreamOptions
): AsyncGenerator<ChatMessage> {
  const { signal, query } = options;

  // 给模型绑定可用工具
  const llmWithTools = llm.bindTools(tools);

  // 添加用户消息到上下文
  context.push(new HumanMessage(query));

  // agent loop
  while (true) {
    // 调用模型
    // 简单起见使用同步调用（invoke），应该为流式调用（stream）
    const response = await llmWithTools.invoke(context, {
      signal,
      tool_choice: "auto",
    });

    // 判断是否为工具调用
    if (isToolCall(response)) {
      // 通知前端展示工具调用
      for (const item of response.tool_calls) {
        yield {
          type: "tool_call",
          payload: {
            id: item.id!,
            name: item.name,
            args: item.args,
          },
        };
      }

      // 添加工具调用到上下文
      context.push(response);

      // 执行工具调用
      const toolMessages = await executeToolCalls(tools, response.tool_calls!);

      // 添加工具调用结果到上下文
      context.push(...toolMessages);

      // 通知前端展示工具调用
      for (const item of toolMessages) {
        yield {
          type: "tool_result",
          payload: {
            tool_call_id: item.tool_call_id,
            name: item.name!,
            content: item.content.toString(),
          },
        };
      }

      continue;
    }

    // 返回模型回复
    yield {
      type: "assistant",
      partial: false,
      payload: {
        content: response.content.toString(),
      },
    };

    // 添加模型回复到上下文
    context.push(response);
    break;
  }
}
