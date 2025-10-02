/*  Author:     Makarius

Message formats for Language Server Protocol, with adhoc PIDE extensions
(see Tools/VSCode/src/lsp.scala).
*/
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.reset_words_type = exports.exclude_word_permanently_type = exports.exclude_word_type = exports.include_word_permanently_type = exports.include_word_type = exports.preview_response_type = exports.preview_request_type = exports.state_auto_update_type = exports.state_update_type = exports.state_locate_type = exports.state_exit_type = exports.state_init_type = exports.state_set_margin_type = exports.state_output_type = exports.output_set_margin_type = exports.dynamic_output_type = exports.caret_update_type = exports.decoration_request_type = exports.decoration_type = void 0;
const vscode_languageclient_1 = require("vscode-languageclient");
exports.decoration_type = new vscode_languageclient_1.NotificationType("PIDE/decoration");
exports.decoration_request_type = new vscode_languageclient_1.NotificationType("PIDE/decoration_request");
exports.caret_update_type = new vscode_languageclient_1.NotificationType("PIDE/caret_update");
exports.dynamic_output_type = new vscode_languageclient_1.NotificationType("PIDE/dynamic_output");
exports.output_set_margin_type = new vscode_languageclient_1.NotificationType("PIDE/output_set_margin");
exports.state_output_type = new vscode_languageclient_1.NotificationType("PIDE/state_output");
exports.state_set_margin_type = new vscode_languageclient_1.NotificationType("PIDE/state_set_margin");
exports.state_init_type = new vscode_languageclient_1.RequestType0("PIDE/state_init");
exports.state_exit_type = new vscode_languageclient_1.NotificationType("PIDE/state_exit");
exports.state_locate_type = new vscode_languageclient_1.NotificationType("PIDE/state_locate");
exports.state_update_type = new vscode_languageclient_1.NotificationType("PIDE/state_update");
exports.state_auto_update_type = new vscode_languageclient_1.NotificationType("PIDE/state_auto_update");
exports.preview_request_type = new vscode_languageclient_1.NotificationType("PIDE/preview_request");
exports.preview_response_type = new vscode_languageclient_1.NotificationType("PIDE/preview_response");
/* spell checker */
exports.include_word_type = new vscode_languageclient_1.NotificationType("PIDE/include_word");
exports.include_word_permanently_type = new vscode_languageclient_1.NotificationType("PIDE/include_word_permanently");
exports.exclude_word_type = new vscode_languageclient_1.NotificationType("PIDE/exclude_word");
exports.exclude_word_permanently_type = new vscode_languageclient_1.NotificationType("PIDE/exclude_word_permanently");
exports.reset_words_type = new vscode_languageclient_1.NotificationType("PIDE/reset_words");
//# sourceMappingURL=lsp.js.map