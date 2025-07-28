import { AIMessage, type AIMessageChunk } from "@langchain/core/messages";
import { IterableReadableStream } from "@langchain/core/utils/stream";
import { OpenAIEmbeddings } from "@langchain/openai";
import { marked } from "marked";

export class WrappedOpenAIEmbeddings extends OpenAIEmbeddings {
    constructor(model: string, apiKey: string) {
        super({ model, apiKey });
      }
    
    async embedQuery(query: string) {
      const embedding = await super.embedQuery(query);
      return [embedding] as any;
    }
  }

export enum ColorEnum {
Green = "\x1b[32m",
Yellow = "\x1b[33m",
Reset = "\x1b[0m",
}

export const printBox = (role: string, color: ColorEnum, content: string) => {
  const title = ` ${role} `;
  const borderLen = title.length + 2; // two extra paddings inside box
  const top = `${color}┌${"─".repeat(borderLen)}┐${ColorEnum.Reset}`;
  const middle = `${color}│${title}│${ColorEnum.Reset}`;
  const bottom = `${color}└${"─".repeat(borderLen)}┘${ColorEnum.Reset}`;

  console.log(top);
  console.log(middle);
  console.log(bottom);
  console.log(marked(content));
};

export const sleep = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

export async function printAssistantTypewriter(responseStream: IterableReadableStream<AIMessageChunk>): Promise<AIMessage> {
  const title = ` Assistant `;
  const borderLen = title.length + 2;
  const top = `${ColorEnum.Yellow}┌${"─".repeat(borderLen)}┐${ColorEnum.Reset}`;
  const middle = `${ColorEnum.Yellow}│${title}│${ColorEnum.Reset}`;
  const bottom = `${ColorEnum.Yellow}└${"─".repeat(borderLen)}┘${ColorEnum.Reset}`;

  console.log(top);
  console.log(middle);
  console.log(bottom);
  const messageContents: string[] = [];
  let lastChunk: AIMessageChunk | undefined;
  for await (const chunk of responseStream) {
    const content = chunk[0].content;
    messageContents.push(content);
    lastChunk = chunk;
    if (!content) {
      continue;
    }
    process.stdout.write(content as string);
    await sleep(75);
  }
  process.stdout.write("\n");
  const fullcontent = messageContents.reduce(
    (acc, chunk) => {
      return acc + chunk;
    },
    "",
  );
  return new AIMessage({
    content: fullcontent,
    tool_calls: lastChunk ? lastChunk[0].tool_calls : [],
  });
};
