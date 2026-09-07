import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

// The engine lives in this dedicated worker. It runs only while the page is
// open; closing the page terminates the worker and any inference with it.
const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (message: MessageEvent) => {
  handler.onmessage(message);
};
