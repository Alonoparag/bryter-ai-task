# Prerequisites
1. Create a Groq API key at [this link](https://console.groq.com/keys).
2. Copy the key and add it at the top of the `index.mts` file inside `process.env.GROQ_API_KEY`.

# Run the repo

```bash
pnpm install
pnpm dev
```


# Tech challenge

The repo contains a large PDF called `pathfinder_rule_book.pdf`. 
In `index.mts` there's a `LangGraph` graph that invokes an LLM model.

We want to interrogate the model and ask questions that are relevant to the player (i.e. "Summarize the rules of the game for me").

Focus on efficient solutions, optimize for speed and consider how the solution could be expanded to work with multiple documents at once.

# Solution Usage
*Note: You can read about my solution process in `solution-companion.md`*

## Prerequisites
- Docker
- Node.js

## Setup
1. Copy the `.env.example` file to `.env` and add the following variables:
```
LLAMA_CLOUD_API_KEY=<API-KEY>
GROQ_API_KEY=<API-KEY>
TOGETHERAI_API_KEY=<API-KEY>
OPENAI_API_KEY=<API-KEY>
```
2. Ensure that the docker daemon is running.
3. Run pnpm `db:start` to start the vector database.

## Parsing the PDF
You can parse the PDF using the following command:
```bash
pnpm run parse-doc --output <output-path> <pdf-path>
```

## Loading the result to the vector database
*Note: Ensure that the vector database is running before running this command.*

You can load the result to the vector database using the following command:
```bash
pnpm run db:load-docs -- <parse-output-path>
```
the loader expects the following format:
```json
{
    "pages": [
        {
            "page": 1,
            "text": "...",
            "md": "..."
         }
         //...
            ]
}
```
## Running the solution
You can run the app using the following command:
```bash
pnpm run dev
```
You can change verbosity level by setting the `VERBOSITY` environment variable to `true` or `false`.