// Custom oxlint plugin — enforces architecture separation rules
// See AGENTS.md "The separation rule (NON-NEGOTIABLE)"
//
// Rules:
//   italki/no-cross-layer-imports  — services/ must not import from commands/, presenters/, @clack, citty
//                                  — presenters/ must not import from services/, commands/, @clack, citty
//                                  — schemas/ must not import from src/ at all
//   italki/no-default-export       — named exports only (greppable, explicit)

/** @type {Record<string, string>} */
const BANNED_IN_SERVICES = [
  "commands",
  "presenters",
  "@clack/prompts",
  "citty",
];

/** @type {Record<string, string>} */
const BANNED_IN_PRESENTERS = [
  "services",
  "commands",
  "@clack/prompts",
  "citty",
];

/**
 * @param {string} filePath
 * @returns {string | null}
 */
function getLayer(filePath) {
  if (filePath.includes("/services/")) return "services";
  if (filePath.includes("/presenters/")) return "presenters";
  if (filePath.includes("/schemas/")) return "schemas";
  if (filePath.includes("/commands/")) return "commands";
  return null;
}

/**
 * @param {string} importPath
 * @param {string[]} banned
 * @returns {boolean}
 */
function isBannedImport(importPath, banned) {
  return banned.some((b) => importPath.includes(b));
}

const noCrossLayerImports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Enforce architecture separation: services/ → schemas/ + lib/ only, presenters/ → schemas/ only. See AGENTS.md.",
    },
  },
  create(context) {
    const filename = context.filename || "";
    const layer = getLayer(filename);
    if (!layer) return {};

    let banned = [];
    if (layer === "services") banned = BANNED_IN_SERVICES;
    else if (layer === "presenters") banned = BANNED_IN_PRESENTERS;
    else if (layer === "schemas") {
      // schemas/ must not import from any src/ layer
      return {
        ImportDeclaration(node) {
          const importPath = node.source.value;
          if (
            importPath.startsWith("../services") ||
            importPath.startsWith("../commands") ||
            importPath.startsWith("../presenters") ||
            importPath.startsWith("./")
          ) {
            context.report({
              node,
              message:
                "schemas/ must not import from services/, commands/, presenters/, or local files. Schemas are the foundation layer — no src/ imports allowed.",
            });
          }
        },
      };
    }

    return {
      ImportDeclaration(node) {
        const importPath = node.source.value;
        if (isBannedImport(importPath, banned)) {
          context.report({
            node,
            message: `${layer}/ must not import from "${importPath}". ${layer}/ may only import from schemas/ and lib/. See AGENTS.md separation rule.`,
          });
        }
      },
    };
  },
};

const noDefaultExport = {
  meta: {
    type: "problem",
    docs: {
      description:
        "No default exports outside commands/. Named exports are greppable and explicit. See AGENTS.md code style.",
    },
  },
  create(context) {
    const filename = context.filename || "";
    // commands/ use citty's defineCommand which requires default export
    if (filename.includes("/commands/")) return {};

    return {
      ExportDefaultDeclaration(node) {
        context.report({
          node,
          message:
            "No default exports outside commands/. Use named exports — greppable, explicit imports. See AGENTS.md code style.",
        });
      },
    };
  },
};

const noClassesInServices = {
  meta: {
    type: "problem",
    docs: {
      description:
        "No classes in services/. Services are pure functions, no classes, no mutation. See AGENTS.md design principles.",
    },
  },
  create(context) {
    const filename = context.filename || "";
    if (!filename.includes("/services/")) return {};

    return {
      ClassDeclaration(node) {
        context.report({
          node,
          message:
            "No classes in services/. Use pure functions — no classes, no mutation, no state. See AGENTS.md design principles.",
        });
      },
    };
  },
};

const noConsoleInServices = {
  meta: {
    type: "problem",
    docs: {
      description:
        "No console.log/console.error in services/. Services return data, they don't print. Output is the presenter's job. See AGENTS.md output rule.",
    },
  },
  create(context) {
    const filename = context.filename || "";
    if (!filename.includes("/services/")) return {};

    return {
      CallExpression(node) {
        const callee = node.callee;
        if (
          callee.type === "MemberExpression" &&
          callee.object?.type === "Identifier" &&
          callee.object.name === "console" &&
          callee.property?.type === "Identifier"
        ) {
          context.report({
            node,
            message:
              `No console.${callee.property.name} in services/. Services return data, not print it. Output is the presenter's job. See AGENTS.md output rule.`,
          });
        }
      },
    };
  },
};

const noGenericFilenames = {
  meta: {
    type: "problem",
    docs: {
      description:
        "No generic filenames (utils, helpers, misc, common, index). File names must say what's inside. See AGENTS.md code style.",
    },
  },
  create(context) {
    const filename = context.filename || "";
    const basename = filename.split("/").pop()?.replace(/\.(ts|js)$/, "") ?? "";
    const banned = ["utils", "helpers", "misc", "common", "generic", "stuff"];

    if (!banned.includes(basename)) return {};

    return {
      Program(node) {
        context.report({
          node,
          message:
            `File named "${basename}.ts" is too generic. File names must say what's inside (e.g. "search.ts" searches, "format-price.ts" formats prices). See AGENTS.md code style.`,
        });
      },
    };
  },
};

const plugin = {
  meta: {
    name: "italki",
  },
  rules: {
    "no-cross-layer-imports": noCrossLayerImports,
    "no-default-export": noDefaultExport,
    "no-classes-in-services": noClassesInServices,
    "no-console-in-services": noConsoleInServices,
    "no-generic-filenames": noGenericFilenames,
  },
};

export default plugin;
