/*  Author:     Makarius

PIDE document decorations.
*/
'use strict';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.text_colors = void 0;
exports.setup = setup;
exports.close_document = close_document;
exports.apply_decoration = apply_decoration;
exports.update_editor = update_editor;
exports.touch_document = touch_document;
const vscode_1 = require("vscode");
const vscode_2 = require("vscode");
const vscode_lib = __importStar(require("./vscode_lib"));
const symbol_converter_1 = require("./symbol_converter");
/* symbol converter for hover messages */
let symbolConverter;
/* helper function to convert symbols in hover messages */
async function convertHoverMessage(hoverMessage) {
    if (!hoverMessage || !symbolConverter) {
        return hoverMessage;
    }
    if (Array.isArray(hoverMessage)) {
        // Handle array of MarkdownStrings
        const convertedArray = [];
        for (const md of hoverMessage) {
            const convertedValue = await symbolConverter.convertSymbols(md.value);
            convertedArray.push(new vscode_1.MarkdownString(convertedValue));
        }
        return convertedArray;
    }
    else {
        // Handle single MarkdownString
        const convertedValue = await symbolConverter.convertSymbols(hoverMessage.value);
        return new vscode_1.MarkdownString(convertedValue);
    }
}
/* known decoration types */
const background_colors = [
    "unprocessed1",
    "running1",
    "canceled",
    "bad",
    "intensify",
    "quoted",
    "antiquoted",
    "markdown_bullet1",
    "markdown_bullet2",
    "markdown_bullet3",
    "markdown_bullet4"
];
const foreground_colors = [
    "quoted",
    "antiquoted"
];
const dotted_colors = [
    "writeln",
    "information",
    "warning"
];
exports.text_colors = [
    "main",
    "keyword1",
    "keyword2",
    "keyword3",
    "quasi_keyword",
    "improper",
    "operator",
    "tfree",
    "tvar",
    "free",
    "skolem",
    "bound",
    "var",
    "inner_numeral",
    "inner_quoted",
    "inner_cartouche",
    "comment1",
    "comment2",
    "comment3",
    "dynamic",
    "class_parameter",
    "antiquote",
    "raw_text",
    "plain_text"
];
const text_overview_colors = [
    "unprocessed",
    "running",
    "error",
    "warning"
];
/* setup */
const types = new Map();
function setup(context) {
    // Initialize symbol converter for hover messages
    symbolConverter = new symbol_converter_1.SymbolConverter(context.extensionUri.fsPath);
    function decoration(options) {
        const typ = vscode_1.window.createTextEditorDecorationType(options);
        context.subscriptions.push(typ);
        return typ;
    }
    function background(color) {
        return decoration({ light: { backgroundColor: vscode_lib.get_color(color, true) },
            dark: { backgroundColor: vscode_lib.get_color(color, false) } });
    }
    function text_color(color) {
        return decoration({ light: { color: vscode_lib.get_color(color, true) },
            dark: { color: vscode_lib.get_color(color, false) } });
    }
    function text_overview_color(color) {
        return decoration({ overviewRulerLane: vscode_1.OverviewRulerLane.Right,
            light: { overviewRulerColor: vscode_lib.get_color(color, true) },
            dark: { overviewRulerColor: vscode_lib.get_color(color, false) } });
    }
    function bottom_border(width, style, color) {
        const border = `${width} none; border-bottom-style: ${style}; border-color: `;
        return decoration({ light: { border: border + vscode_lib.get_color(color, true) },
            dark: { border: border + vscode_lib.get_color(color, false) } });
    }
    /* reset */
    types.forEach(typ => {
        for (const editor of vscode_1.window.visibleTextEditors) {
            editor.setDecorations(typ, []);
        }
        const i = context.subscriptions.indexOf(typ);
        if (i >= 0)
            context.subscriptions.splice(i, 1);
        typ.dispose();
    });
    types.clear();
    /* init */
    for (const color of background_colors) {
        types.set("background_" + color, background(color));
    }
    for (const color of foreground_colors) {
        types.set("foreground_" + color, background(color)); // approximation
    }
    for (const color of dotted_colors) {
        types.set("dotted_" + color, bottom_border("2px", "dotted", color));
    }
    for (const color of exports.text_colors) {
        types.set("text_" + color, text_color(color));
    }
    for (const color of text_overview_colors) {
        types.set("text_overview_" + color, text_overview_color(color));
    }
    types.set("spell_checker", bottom_border("1px", "solid", "spell_checker"));
    /* update editors */
    for (const editor of vscode_1.window.visibleTextEditors) {
        update_editor(editor);
    }
}
const document_decorations = new Map();
function close_document(document) {
    document_decorations.delete(document.uri.toString());
}
async function apply_decoration(decorations) {
    const uri = vscode_1.Uri.parse(decorations.uri);
    for (const decoration of decorations.entries) {
        const typ = types.get(decoration.type);
        if (typ) {
            const content = [];
            for (const opt of decoration.content) {
                const r = opt.range;
                const convertedHoverMessage = await convertHoverMessage(opt.hover_message);
                content.push({
                    range: new vscode_2.Range(r[0], r[1], r[2], r[3]),
                    hoverMessage: convertedHoverMessage
                });
            }
            const document = document_decorations.get(uri.toString()) || new Map();
            document.set(decoration.type, content);
            document_decorations.set(uri.toString(), document);
            for (const editor of vscode_1.window.visibleTextEditors) {
                if (uri.toString() === editor.document.uri.toString()) {
                    editor.setDecorations(typ, content);
                }
            }
        }
    }
}
function update_editor(editor) {
    if (editor) {
        const decorations = document_decorations.get(editor.document.uri.toString());
        if (decorations) {
            for (const [typ, content] of decorations) {
                const decorationType = types.get(typ);
                if (decorationType) {
                    editor.setDecorations(decorationType, content);
                }
            }
        }
    }
}
/* handle document changes */
const touched_documents = new Set();
let touched_timer;
function update_touched_documents() {
    const touched_editors = [];
    for (const editor of vscode_1.window.visibleTextEditors) {
        if (touched_documents.has(editor.document)) {
            touched_editors.push(editor);
        }
    }
    touched_documents.clear();
    touched_editors.forEach(update_editor);
}
function touch_document(document) {
    if (touched_timer)
        clearTimeout(touched_timer);
    touched_documents.add(document);
    touched_timer = setTimeout(update_touched_documents, 1000);
}
//# sourceMappingURL=decorations.js.map