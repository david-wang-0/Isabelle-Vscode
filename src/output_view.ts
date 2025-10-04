/*  Author:     Denis Paluca, TU Muenchen

Isabelle output panel as web view.
*/

'use strict';

import { WebviewViewProvider, WebviewView, Uri, WebviewViewResolveContext,
   CancellationToken, window, Position, Selection, Webview} from 'vscode'
import { text_colors } from './decorations'
import * as vscode_lib from './vscode_lib'
import * as path from 'path'
import * as lsp from './lsp'
import { LanguageClient } from 'vscode-languageclient/node'
import { SymbolConverter } from './symbol_converter'


class Output_View_Provider implements WebviewViewProvider
{

  public static readonly view_type = 'isabelle-output'

  private _view?: WebviewView
  private content: string = ''
  private proofState: string = ''
  private symbolConverter: SymbolConverter
  private lastProofStateTime: number = 0

  constructor(
    private readonly _extension_uri: Uri,
    private readonly _language_client: LanguageClient
  ) {
    this.symbolConverter = new SymbolConverter(this._extension_uri.fsPath)
  }

  public async resolveWebviewView(
    view: WebviewView,
    context: WebviewViewResolveContext,
    _token: CancellationToken)
  {
    this._view = view

    view.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,

      localResourceRoots: [
        this._extension_uri
      ]
    }

    // Convert symbols in initial content if any
    const convertedContent = await this.symbolConverter.convertSymbols(this.content)
    const convertedProofState = await this.symbolConverter.convertSymbols(this.proofState)
    view.webview.html = this._get_html(convertedContent, convertedProofState)
    view.webview.onDidReceiveMessage(async message =>
    {
      switch (message.command) {
        case "open":
          open_webview_link(message.link)
          break
        case "resize":
          this._language_client.sendNotification(
            lsp.output_set_margin_type, { margin: message.margin })
          break
      }
    })
  }

  public async update_content(content: string)
  {
    // If content is empty or only whitespace, clear proof state
    if (!content || content.trim().length === 0) {
      await this.clear_proof_state()
      return
    }

    // Extract different types of content
    const { mainContent, proofState, errorContent } = this.extractContentTypes(content)

    // Convert Isabelle symbols to Unicode
    const convertedContent = await this.symbolConverter.convertSymbols(mainContent)
    const convertedErrorContent = errorContent ? await this.symbolConverter.convertSymbols(errorContent) : ''

    // Update proof state based on current content
    let convertedProofState = ''
    if (proofState) {
      convertedProofState = await this.symbolConverter.convertSymbols(proofState)
      this.lastProofStateTime = Date.now()
    }
    // If no proof state in current content, don't update timestamp but clear proof state

    if (!this._view) {
      this.content = convertedContent
      this.proofState = convertedProofState  // This will be empty if no proof state found
      return
    }

    this.proofState = convertedProofState  // Always update to current content's proof state (may be empty)
    this._view.webview.html = this._get_html(convertedContent, convertedProofState, convertedErrorContent)
  }

  public async update_proof_state(stateContent: string)
  {
    // Convert Isabelle symbols to Unicode
    const convertedProofState = await this.symbolConverter.convertSymbols(stateContent)

    if (!this._view) {
      this.proofState = convertedProofState
      return
    }

    const convertedContent = await this.symbolConverter.convertSymbols(this.content)
    this._view.webview.html = this._get_html(convertedContent, convertedProofState, '')
    this.proofState = convertedProofState
  }

  public async clear_proof_state()
  {
    if (!this._view) {
      this.proofState = ''
      return
    }

    const convertedContent = await this.symbolConverter.convertSymbols(this.content)
    this._view.webview.html = this._get_html(convertedContent, '', '')
    this.proofState = ''
  }

  public async check_and_clear_old_proof_state(maxAgeMs: number = 2000)
  {
    if (this.proofState && this.lastProofStateTime > 0) {
      const age = Date.now() - this.lastProofStateTime
      if (age > maxAgeMs) {
        await this.clear_proof_state()
      }
    }
  }

  private extractContentTypes(content: string): { mainContent: string, proofState: string | null, errorContent: string | null }
  {
    console.log('=== DEBUG: Extracting content types ===')
    console.log('Input content:', content)

    const lines = content.split('\n')
    const mainLines: string[] = []
    const proofLines: string[] = []
    const errorLines: string[] = []

    let currentSection: 'main' | 'proof' | 'error' = 'main'

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmedLine = line.trim()
      console.log(`Line ${i}: "${line}" -> Section: ${currentSection}`)

      // Detect proof state
      if (trimmedLine.includes('proof (prove)') ||
          trimmedLine.includes('goal (') ||
          trimmedLine.includes('subgoal') ||
          /^\d+\.\s+[A-Z⟶∀∃⇒⟵⟷∧∨¬λ]/u.test(trimmedLine)) {
        currentSection = 'proof'
        proofLines.push(line)
        console.log(`  -> Detected proof state, switched to proof section`)
        continue
      }

      // Detect error messages
      if (trimmedLine.includes('*** ') ||
          trimmedLine.includes('Error:') ||
          trimmedLine.includes('Failed') ||
          trimmedLine.includes('exception') ||
          trimmedLine.includes('Type unification failed') ||
          trimmedLine.includes('Bad context') ||
          trimmedLine.includes('using reset state') ||
          trimmedLine.includes('Bad fixed variable') ||
          trimmedLine.includes('Duplicate') ||
          trimmedLine.includes('Unknown') ||
          trimmedLine.includes('Undefined') ||
          /^At command/.test(trimmedLine)) {
        currentSection = 'error'
        errorLines.push(line)
        console.log(`  -> Detected error, switched to error section`)
        continue
      }

      // Continue current section or default to main
      if (currentSection === 'proof' && (trimmedLine === '' || /^\s*\d+\./.test(trimmedLine) || trimmedLine.includes('⟶') || trimmedLine.includes('∀') || trimmedLine.includes('∃'))) {
        proofLines.push(line)
        console.log(`  -> Continuing proof section`)
      } else if (currentSection === 'error' && (trimmedLine === '' || trimmedLine.startsWith('  ') || trimmedLine.includes('***'))) {
        errorLines.push(line)
        console.log(`  -> Continuing error section`)
      } else {
        currentSection = 'main'
        mainLines.push(line)
        console.log(`  -> Added to main section`)
      }
    }

    const mainContent = mainLines.join('\n').trim()
    const proofState = proofLines.length > 0 ? proofLines.join('\n').trim() : null
    const errorContent = errorLines.length > 0 ? errorLines.join('\n').trim() : null

    console.log('=== DEBUG: Results ===')
    console.log('Main content:', mainContent)
    console.log('Proof state:', proofState)
    console.log('Error content:', errorContent)
    console.log('=== DEBUG: End ===')

    return { mainContent, proofState, errorContent }
  }

  private _get_html(content: string, proofState: string = '', errorContent: string = ''): string
  {
    if (this._view?.webview) {
      return get_webview_html(content, proofState, errorContent, this._view.webview, this._extension_uri.fsPath)
    }
    return ""
  }
}

function open_webview_link(link: string)
{
  const uri = Uri.parse(link)
  const line = Number(uri.fragment) || 0
  const pos = new Position(line, 0)
  window.showTextDocument(uri.with({ fragment: '' }), {
    preserveFocus: false,
    selection: new Selection(pos, pos)
  })
}

function get_webview_html(content: string, proofState: string, errorContent: string, webview: Webview, extension_path: string): string
{
  const script_uri = webview.asWebviewUri(Uri.file(path.join(extension_path, 'media', 'main.js')))
  const css_uri = webview.asWebviewUri(Uri.file(path.join(extension_path, 'media', 'vscode.css')))
  const font_uri =
    webview.asWebviewUri(Uri.file(path.join(extension_path, 'fonts', 'IsabelleDejaVuSansMono.ttf')))

  // Prepare main content section
  const mainSection = content ? `
    <div class="content-section main-content">
      ${content.trim().startsWith('<pre') ? content : `<pre>${content}</pre>`}
    </div>` : ''

  // Prepare proof state section
  const proofSection = proofState ? `
    <div class="content-section proof-state">
      ${proofState.trim().startsWith('<pre') ? proofState : `<pre>${proofState}</pre>`}
    </div>` : ''

  // Prepare error content section
  const errorSection = errorContent ? `
    <div class="content-section error-content">
      ${errorContent.trim().startsWith('<pre') ? errorContent : `<pre>${errorContent}</pre>`}
    </div>` : ''

  return `<!DOCTYPE html>
    <html lang='en'>
      <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <link href='${css_uri}' rel='stylesheet' type='text/css'>
        <style>
            @font-face {
                font-family: "Isabelle DejaVu Sans Mono";
                src: url(${font_uri});
            }
            ${_get_decorations()}

            .content-section {
              margin: 5px 0;
              border-radius: 4px;
              padding: 8px;
            }

            .main-content {
              background-color: transparent;
            }

            .proof-state {
              background-color: rgba(0, 128, 0, 0.1);
              border-left: 4px solid rgba(0, 128, 0, 0.6);
            }

            .error-content {
              background-color: rgba(255, 0, 0, 0.1);
              border-left: 4px solid rgba(255, 0, 0, 0.6);
            }

            .content-section pre {
              margin: 0;
              padding: 0;
              background: transparent;
              border: none;
            }

            /* Dark theme adjustments */
            body.vscode-dark .proof-state {
              background-color: rgba(0, 255, 0, 0.08);
              border-left-color: rgba(0, 255, 0, 0.4);
            }

            body.vscode-dark .error-content {
              background-color: rgba(255, 100, 100, 0.08);
              border-left-color: rgba(255, 100, 100, 0.4);
            }
        </style>
        <title>Output</title>
      </head>
      <body>
        ${mainSection}
        ${proofSection}
        ${errorSection}
        <script src='${script_uri}'></script>
      </body>
    </html>`
}

function _get_decorations(): string
{
  let style: string[] = []
  for (const key of text_colors) {
    style.push(`body.vscode-light .${key} { color: ${vscode_lib.get_color(key, true)} }\n`)
    style.push(`body.vscode-dark .${key} { color: ${vscode_lib.get_color(key, false)} }\n`)
  }
  return style.join("")
}

export { Output_View_Provider, get_webview_html, open_webview_link }
