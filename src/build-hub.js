// Build the AAA Academy home page: node src/build-hub.js -> index.html at the repo root.
const fs = require("fs"), path = require("path");
const shell = require("./shell.js");
const body = fs.readFileSync(path.join(__dirname, "hub.html"), "utf8").replace(/\s*$/, "");
const out = path.join(__dirname, "..", "index.html");
fs.writeFileSync(out, shell.open("en") + body + shell.close);
console.log("wrote", path.relative(process.cwd(), out));
