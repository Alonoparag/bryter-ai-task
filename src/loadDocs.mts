import { OpenAIEmbeddings } from "@langchain/openai";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { readFile } from "fs/promises";
import "dotenv/config";


const embeddings = new OpenAIEmbeddings({
    model: process.env.EMBEDDING_MODEL_NAME ?? "text-embedding-3-large",
    apiKey: process.env.OPENAI_API_KEY,
    batchSize: 10,
});

let docsPath: string | undefined;

if (process.argv.length > 2) {
    docsPath = process.argv[2];
} 
if (!docsPath) {
    console.error("No docs path provided");
    process.exit(1);
}

const docs = await readFile(docsPath, "utf8")
    .then(JSON.parse)
    .then((data) => data.pages)
    .then((pages) => pages.map((page: any) => {
        return {
            pageContent: page.text.replace(/\s+/g, ' '),
            metadata: {
                pageNumber: page.page,
                pageMarkdown: page.md,
            }
        }
    }));

const chromaVectorStore = new Chroma(
    embeddings,
    {
        url: "http://localhost:8000",
        collectionName: "pathfinder_rule_book",
    }
);

// console.log(docs.length)
await chromaVectorStore.addDocuments(docs);