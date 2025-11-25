import { BaseMessage } from "@langchain/core/messages";
import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { llm } from "./llm";
import { tools } from "./tools";
import { isToolCall, last } from "./utils";

const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
});

type State = typeof GraphState.State;

const start = async (state: State) => {
  const { messages } = state;

  // 给模型绑定可用工具
  const llmWithTools = llm.bindTools(tools);

  const response = await llmWithTools.invoke(messages, { tool_choice: "auto" });

  return { messages: [response] };
};

/**
 * 工具调用前处理节点
 * 1. 判断是不是工具调用
 * 2. 将工具调用消息路由到 tools 节点，否则直接结束
 */
const beforeToolCall = (state: State) => {
  const lastMessage = last(state.messages);

  if (isToolCall(lastMessage)) {
    return "tools";
  }

  return END;
};

/**
 * 工具调用后处理节点，非必须
 */
const afterToolCall = (state: State) => {
  return "start";
};

export const createGraph = () => {
  const graph = new StateGraph(GraphState);

  graph
    // nodes
    .addNode("start", start)
    // ToolNode 内部会取出 messages 中的工具调用，执行工具调用后，再将结果追加到 messages 字段上
    .addNode("tools", new ToolNode(tools))
    // edges
    .addEdge(START, "start")
    .addConditionalEdges("start", beforeToolCall)
    .addConditionalEdges("tools", afterToolCall);

  return graph.compile();
};
