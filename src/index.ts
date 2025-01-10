import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StateGraph } from "@langchain/langgraph";
import {
  MemorySaver,
  Annotation,
  messagesStateReducer,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";

const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
  }),
});

const model = new ChatGoogleGenerativeAI({
  model: "models/gemini-2.0-flash-exp",
  temperature: 0,
});

// Define the function that calls the model
async function callModel(state: typeof StateAnnotation.State) {
  const messages = state.messages;
  const response = await model.invoke([
    {
      role: "system",
      content: "You are a senior software engineer who speaks concisely, up to 10 words.",
    },
    ...messages,
  ]);

  // We return a list, because this will get added to the existing list
  return { messages: [response] };
}

// Define a new graph
const workflow = new StateGraph(StateAnnotation)
  .addNode("agent", callModel)
  .addEdge("__start__", "agent");

// Initialize memory to persist state between graph runs
const checkpointer = new MemorySaver();

// Finally, we compile it!
const app = workflow.compile({ checkpointer });

// Use the Runnable
const finalState = await app.invoke(
  { messages: [new HumanMessage("what is the weather in sf")] },
  { configurable: { thread_id: "vvk" } }
);

console.log(finalState.messages[finalState.messages.length - 1].content);

// Use the Runnable
let res = await app.invoke(
  { messages: [new HumanMessage("tell me more")] },
  { configurable: { thread_id: "vvk" } }
);

console.log(res.messages[res.messages.length - 1].content);

// Use the Runnable
res = await app.invoke(
  { messages: [new HumanMessage("what did i ask before")] },
  { configurable: { thread_id: "vvk" } }
);

console.log(res.messages[res.messages.length - 1].content);
