"use strict";
/*  Author:     Makarius

Misc library functions for VSCode.
*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.file_scheme = void 0;
exports.is_file = is_file;
exports.find_file_editor = find_file_editor;
exports.adjacent_editor_column = adjacent_editor_column;
exports.get_configuration = get_configuration;
exports.set_configuration = set_configuration;
exports.get_replacement_mode = get_replacement_mode;
exports.get_color = get_color;
const vscode_1 = require("vscode");
/* files */
exports.file_scheme = "file";
function is_file(uri) {
    return uri.scheme === exports.file_scheme;
}
function find_file_editor(uri) {
    function check(editor) { return editor && is_file(editor.document.uri) && editor.document.uri.fsPath === uri.fsPath; }
    if (is_file(uri)) {
        const activeEditor = vscode_1.window.activeTextEditor;
        if (activeEditor && check(activeEditor))
            return activeEditor;
        else
            return vscode_1.window.visibleTextEditors.find(check);
    }
    else
        return undefined;
}
/* GUI */
function adjacent_editor_column(editor, split) {
    if (!split)
        return editor.viewColumn || vscode_1.ViewColumn.One;
    else if (editor.viewColumn === vscode_1.ViewColumn.One || editor.viewColumn === vscode_1.ViewColumn.Three)
        return vscode_1.ViewColumn.Two;
    else
        return vscode_1.ViewColumn.Three;
}
/* Isabelle configuration */
function get_configuration(name) {
    return vscode_1.workspace.getConfiguration("isabelle").get(name);
}
function set_configuration(name, configuration) {
    vscode_1.workspace.getConfiguration("isabelle").update(name, configuration);
}
function get_replacement_mode() {
    return get_configuration("replacement");
}
function get_color(color, light) {
    const colors = get_configuration("text_color");
    const key = color + (light ? "_light" : "_dark");
    return colors ? colors[key] : "";
}
//# sourceMappingURL=vscode_lib.js.map