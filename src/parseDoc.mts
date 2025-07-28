import { createReadStream, writeFileSync } from "fs";
import FormData from "form-data";
import "dotenv/config";
import axios from "axios";

enum ResponseStatus {
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
  PARTIAL_SUCCESS = "PARTIAL_SUCCESS",
  CANCELLED = "CANCELLED"
}

enum MessageColor {
  GREEN = "\x1b[32m",
  RED = "\x1b[31m",
  YELLOW = "\x1b[33m",
}

function logMessageHeader(message: string, color: MessageColor) {
  const messageLength = message.length;
  const topBorder = color + "\u250C" + "\u2500".repeat(messageLength+4) + "\u2510" + "\x1b[0m";
  const bottomBorder = color + "\u2514" + "\u2500".repeat(messageLength+4) + "\u2518" + "\x1b[0m";
  const messageLine = color + "\u2502  " + message + "  │" + "\x1b[0m";
  console.log(topBorder);
  console.log(messageLine);
  console.log(bottomBorder);
}

const LLAMA_CLOUD_API_KEY = process.env.LLAMA_CLOUD_API_KEY;

if (!LLAMA_CLOUD_API_KEY) {
  throw new Error("LLAMA_CLOUD_API_KEY is not set");
}

// Parse CLI arguments
const args = process.argv.slice(2);

let pdfPathArg: string | undefined;
let disableImageExtraction = true;
let outputPath: string | undefined;
if (args.length === 0) {
  console.log("Usage: pnpm parse-doc --output <output-path> --image <true|false> <pdf-path>")
  process.exit(1);
}
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--image") {
    disableImageExtraction = false;
  } else if (args[i] === "--output") {
    outputPath = args[i + 1];
  } else if (!args[i].startsWith("--")) {
    pdfPathArg = args[i];
  }
}
if (!pdfPathArg) {
  throw new Error("No PDF path provided");
} else if (!outputPath) {
  throw new Error("No output path provided");
}

async function getJobStatus(jobId: string): Promise<ResponseStatus> {
  return await axios.get(`https://api.cloud.llamaindex.ai/api/v1/parsing/job/${jobId}`, {
    headers: {
      'Accept': 'application/json', 
      'Authorization': `Bearer ${LLAMA_CLOUD_API_KEY}`
    }
  }).then(res => res.data.status as ResponseStatus);
}

async function parseDoc(pdfPath: string, disableImageExtraction: boolean) {
  let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'https://api.cloud.llamaindex.ai/api/v1/parsing/upload',
    headers: { 
      'Content-Type': 'multipart/form-data', 
      'Accept': 'application/json', 
      'Authorization': `Bearer ${LLAMA_CLOUD_API_KEY}`
    }
  }
  const form = new FormData();
  form.append("file", createReadStream(pdfPath));
  form.append("disable_image_extraction", disableImageExtraction ? "true" : "false");
  logMessageHeader("Loading file to LlamaParser", MessageColor.GREEN);
  await axios.post(config.url, form, {
    headers: config.headers
  })
  .then(async res =>{
    const jobId = res.data.id;
    let jobStatus = res.data.status as ResponseStatus;
    
    // Waiting for parsing job to complete
    while (jobStatus === ResponseStatus.PENDING) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      jobStatus = await getJobStatus(jobId);
    }
    
    switch (jobStatus) {
      case ResponseStatus.SUCCESS:
        return await axios.get(`https://api.cloud.llamaindex.ai/api/v1/parsing/job/${jobId}/result/json`, {
          headers: {
            'Accept': 'application/json', 
            'Authorization': `Bearer ${LLAMA_CLOUD_API_KEY}`
          }
        })
        .then(res => res.data)
        case ResponseStatus.ERROR:
          throw new Error("Error parsing file");
        case ResponseStatus.PARTIAL_SUCCESS:
            console.warn("Partial success parsing file");
            return await axios.get(`https://api.cloud.llamaindex.ai/api/v1/parsing/job/${jobId}/result/json`, {
              headers: {
                'Accept': 'application/json', 
                'Authorization': `Bearer ${LLAMA_CLOUD_API_KEY}`
              }
            }).then(res => res.data)
      case ResponseStatus.CANCELLED:
        throw new Error("Job cancelled");
    }
  })
  .then(result =>
    {
      if (!result || result.length === 0) {
        logMessageHeader("Error Parsing file", MessageColor.RED);
        console.error(result);
        throw new Error("Error parsing file");
      }
      logMessageHeader("Writing to file", MessageColor.GREEN);
      writeFileSync(outputPath as string, JSON.stringify(result, null, 2));

    }
    )
  .catch(error => {
    logMessageHeader("Error Parsing file", MessageColor.RED);
    console.error(error);
  });

}

await parseDoc(pdfPathArg, disableImageExtraction);
