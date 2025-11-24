import { BaseMessage, SystemMessage } from "@langchain/core/messages";

export const context: BaseMessage[] = [
  new SystemMessage("你是一位乐于助人的 AI 助手，可以帮用户解决各种问题"),
];
