'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';

export class PrettifySymbolsProvider {
    private decorationType: vscode.TextEditorDecorationType;
    private symbolMap: { [key: string]: string } = {};
    private disposables: vscode.Disposable[] = [];
    private regex: RegExp | undefined;
    private revealMode: 'cursor' | 'selection' = 'selection';

    constructor(context: vscode.ExtensionContext) {
        this.decorationType = vscode.window.createTextEditorDecorationType({
            textDecoration: 'none; display: none;'
        });

        this.loadConfiguration();
        this.loadSymbols(context);

        this.disposables.push(
            vscode.workspace.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('isabelle.prettifySymbolsMode')) {
                    this.loadConfiguration();
                    if (vscode.window.activeTextEditor) {
                        this.updateDecorations(vscode.window.activeTextEditor);
                    }
                }
            }),
            vscode.window.onDidChangeActiveTextEditor(editor => {
                if (editor) this.updateDecorations(editor);
            }),
            vscode.workspace.onDidChangeTextDocument(event => {
                if (vscode.window.activeTextEditor && event.document === vscode.window.activeTextEditor.document) {
                    this.updateDecorations(vscode.window.activeTextEditor);
                }
            }),
            vscode.window.onDidChangeTextEditorSelection(event => {
                if (event.textEditor === vscode.window.activeTextEditor) {
                    this.updateDecorations(event.textEditor);
                }
            })
        );

        if (vscode.window.activeTextEditor) {
            this.updateDecorations(vscode.window.activeTextEditor);
        }
    }

    private loadConfiguration() {
        const config = vscode.workspace.getConfiguration('isabelle');
        this.revealMode = config.get<'cursor' | 'selection'>('prettifySymbolsMode', 'selection');
    }

    private async loadSymbols(context: vscode.ExtensionContext) {
        try {
            const snippetsPath = context.asAbsolutePath('snippets/isabelle-snippets');
            const content = await fs.promises.readFile(snippetsPath, 'utf8');
            this.symbolMap = JSON.parse(content);
            
            // Create a regex that matches any of the keys
            // Keys are like "\<Rightarrow>", so we need to escape backslash
            const keys = Object.keys(this.symbolMap).sort((a, b) => b.length - a.length);
            if (keys.length === 0) {
                this.regex = undefined;
                return;
            }
            const pattern = keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
            this.regex = new RegExp(pattern, 'g');
            
            // Trigger update after loading
            if (vscode.window.activeTextEditor) {
                this.updateDecorations(vscode.window.activeTextEditor);
            }
        } catch (error) {
            console.error('Failed to load Isabelle symbols:', error);
        }
    }

    public updateDecorations(editor: vscode.TextEditor) {
        if (!this.regex || (editor.document.languageId !== 'isabelle' && editor.document.languageId !== 'isabelle-ml')) {
            return;
        }

        const text = editor.document.getText();
        const decorations: vscode.DecorationOptions[] = [];
        const selections = editor.selections;

        let match;
        this.regex.lastIndex = 0; // Reset regex
        while ((match = this.regex.exec(text))) {
            const symbol = match[0];
            if (this.symbolMap[symbol]) {
                const startPos = editor.document.positionAt(match.index);
                const endPos = editor.document.positionAt(match.index + symbol.length);
                const range = new vscode.Range(startPos, endPos);

                // Check if cursor is inside or touching the range
                // We want to reveal the code if the cursor is "in" it.
                // "In" it usually means the selection intersects.
                let shouldReveal = false;
                for (const selection of selections) {
                    if (this.revealMode === 'selection') {
                        // Reveal ONLY if the selection is NOT empty and intersects the symbol range
                        // This means the user has actively selected part of the symbol
                        if (!selection.isEmpty && selection.intersection(range)) {
                            shouldReveal = true;
                            break;
                        }
                    } else {
                        // cursor mode
                        // Reveal if the cursor (active position) is touching/inside
                        // or if there is an intersection (standard behavior for cursor mode usually implies selection too)
                        if (selection.intersection(range)) {
                            shouldReveal = true;
                            break;
                        }
                    }
                }

                if (!shouldReveal) {
                    decorations.push({
                        range,
                        renderOptions: {
                            before: {
                                contentText: this.symbolMap[symbol],
                                // Match the color of the surrounding text or use a specific color?
                                // Default color is usually fine.
                            }
                        }
                    });
                }
            }
        }

        editor.setDecorations(this.decorationType, decorations);
    }

    public dispose() {
        this.decorationType.dispose();
        this.disposables.forEach(d => d.dispose());
    }
}

export function setup(context: vscode.ExtensionContext) {
    const provider = new PrettifySymbolsProvider(context);
    context.subscriptions.push(provider);
}
