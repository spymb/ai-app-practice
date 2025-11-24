import { ChatOpenAI } from "@langchain/openai";

// 取得调用模型 API 的必要参数
const MODEL = process.env.MODEL_NAME;
const BASE_URL = process.env.BASE_URL;
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("请在 .env 中设置 API_KEY");
}

// 创建 LangChain 模型实例
export const llm = new ChatOpenAI({
  model: MODEL,
  configuration: {
    baseURL: BASE_URL,
    apiKey: API_KEY,
  },
  streaming: true,
});
