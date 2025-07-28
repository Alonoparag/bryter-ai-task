import { Chroma } from "@langchain/community/vectorstores/chroma";
import { WrappedOpenAIEmbeddings } from "./utils.mts";
import { ChatGroq } from "@langchain/groq";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const VERBOSITY = process.env.VERBOSITY === "true";

/**
 * Returns a summary of relevant pages for a given user input.
 * @param userInput - The user input to retrieve relevant pages for
 * @returns A summary of relevant pages for the given user input
 */

async function retrieveSummarizedRelevantPages(userInput: string): Promise<string> {
    const summarizerModel = new ChatGroq({ 
        apiKey: process.env.GROQ_API_KEY,
        model: process.env.GROQ_CHAT_MODEL_NAME ?? "llama-3.3-70b-versatile",
        verbose: VERBOSITY,
        temperature: 0.0,
      });
      
    const embeddings = new WrappedOpenAIEmbeddings(
        process.env.EMBEDDING_MODEL_NAME ?? "text-embedding-3-large",
        process.env.OPENAI_API_KEY || "",
    );
    
    const chromaVectorRetriever = new Chroma(
      embeddings,
      {
          url: "http://localhost:8000",
          collectionName: "pathfinder_rule_book",
      }
    ).asRetriever({
      k: 5,
      verbose: VERBOSITY,
    });
    if (VERBOSITY) {
      console.debug("--------------------------------");
      console.debug("Retrieving relevant pages for user input: ", userInput);
    }
    return await chromaVectorRetriever.invoke(userInput)
    .then((results) => results.map((result) => result.metadata.pageMarkdown))
    .then(async (summaries) => {
        const instructions = [
            {
                role: "system",
                content: "your task is to summarize data for a language model according to a user input to that model."+
                "Keep neutral and factual language and do not add any other information to the summary."
                },
    {role: "assistant",
            content: summaries.join("\n")
            },
            {role: "user",
            content: userInput}
        ];
        if (VERBOSITY) {
        console.debug("--------------------------------");
        console.debug("Summarizing relevant pages for user input: ", userInput);
        }
        return await summarizerModel.invoke(instructions);
    })
    .then((result) => result.content as string);
}

export const retrievealTool = tool(
    async ({ userInput }: { userInput: string }) => {
        return await retrieveSummarizedRelevantPages(userInput);
    },
    {
        name: "retrieval",
        description: "Retrieves a summary of top 4 relevant pages from the vector database",
        schema: z.object({
            userInput: z.string().describe("The user input to retrieve relevant pages for"),
        }),
    }
)