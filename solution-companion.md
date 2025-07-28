# Examining the PDF
- The PDF is structured from two columns a page, occasionally presenting data inside a table or an enclosed section
- Image contain redundant information which serves as a visual demonstration of textual information

# Requirements and Constraints
- Groq does not offer an embedding model. If storing the PDF in a vector store is the chosen solution, an embedding model or provider is required.
## Possible approaches
### Extracting the PDF data to a markdown format, storing it in a database and giving the model access using similarity query
Advantages:
- grained and adjustable access to data from the pdf
- can be scaled to multiple pdfs
- Different strategies can be used to connect disparate segments of relevance
- reduce input noise
- can be scaled vertically to handle simultaneous requests

Disadvantages:
- depends on external processes (in the case of a local deployment) or services (in the case of a cloud deployment)

### Providing the entire PDF to a capable model as part of the prompt:
Advantages: 
* Easy to implement
* Might work with newer models

Disadvantages:
* Important information will likely be lost in the generation

## Solutionb Architecture
My solution would be based on the following components:
- An extraction service, would be userd once to extract the PDF data into a JSON file, which later would be loaded into a vector database.
- Vector database would grant similarity querying capabilities.
- TogetherAI as an embedding model provider, using baai/bge-
- QA agent process based on CLI.
- Conversation Memory - Optional, not required by the task.
### Extraction service
I chooseto use LlamaParser (LlamaIndex) as the provider. for ease of usage. Shortcomings of Llamaparser are:
- Being a closed service without much control.
- Might be pricier on the long run in the context of parsing and handling high volume of documents.
- Pricing are currently $1.5 per 1000 tokens, where parsing price are starting from 1 token per page for basic parsing, and gets up to 90 tokens per page for advanced tooling,
- The service is not free, and the pricing is not transparent.

### Vector database
I chose to use ChromaDB, as it is a lightweight, easy to use, and open-source vector database. In the context of an established project, I would choose to use the existing database provider if it can support vector indexing and searching.

### Embedding model
I chose to use TogetherAI as an embedding model provider, using togetherai/m2-bert-retrieval-32k as the model. Choosing a cloud provider enables me to decouple the emebdding process from the rest of the solution.

### QA agent
I chose to use LangGraph as the framework for the QA agent.

### Conversation Memory
For this solution I would not implement conversation memory. If required, I would opt for a mixture between cached and DB/vectorized memory.

### Infrastructure
The solution would be deployed on a docker environment, with a container for the vector database. The QA agent would run on a shell process.

## Encountered Challanges

### No Embedding models on Groq
First I tried using embedding models provided by TogetherAI, namely `togetherai/m2-bert-80m-retrieval-32k` but the results were not satisfactory. I opted to use the SOTA `openai/text-embedding-3-large` model which performed better.

### Langchain-chroma incompatible with retrieveQuery method from langchain embedding models
Using a solution from [this issue](https://github.com/langchain-ai/langchainjs/issues/8314#issuecomment-3035097692) I was able to get write a workaround for this issue.

### Groq rate limits
While testing the solution, I ran into rate limits with Groq. For the scope of the task I chose not to take action on it immediately, since this can be solved by buying more credits.

## Possible product development ideas
- Charachtern Generation.
- Dungeon Master Agent.
- MMORPG NPC generator.