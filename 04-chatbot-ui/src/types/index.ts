// 自定义的消息类型
export type ChatMessage = {
  type: "user" | "assistant";
  partial?: boolean;
  payload: {
    content: string;
  };
};
