import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "./tools";

export function createMcpServer(): McpServer {
  const server = new McpServer({ name: "italki", version: "0.0.1" });
  registerTools(server);
  return server;
}