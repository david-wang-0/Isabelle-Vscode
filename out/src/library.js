/*  Author:     Makarius

Basic library (see Pure/library.scala).
*/
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.escape_regex = escape_regex;
exports.quote = quote;
exports.reverse = reverse;
exports.has_newline = has_newline;
exports.getenv = getenv;
exports.getenv_strict = getenv_strict;
exports.workspace_path = workspace_path;
/* regular expressions */
function escape_regex(s) {
    return s.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&").replace(/-/g, "\\x2d");
}
/* strings */
function quote(s) {
    return "\"" + s + "\"";
}
function reverse(s) {
    return s.split("").reverse().join("");
}
function has_newline(text) {
    return text.includes("\n") || text.includes("\r");
}
/* settings environment */
function getenv(name) {
    const s = process.env[name];
    return s || "";
}
function getenv_strict(name) {
    const s = getenv(name);
    if (s)
        return s;
    else
        throw new Error("Undefined Isabelle environment variable: " + quote(name));
}
function workspace_path(path) {
    return getenv_strict("ISABELLE_VSCODE_WORKSPACE") + "/" + path;
}
//# sourceMappingURL=library.js.map