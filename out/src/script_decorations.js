/*  Author:     Denis Paluca, TU Muenchen

Non-unicode Isabelle symbols as text decorations.
*/
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.register_script_decorations = register_script_decorations;
const vscode_1 = require("vscode");
const arrows = {
    sub: '⇩',
    sup: '⇧',
    sub_begin: '⇘',
    sub_end: '⇙',
    sup_begin: '⇗',
    sup_end: '⇖'
};
const no_hide_list = [' ', '\n', '\r', ...Object.values(arrows)];
function should_hide(next_char) {
    return !no_hide_list.includes(next_char);
}
function find_closing(close, text, open_index) {
    let close_index = open_index;
    let counter = 1;
    const open = text[open_index];
    while (counter > 0) {
        let c = text[++close_index];
        if (c === undefined)
            return;
        if (c === open) {
            counter++;
        }
        else if (c === close) {
            counter--;
        }
    }
    return close_index;
}
function extract_ranges(doc) {
    const text = doc.getText();
    const hide_ranges = [];
    const sup_ranges = [];
    const sub_ranges = [];
    for (let i = 0; i < text.length - 1; i++) {
        switch (text[i]) {
            case arrows.sup:
            case arrows.sub:
                if (should_hide(text[i + 1])) {
                    const pos_mid = doc.positionAt(i + 1);
                    hide_ranges.push(new vscode_1.Range(doc.positionAt(i), pos_mid));
                    (text[i] === arrows.sub ? sub_ranges : sup_ranges)
                        .push(new vscode_1.Range(pos_mid, doc.positionAt(i + 2)));
                    i++;
                }
                break;
            case arrows.sup_begin:
            case arrows.sub_begin:
                const close = text[i] === arrows.sub_begin ? arrows.sub_end : arrows.sup_end;
                const script_ranges = text[i] === arrows.sub_begin ? sub_ranges : sup_ranges;
                const close_index = find_closing(close, text, i);
                if (close_index && close_index - i > 1) {
                    const pos_start = doc.positionAt(i + 1);
                    const pos_end = doc.positionAt(close_index);
                    hide_ranges.push(new vscode_1.Range(doc.positionAt(i), pos_start), new vscode_1.Range(pos_end, doc.positionAt(close_index + 1)));
                    script_ranges.push(new vscode_1.Range(pos_start, pos_end));
                    i = close_index;
                }
                break;
            default:
                break;
        }
    }
    return { hide_ranges: hide_ranges, superscript_ranges: sup_ranges, subscript_ranges: sub_ranges };
}
function register_script_decorations(context) {
    const hide = vscode_1.window.createTextEditorDecorationType({
        textDecoration: 'none; font-size: 0.001em',
        rangeBehavior: vscode_1.DecorationRangeBehavior.ClosedClosed
    });
    const superscript = vscode_1.window.createTextEditorDecorationType({
        textDecoration: 'none; position: relative; top: -0.5em; font-size: 80%'
    });
    const subscript = vscode_1.window.createTextEditorDecorationType({
        textDecoration: 'none; position: relative; bottom: -0.5em; font-size: 80%'
    });
    const set_editor_decorations = (editor, doc) => {
        const { hide_ranges: hideRanges, superscript_ranges: superscriptRanges, subscript_ranges: subscriptRanges } = extract_ranges(doc);
        editor.setDecorations(hide, hideRanges);
        editor.setDecorations(superscript, superscriptRanges);
        editor.setDecorations(subscript, subscriptRanges);
    };
    context.subscriptions.push(hide, superscript, subscript, vscode_1.window.onDidChangeActiveTextEditor(editor => {
        if (!editor) {
            return;
        }
        const doc = editor.document;
        set_editor_decorations(editor, doc);
    }), vscode_1.workspace.onDidChangeTextDocument(({ document }) => {
        for (const editor of vscode_1.window.visibleTextEditors) {
            if (editor.document.uri.toString() === document.uri.toString()) {
                set_editor_decorations(editor, document);
            }
        }
    }));
}
//# sourceMappingURL=script_decorations.js.map