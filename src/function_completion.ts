/*  Author:     Claude (Anthropic)

Function definition completion provider for Isabelle.
*/

'use strict';

import {
  CompletionItemProvider,
  CompletionItem,
  CompletionItemKind,
  TextDocument,
  Position,
  Range,
  SnippetString,
  workspace
} from 'vscode';

// Keywords that start a function definition
const FUNCTION_KEYWORDS = ['fun', 'function', 'primrec', 'definition', 'primcorec', 'corec'];

/**
 * Completion provider for type signature after `::`
 * Triggers when user types `:: ` after a function keyword
 */
export class TypeSignatureCompletionProvider implements CompletionItemProvider {

  provideCompletionItems(document: TextDocument, position: Position): CompletionItem[] {
    const lineText = document.lineAt(position.line).text;
    const textBeforeCursor = lineText.substring(0, position.character);

    // Check if we just typed `:: ` after a function keyword
    const typeAnnotationPattern = new RegExp(`^\\s*(${FUNCTION_KEYWORDS.join('|')})\\s+\\w+\\s+::\\s*$`);

    if (typeAnnotationPattern.test(textBeforeCursor)) {
      const item = new CompletionItem('Function type signature', CompletionItemKind.Snippet);
      item.insertText = new SnippetString('"$1 ⇒ $2" where');
      item.detail = 'Complete function type signature';
      item.documentation = 'Inserts type signature template with placeholder for input and output types';
      item.sortText = '0'; // Make it appear first

      return [item];
    }

    return [];
  }
}

/**
 * Completion provider for function body after `where`
 * Triggers when user presses Enter after `where` or after a function definition line
 * Supports multi-line function definitions
 */
export class FunctionBodyCompletionProvider implements CompletionItemProvider {

  provideCompletionItems(document: TextDocument, position: Position): CompletionItem[] {
    if (position.line === 0) return [];

    const previousLine = document.lineAt(position.line - 1).text;
    const currentLineText = document.lineAt(position.line).text;
    const textBeforeCursor = currentLineText.substring(0, position.character);

    // Don't trigger if current line already has content (not just whitespace)
    if (textBeforeCursor.trim() !== '') return [];

    // Check if previous line is empty - indicates user pressed Enter twice (wants to stop)
    if (previousLine.trim() === '') return [];

    const result = this.extractFunctionInfo(document, position.line - 1);
    if (!result) return [];

    const { functionName, keyword } = result;

    // Use ≡ for definition, = for other keywords
    const equalSign = keyword === 'definition' ? '≡' : '=';

    // Calculate the range to replace (from start of line to cursor position)
    // This will delete any auto-indentation
    const rangeToReplace = new Range(
      new Position(position.line, 0),
      position
    );

    // Case 1: Previous line ends with 'where' - this is the first function definition
    if (previousLine.trim().endsWith('where')) {
      const item = new CompletionItem('First function definition', CompletionItemKind.Snippet);
      item.insertText = new SnippetString(`  "${functionName} $1 ${equalSign} $2"`);
      item.range = rangeToReplace;  // Replace the auto-indented whitespace
      item.detail = `First pattern for ${functionName}`;
      item.documentation = 'Inserts first function definition pattern';
      item.sortText = '0';
      return [item];
    }

    // Case 2: Previous line is a function definition - add another pattern with |
    if (this.isFunctionDefinitionLine(previousLine, functionName, equalSign)) {
      const item = new CompletionItem('Continue function definition', CompletionItemKind.Snippet);
      item.insertText = new SnippetString(`| "${functionName} $1 ${equalSign} $2"`);
      item.range = rangeToReplace;  // Replace the auto-indented whitespace
      item.detail = `Next pattern for ${functionName}`;
      item.documentation = 'Inserts additional function definition pattern with | separator';
      item.sortText = '0';
      return [item];
    }

    return [];
  }

  /**
   * Check if a line is a function definition line
   * Matches pattern: optional | followed by "functionName ... = ..." or "functionName ... ≡ ..."
   */
  private isFunctionDefinitionLine(line: string, functionName: string, equalSign: string): boolean {
    // Escape the equal sign for regex (≡ doesn't need escaping, but = does in some contexts)
    const escapedEqual = equalSign.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Match pattern: optional whitespace, optional |, whitespace, "functionName, then anything, then = or ≡
    const pattern = new RegExp(
      `^\\s*\\|?\\s*"${functionName}\\s+.*${escapedEqual}.*"?\\s*$`
    );
    return pattern.test(line);
  }

  /**
   * Extract function name and keyword from the function definition
   * Looks for pattern: `fun functionName ::` or similar
   * Also checks for existing function definition lines
   * Returns {functionName, keyword} or null
   */
  private extractFunctionInfo(document: TextDocument, startLine: number): { functionName: string; keyword: string } | null {
    // Search backwards from the current position
    for (let i = startLine; i >= Math.max(0, startLine - 20); i--) {
      const line = document.lineAt(i).text;

      // First try to match the function keyword declaration
      const keywordPattern = new RegExp(`^\\s*(${FUNCTION_KEYWORDS.join('|')})\\s+(\\w+)\\s+::`);
      const keywordMatch = keywordPattern.exec(line);
      if (keywordMatch) {
        return {
          functionName: keywordMatch[2],  // Function name
          keyword: keywordMatch[1]         // Keyword (fun, function, definition, etc.)
        };
      }

      // Also try to extract from existing function definition line
      // Pattern: "functionName ... = ..." or "functionName ... ≡ ..."
      const defPattern = /^\s*\|?\s*"(\w+)\s+.*[=≡]/;
      const defMatch = defPattern.exec(line);
      if (defMatch) {
        // Found a definition line, need to search further back for the keyword
        const functionName = defMatch[1];
        // Continue searching backwards for the keyword
        for (let j = i - 1; j >= Math.max(0, startLine - 20); j--) {
          const prevLine = document.lineAt(j).text;
          const keywordPattern2 = new RegExp(`^\\s*(${FUNCTION_KEYWORDS.join('|')})\\s+${functionName}\\s+::`);
          const keywordMatch2 = keywordPattern2.exec(prevLine);
          if (keywordMatch2) {
            return {
              functionName: functionName,
              keyword: keywordMatch2[1]
            };
          }
        }
        // If we can't find the keyword, default to 'fun' and return the function name
        return {
          functionName: functionName,
          keyword: 'fun'  // Default fallback
        };
      }
    }

    return null;
  }
}
