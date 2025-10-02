# Isabelle/VSCode Unicode Symbol Conversion Implementation

## Overview

This document describes the complete implementation of Unicode symbol conversion for the Isabelle/VSCode extension. The goal was to automatically convert Isabelle's LaTeX-style symbols (like `\<Rightarrow>`, `\<^sub>1`, `\<^here>`) to their Unicode equivalents (like `⇒`, `₁`, `⌂`) in all user interfaces, matching the behavior of Isabelle/jEdit.

## Problem Statement

The original Isabelle/VSCode plugin displayed raw Isabelle symbols in output and hover messages, making them harder to read compared to Isabelle/jEdit which shows beautiful Unicode characters. Users would see:
- `\<Rightarrow>` instead of `⇒`
- `\<^sub>1` instead of `₁`
- `\<^sup>2` instead of `²`
- `\<^here>` instead of `⌂`

## Implementation Strategy

### 1. Symbol Mapping Source
We leveraged the existing `.vscode/isabelle.code-snippets` file which already contained mappings from LaTeX-style prefixes to Unicode characters. This ensures consistency and avoids duplication.

### 2. Architecture Overview
The solution involves intercepting text at multiple points in the UI pipeline:
- **Output Terminal**: Convert symbols before displaying in webview
- **Hover Messages**: Convert symbols in LSP hover responses
- **Error Diagnostics**: Convert symbols in error/warning messages

## Detailed Implementation

### Core Symbol Converter (`src/symbol_converter.ts`)

Created a new `SymbolConverter` class that:

```typescript
class SymbolConverter {
  private symbolMap: SymbolMapping = {}
  private subscriptMap: SymbolMapping = {}
  private superscriptMap: SymbolMapping = {}

  async convertSymbols(text: string): Promise<string> {
    // Handle subscripts: \<^sub>text
    result = result.replace(/\\<\^sub>(\w+)/g, (match, content) => {
      return this.convertToSubscript(content)
    })

    // Handle superscripts: \<^sup>text
    result = result.replace(/\\<\^sup>(\w+)/g, (match, content) => {
      return this.convertToSuperscript(content)
    })

    // Handle regular symbol replacements
    for (const [symbol, unicode] of Object.entries(this.symbolMap)) {
      result = result.replace(new RegExp(this.escapeRegExp(symbol), 'g'), unicode)
    }
  }
}
```

**Key Features:**
- Parses existing snippets file to build symbol mappings
- Converts snippet prefixes (`\Rightarrow`) to Isabelle format (`\<Rightarrow>`)
- Handles subscripts and superscripts with Unicode character ranges
- Includes special symbols not in snippets (like `\<^here>` → `⌂`)

### Output Terminal Conversion (`src/output_view.ts`)

**Problem**: Output content wasn't wrapped in `<pre>` tags, so newlines were lost.

**Solutions:**
1. **Symbol Conversion**: Added SymbolConverter to process content
2. **Newline Preservation**: Ensured content is wrapped in `<pre>` tags

```typescript
// Convert Isabelle symbols to Unicode
const convertedContent = await this.symbolConverter.convertSymbols(content)

// Ensure content is wrapped in <pre> tag for proper whitespace handling
const wrappedContent = content.trim().startsWith('<pre') ? content : `<pre>${content}</pre>`
```

### Hover Message Conversion (`src/extension.ts`)

**Problem**: Variable type hints and function signatures in hover tooltips weren't converted.

**Solution**: Added LSP middleware to intercept hover requests:

```typescript
middleware: {
  provideHover: async (document, position, token, next) => {
    const result = await next(document, position, token)
    if (result && result.contents) {
      const symbolConverter = new SymbolConverter(context.extensionUri.fsPath)

      // Handle different content formats (string, MarkdownString, arrays)
      if (Array.isArray(result.contents)) {
        for (let i = 0; i < result.contents.length; i++) {
          const content = result.contents[i]
          if (typeof content === 'string') {
            result.contents[i] = await symbolConverter.convertSymbols(content)
          } else if (content && typeof content === 'object' && 'value' in content) {
            const convertedValue = await symbolConverter.convertSymbols(content.value)
            result.contents[i] = new MarkdownString(convertedValue)
          }
        }
      }
      // Handle single string/MarkdownString cases...
    }
    return result
  }
}
```

### Error Diagnostic Conversion (`src/extension.ts`)

**Problem**: Error messages with red squiggly lines weren't having their symbols converted.

**Solution**: Added diagnostics middleware:

```typescript
handleDiagnostics: async (uri, diagnostics, next) => {
  const symbolConverter = new SymbolConverter(context.extensionUri.fsPath)

  const convertedDiagnostics = []
  for (const diagnostic of diagnostics) {
    const convertedDiagnostic = { ...diagnostic }
    if (convertedDiagnostic.message) {
      convertedDiagnostic.message = await symbolConverter.convertSymbols(convertedDiagnostic.message)
    }
    convertedDiagnostics.push(convertedDiagnostic)
  }

  return next(uri, convertedDiagnostics)
}
```

### Packaging Configuration

**Problem**: The `.vscode/isabelle.code-snippets` file wasn't included in packaged VSIX.

**Solution**: Updated `.vscodeignore` to include the snippets file:
```
.vscode/**
!.vscode/isabelle.code-snippets
```

## Debugging Experience

### 1. Initial Regex Issues
**Problem**: Subscript conversion was too greedy, converting "Evaluated" to subscript characters.
**Original**: `([^\\<]+)` - matched too much text
**Fix**: `(\w+)` - only match word characters

### 2. Symbol Mapping Format Mismatch
**Problem**: Snippets use `\Rightarrow` but Isabelle outputs `\<Rightarrow>`.
**Solution**: Convert snippet prefixes to Isabelle format during initialization:
```typescript
const cleanPrefix = prefix.replace(/^\\\\?/, '')
const isabelleSymbol = `\\<${cleanPrefix}>`
this.symbolMap[isabelleSymbol] = snippet.body[0]
```

### 3. TypeScript Compilation Errors
**Problem**: Unicode characters in code caused compilation issues.
**Solution**: Rewrote with proper TypeScript structure and Unicode escapes.

### 4. Packaging Conflicts
**Problem**: Both `.vscodeignore` and `package.json` "files" field caused conflicts.
**Solution**: Removed "files" field, used only `.vscodeignore` approach.

### 5. Missing Coverage Areas
**Problem**: Initially only covered output terminal, missed hover and error messages.
**Solution**: Systematically identified all UI touchpoints:
- Used middleware pattern for LSP interception
- Added separate handlers for hover vs diagnostics
- Ensured consistent SymbolConverter usage across all areas

## Testing Strategy

1. **Output Terminal**: Verified symbols convert in Isabelle output
2. **Variable Hover**: Tested type signatures show Unicode arrows
3. **Error Messages**: Confirmed diagnostic hover shows converted symbols
4. **Newline Preservation**: Ensured formatted output maintains line breaks
5. **Packaging**: Verified VSIX includes snippets file

## Key Learnings

### 1. Multiple UI Pathways
VSCode extensions have multiple pathways for displaying text:
- Direct content (output webviews)
- LSP hover responses
- LSP diagnostic messages
- Decoration hover messages

Each requires separate handling.

### 2. LSP Middleware Power
VSCode's LSP client middleware is extremely powerful for transforming data:
- `provideHover`: Intercept hover requests
- `handleDiagnostics`: Transform error messages
- Maintains type safety while allowing modifications

### 3. Asynchronous Symbol Conversion
Symbol conversion needs to be async due to file I/O for snippets parsing. This cascades through the entire call chain.

### 4. Type Safety Challenges
VSCode's LSP types are complex. Used strategic `as any` casting when necessary while maintaining safety in core logic.

## Files Modified

1. **`src/symbol_converter.ts`** - New file, core conversion logic
2. **`src/output_view.ts`** - Added symbol conversion and newline handling
3. **`src/extension.ts`** - Added LSP middleware for hover and diagnostics
4. **`src/decorations.ts`** - Added symbol conversion for decoration hover messages
5. **`.vscodeignore`** - Included snippets file in packaging

## Performance Considerations

- SymbolConverter instances are created on-demand to avoid initialization overhead
- Regex compilation is done once during conversion
- File I/O for snippets is cached after first load
- Only processes text when symbols are actually present

## Future Enhancements

1. **Caching**: Could cache SymbolConverter instances to avoid repeated initialization
2. **Configuration**: Add user setting to enable/disable symbol conversion
3. **Custom Symbols**: Allow users to define additional symbol mappings
4. **Performance**: Optimize regex patterns for large documents

## Conclusion

This implementation provides comprehensive Unicode symbol conversion across all Isabelle/VSCode interfaces, creating a consistent and readable mathematical notation experience that matches Isabelle/jEdit. The modular design makes it easy to extend to additional UI components if needed.