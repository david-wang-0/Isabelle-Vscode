# Proof State Display Implementation

## Overview
This document describes the implementation of real-time proof state display functionality in the Isabelle/VSCode extension. The feature enables users to see proof states directly in the output terminal as they work through theorem proofs.

## Problem Statement
The original Isabelle/VSCode extension did not display proof states in the output terminal. When users entered theorem statements like:
```isabelle
theorem prop1: ‹(A ⟶ B ⟶ C) ⟶ (A ⟶ B) ⟶ A ⟶ C›
```
The extension would not show the corresponding proof state:
```
proof (prove)
goal (1 subgoal):
 1. (A ⟶ B ⟶ C) ⟶ (A ⟶ B) ⟶ A ⟶ C
```

## Architecture Overview
The Isabelle/VSCode extension uses a Language Server Protocol (LSP) architecture:
- **TypeScript client**: Handles VSCode UI and WebView display
- **Scala server**: Processes Isabelle logic and sends notifications
- **LSP notifications**: `PIDE/dynamic_output` and `PIDE/state_output`

## Implementation Details

### 1. Core Files Modified

#### `src/output_view.ts` - Main Implementation
- **Added proof state tracking**: New `proofState` field and `lastProofStateTime` timestamp
- **Content classification**: `extractContentTypes()` method to separate main content, proof states, and errors
- **Visual styling**: HTML/CSS for green proof state backgrounds and red error backgrounds
- **Cursor responsiveness**: `check_and_clear_old_proof_state()` method for automatic clearing

#### `src/extension.ts` - LSP Integration
- **Added LSP listeners**: For `dynamic_output_type` and `state_output_type` notifications
- **Cursor tracking**: `onDidChangeTextEditorSelection` listener with 500ms delay
- **Symbol conversion**: Middleware for hover and diagnostic message conversion

#### `src/lsp.ts` - Type Definitions
- Examined existing LSP notification types for proof state communication

#### `src/state_panel.ts` - Compatibility Fix
- Updated function calls to match new `get_webview_html` signature

### 2. Key Methods Implemented

#### Content Classification (`extractContentTypes`)
```typescript
private extractContentTypes(content: string): {
  mainContent: string,
  proofState: string | null,
  errorContent: string | null
}
```
**Purpose**: Intelligently separates incoming content into three categories:
- **Main content**: Regular output text
- **Proof states**: Lines containing "proof (prove)", "goal (", "subgoal", numbered goals
- **Error content**: Lines with error keywords like "***", "Error:", "Bad context", etc.

**Detection patterns**:
- Proof states: `/^\d+\.\s+[A-Z⟶∀∃⇒⟵⟷∧∨¬λ]/u`, "proof (prove)", "goal (", "subgoal"
- Errors: "***", "Error:", "Failed", "Bad context", "using reset state", etc.

#### Proof State Updates (`update_content`)
```typescript
public async update_content(content: string)
```
**Purpose**: Main entry point for content updates from LSP server
- Extracts content types from incoming text
- Converts Isabelle symbols to Unicode
- Updates HTML display with visual separation
- Manages proof state timestamps for cursor responsiveness

#### Cursor Responsiveness (`check_and_clear_old_proof_state`)
```typescript
public async check_and_clear_old_proof_state(maxAgeMs: number = 2000)
```
**Purpose**: Automatically clears proof states when cursor moves away
- Checks if current proof state is older than threshold (default 1.5 seconds)
- Called with 500ms delay after cursor selection changes
- Ensures proof states only show for current cursor position

### 3. Visual Design

#### CSS Styling
```css
.proof-state {
  background-color: rgba(0, 128, 0, 0.1);
  border-left: 4px solid rgba(0, 128, 0, 0.6);
}

.error-content {
  background-color: rgba(255, 0, 0, 0.1);
  border-left: 4px solid rgba(255, 0, 0, 0.6);
}
```

#### Dark Theme Support
```css
body.vscode-dark .proof-state {
  background-color: rgba(0, 255, 0, 0.08);
  border-left-color: rgba(0, 255, 0, 0.4);
}
```

### 4. Error Detection Patterns
Enhanced error detection to catch common Isabelle error messages:
- `Bad context for command "end"⌂ -- using reset state`
- `Type unification failed`
- `Duplicate` definitions
- `Unknown` identifiers
- `Undefined` references

## Development Process

### Phase 1: Initial Research
- Analyzed existing Unicode symbol conversion system
- Studied LSP architecture and notification flow
- Identified key files and extension points

### Phase 2: Basic Implementation
- Added proof state fields to `Output_View_Provider`
- Implemented basic content extraction logic
- Added LSP notification listeners

### Phase 3: Content Classification
- Discovered proof states come through `dynamic_output` not `state_output`
- Implemented intelligent content type detection
- Added visual styling with color-coded backgrounds

### Phase 4: Cursor Responsiveness
- Added timestamp tracking for proof states
- Implemented automatic clearing mechanism
- Added cursor selection change listener with delay

### Phase 5: Bug Fixes and Enhancement
- Fixed error detection patterns (e.g., "Bad context")
- Resolved content accumulation issues
- Added comprehensive debugging logging

## Technical Challenges Resolved

### 1. Content Accumulation Bug
**Problem**: Proof states were accumulating instead of replacing
**Solution**: Modified logic to always replace proof state content rather than append

### 2. Error Detection Gaps
**Problem**: Some Isabelle errors not recognized (e.g., "Bad context")
**Solution**: Expanded error detection patterns to include more Isabelle-specific messages

### 3. Cursor Responsiveness
**Problem**: Proof states not clearing when cursor moved to different lines
**Solution**: Implemented timestamp-based automatic clearing with cursor tracking

### 4. Mixed Content Handling
**Problem**: Proof states and errors mixed together in display
**Solution**: Intelligent content classification with separate visual styling

## Configuration

### Package.json Settings
```json
"isabelle.options": {
  "default": {
    "editor_output_state": "true"
  }
}
```

### LSP Notification Types
- `PIDE/dynamic_output`: Main content updates with proof states
- `PIDE/state_output`: State panel updates
- `PIDE/caret_update`: Cursor position tracking

## Testing Scenarios

### Basic Proof State Display
```isabelle
theorem prop1: ‹(A ⟶ B ⟶ C) ⟶ (A ⟶ B) ⟶ A ⟶ C›
apply (rule impI)+
apply (erule mp)+
done
```

Expected behavior:
- Each line shows its corresponding proof state
- Green background for proof states
- Automatic clearing when cursor moves

### Error Handling
```isabelle
theorem bad_theorem: ‹invalid_syntax
```

Expected behavior:
- Error messages displayed with red background
- Proper error detection and classification

## Future Enhancements

### Potential Improvements
1. **Configurable styling**: Allow users to customize colors and layout
2. **Performance optimization**: Reduce LSP communication overhead
3. **Enhanced error patterns**: Add more Isabelle-specific error detection
4. **State persistence**: Option to keep proof states visible longer

### Known Limitations
1. **Server dependency**: Requires Isabelle server support for proof state notifications
2. **Timing sensitivity**: Cursor responsiveness depends on server response times
3. **Content parsing**: Relies on text pattern matching for content classification

## Debugging

### Debug Logging
Added comprehensive console logging for troubleshooting:
```typescript
console.log('=== DEBUG: Extracting content types ===')
console.log('Input content:', content)
// ... detailed line-by-line processing logs
```

### Developer Tools
Use VSCode Developer Tools (Help -> Toggle Developer Tools) to monitor:
- LSP notification flow
- Content classification results
- Timing of cursor events

## Conclusion
The proof state display implementation successfully adds real-time theorem proving feedback to the Isabelle/VSCode extension. The solution integrates seamlessly with the existing LSP architecture while providing responsive, visually distinct display of proof states and error messages.