import { defineCommand, runMain } from "citty";

const main = defineCommand({
  meta: {
    name: "italki",
    description: "CLI + MCP server for italki — search, compare, and track lessons",
    version: "0.0.1",
  },
  subCommands: {
    search: () => import("./src/commands/search").then((m) => m.default),
    teacher: () => import("./src/commands/teacher").then((m) => m.default),
    schedule: () => import("./src/commands/schedule").then((m) => m.default),
    reviews: () => import("./src/commands/reviews").then((m) => m.default),
    compare: () => import("./src/commands/compare").then((m) => m.default),
    mcp: () => import("./src/commands/mcp").then((m) => m.default),
    login: () => import("./src/commands/login").then((m) => m.default),
    logout: () => import("./src/commands/logout").then((m) => m.default),
    balance: () => import("./src/commands/balance").then((m) => m.default),
    whoami: () => import("./src/commands/whoami").then((m) => m.default),
    lessons: () => import("./src/commands/lessons").then((m) => m.default),
  },
});

runMain(main);
