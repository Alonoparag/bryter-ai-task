process.env.GROQ_API_KEY = "";

import { ChatGroq } from "@langchain/groq"
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import {
  type BaseMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { StateGraph, Annotation } from "@langchain/langgraph";

const agentTools = [];
const agentModel = new ChatGroq({ 
  apiKey: process.env.GROQ_API_KEY,
  model: "llama-3.3-70b-versatile" 
});

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


const graphBuilder = new StateGraph(StateAnnotation);

const invokeAndPrint = async (state: typeof StateAnnotation.State) => {
  const agentNextState = await agent.invoke(
    { messages: state.messages },
    { configurable: { thread_id: "42" } },
  );

  console.log(agentNextState.messages.at(-1)?.content)

  return {
    messages: agentNextState.messages,
    sentiment: "positive",
  };
};

const graph = graphBuilder
  .addNode("invokeAndPrint", invokeAndPrint)
  .addEdge("__start__", "invokeAndPrint")
  .addEdge("invokeAndPrint", "__end__")
  .compile();

await graph.invoke({ messages: [
  new SystemMessage("Reply like an old-timey pirate."),
  new HumanMessage("How are you?")
] });
