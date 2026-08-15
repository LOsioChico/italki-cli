import { defineCommand } from "citty";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "../mcp/server";

export default defineCommand({
  meta: { description: "Start MCP server (stdio) for AI tools — register as 'italki mcp' in your MCP client config" },
  run: async () => {
    await createMcpServer().connect(new StdioServerTransport());
  },
});