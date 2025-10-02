/*  Author:     Makarius

Preview panel via HTML webview inside VSCode.
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
exports.setup = setup;
exports.request = request;
const vscode_1 = require("vscode");
const vscode_lib = __importStar(require("./vscode_lib"));
const lsp = __importStar(require("./lsp"));
let language_client;
class Panel {
    set_content(title, body) {
        this.webview_panel.title = title;
        this.webview_panel.webview.html = body;
    }
    reveal(column) {
        this.webview_panel.reveal(column);
    }
    constructor(column) {
        this.webview_panel =
            vscode_1.window.createWebviewPanel("isabelle-preview", "Preview", column, {
                enableScripts: true
            });
        this.webview_panel.onDidDispose(() => { panel = null; });
    }
}
let panel = null;
function setup(context, client) {
    language_client = client;
    language_client.onNotification(lsp.preview_response_type, params => {
        if (!panel) {
            panel = new Panel(params.column);
        }
        else
            panel.reveal(params.column);
        panel.set_content(params.label, params.content);
    });
}
function request(uri, split = false) {
    const activeEditor = vscode_1.window.activeTextEditor;
    const document_uri = uri || (activeEditor ? activeEditor.document.uri : undefined);
    if (language_client && document_uri && activeEditor) {
        language_client.sendNotification(lsp.preview_request_type, { uri: document_uri.toString(),
            column: vscode_lib.adjacent_editor_column(activeEditor, split) });
    }
}
//# sourceMappingURL=preview_panel.js.map