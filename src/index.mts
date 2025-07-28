import "dotenv/config";
import { ChatGroq } from "@langchain/groq"
import { marked } from "marked";
import TerminalRenderer from "marked-terminal";
import { END, MemorySaver, START } from "@langchain/langgraph";
import { createReactAgent, ToolNode } from "@langchain/langgraph/prebuilt";
import {
  AIMessageChunk,
  type BaseMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { StateGraph, Annotation } from "@langchain/langgraph";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { ColorEnum, printBox, printAssistantTypewriter } from "./utils.mts";
import { retrievealTool } from "./tools.mts";
import { IterableReadableStream } from "@langchain/core/utils/stream";


const VERBOSITY = process.env.VERBOSITY === "true";
marked.setOptions({ renderer: new TerminalRenderer() });

const agentTools = [
  retrievealTool
];

const agentModel = new ChatGroq({ 
  apiKey: process.env.GROQ_API_KEY,
  model: process.env.GROQ_CHAT_MODEL_NAME ?? "llama-3.3-70b-versatile",
  verbose: VERBOSITY,
}).bindTools(agentTools);

const toolNode = new ToolNode(agentTools);


const agentCheckpointer = new MemorySaver();
const agent = createReactAgent({
  llm: agentModel,
  tools: agentTools,
  checkpointSaver: agentCheckpointer,
});

const StateAnnotation = Annotation.Root({
  sentiment: Annotation<string>,
  messages: Annotation<BaseMessage[]>({
    reducer: (left: BaseMessage[], right: BaseMessage | BaseMessage[]) => {
      if (Array.isArray(right)) {
        return left.concat(right);
      }
      return left.concat([right]);
    },
    default: () => [],
  }),
});

function shouldCallTools(state: typeof StateAnnotation.State): string {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];
  if ('tool_calls' in lastMessage && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls?.length) {
    return "tools";
  }
  return END;
}

const graphBuilder = new StateGraph(StateAnnotation);

const callAgent = async (state: typeof StateAnnotation.State) => {
  if (VERBOSITY) {
    console.debug("--------------------------------");
    console.debug("Calling agent with state: ", state);
  }
  const agentNextState = await agent.invoke(
    { messages: state.messages },
    { configurable: { thread_id: "42" } },
  );

  const lastAI = agentNextState.messages.at(-1);
  if (lastAI && 'tool_calls' in lastAI && Array.isArray((lastAI as any).tool_calls) && (lastAI as any).tool_calls.length) {
    // Find the most recent human message content
    const lastHuman = [...agentNextState.messages].reverse().find((m) => m instanceof HumanMessage) as HumanMessage | undefined;
    const humanContent = lastHuman?.content ?? "your request";
    printBox(`Thinking about ${humanContent}`, ColorEnum.Yellow, "");
  }
  return {
    messages: agentNextState.messages,
    sentiment: "positive",
  }
};

const graph = graphBuilder
  .addNode("agent", callAgent)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldCallTools, ["tools", END])
  .addEdge("tools", "agent")
  .compile();

// Interactive CLI loop

const state: typeof StateAnnotation.State = {
  messages: [],
  sentiment: "neutral",
};
state.messages.push(
  new SystemMessage(
    'You are an agent with knowledge about the pathfinder RPG.'+
    'You are able to answer questions about the game and help with tasks.'+
    'You are also able to use tools to get more information.'+
    'If you do not sure about the answer or receive an error from the tool do not make up an answer.'+
    'Answer the user\'s question'
  )
);
const rl = readline.createInterface({ input, output });
while (true) {
  const userInput = await rl.question(`${ColorEnum.Green}You:${ColorEnum.Reset} `);
  // Print user's message in a green banner
  printBox("(enter `exit` to quit)\nYou: ", ColorEnum.Green, userInput);
  if (userInput.trim().toLowerCase() === "exit") {
    console.log("Goodbye!");
    rl.close();
    break;
  }
  
  state.messages.push(new HumanMessage(userInput));

  const responseStream = await graph.stream(state, {
    streamMode: "messages",
  });
  const response = await printAssistantTypewriter(responseStream as unknown as IterableReadableStream<AIMessageChunk>);
  state.messages.push(response);
}
