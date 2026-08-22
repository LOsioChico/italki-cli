// ANSI styling — no deps, auto-disabled when piped or NO_COLOR is set
// See https://no-color.org

const enabled = process.stdout.isTTY === true && !process.env["NO_COLOR"];

function style(code: string): (s: string) => string {
  return (s) => (enabled ? `[${code}m${s}[0m` : s);
}

export const bold = style("1");
export const dim = style("2");
export const red = style("31");
export const green = style("32");
export const yellow = style("33");
export const cyan = style("36");
