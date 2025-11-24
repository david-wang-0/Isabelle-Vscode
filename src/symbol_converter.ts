/*  Author:     Assistant

Symbol converter for Isabelle output - converts LaTeX-style symbols to Unicode.
*/

'use strict';

import * as fs from 'fs'
import * as path from 'path'

interface SymbolMapping {
  [key: string]: string
}

class SymbolConverter {
  private symbolMap: SymbolMapping = {}
  private reverseSymbolMap: SymbolMapping = {}
  private reverseRegex: RegExp | null = null
  private subscriptMap: SymbolMapping = {}
  private reverseSubscriptMap: SymbolMapping = {}
  private superscriptMap: SymbolMapping = {}
  private reverseSuperscriptMap: SymbolMapping = {}
  private initialized: boolean = false

  constructor(private extensionPath: string) {
    this.initializeControlSymbols()
  }

  // Initialize subscript/superscript mappings
  private initializeControlSymbols() {
    this.subscriptMap = {
      '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
      'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ', 'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ',
      'o': 'ₒ', 'p': 'ₚ', 'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ', 'v': 'ᵥ', 'x': 'ₓ'
    }

    // Generate reverse subscript map
    for (const [key, value] of Object.entries(this.subscriptMap)) {
      this.reverseSubscriptMap[value] = key
    }

    this.superscriptMap = {
      '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
      'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ', 'f': 'ᶠ', 'g': 'ᵍ', 'h': 'ʰ', 'i': 'ⁱ',
      'j': 'ʲ', 'k': 'ᵏ', 'l': 'ˡ', 'm': 'ᵐ', 'n': 'ⁿ', 'o': 'ᵒ', 'p': 'ᵖ', 'r': 'ʳ', 's': 'ˢ',
      't': 'ᵗ', 'u': 'ᵘ', 'v': 'ᵛ', 'w': 'ʷ', 'x': 'ˣ', 'y': 'ʸ', 'z': 'ᶻ'
    }

    // Generate reverse superscript map
    for (const [key, value] of Object.entries(this.superscriptMap)) {
      this.reverseSuperscriptMap[value] = key
    }

    // Add special control symbols not in snippets
    this.symbolMap['\\<^here>'] = '⌂'
  }

  // Initialize symbol mappings from snippets file
  private async initializeSymbolMap() {
    if (this.initialized) return

    try {
      // Try to find snippets in snippets folder (extension structure)
      let snippetsPath = path.join(this.extensionPath, 'snippets', 'isabelle-snippets')
      
      if (!fs.existsSync(snippetsPath)) {
        // Fallback to checking relative to CWD (useful for tests)
        const cwdPath = path.join(process.cwd(), 'snippets', 'isabelle-snippets')
        if (fs.existsSync(cwdPath)) {
          snippetsPath = cwdPath
        }
      }

      if (fs.existsSync(snippetsPath)) {
        const snippetsContent = fs.readFileSync(snippetsPath, 'utf8')
        const snippets = JSON.parse(snippetsContent)

        // The file format is simple key-value: { "\\<zero>": "𝟬", ... }
        // We can merge this directly into symbolMap
        Object.assign(this.symbolMap, snippets)
      }

      // Build reverse symbol map
      // We want to map Unicode -> Isabelle Symbol
      // If multiple Isabelle symbols map to the same Unicode, we need a strategy.
      // We prioritize the longest Isabelle symbol name (or just the last one encountered if lengths equal)
      // But more importantly, when constructing the regex, we must sort by Unicode string length descending.
      
      // Also, we need to avoid abbreviations like \=> mapping to ⇒ if \<Rightarrow> is available.
      // The snippets file contains prefixes like "\\Rightarrow", "\\=>".
      // Our logic converts them to "\<Rightarrow>", "\<=>".
      // We want to prefer "\<Rightarrow>" over "\<=>".
      // Heuristic: Prefer the one that looks like a full word (longer is usually better for standard symbols).
      // Also, standard symbols usually don't contain non-alphanumeric characters inside the brackets (except for special ones).
      // Let's collect all candidates for each unicode char first.
      
      const unicodeToIsabelleCandidates: { [unicode: string]: string[] } = {}

      for (const [isabelle, unicode] of Object.entries(this.symbolMap)) {
        if (!unicodeToIsabelleCandidates[unicode]) {
          unicodeToIsabelleCandidates[unicode] = []
        }
        unicodeToIsabelleCandidates[unicode].push(isabelle)
      }

      for (const [unicode, candidates] of Object.entries(unicodeToIsabelleCandidates)) {
        // Select the best candidate
        // 1. Prefer candidates that contain only letters inside \<...> (e.g. \<Rightarrow> over \<=>)
        // 2. If multiple match, prefer the longest one (e.g. \<longleftrightarrow> over \<leftrightarrow> if they mapped to same, though they don't)
        //    Actually, for aliases like \<=> vs \<Rightarrow>, \<Rightarrow> is longer and has letters.
        
        const bestCandidate = candidates.sort((a, b) => {
          const aContent = a.substring(2, a.length - 1)
          const bContent = b.substring(2, b.length - 1)
          
          const aIsAlpha = /^[a-zA-Z]+$/.test(aContent)
          const bIsAlpha = /^[a-zA-Z]+$/.test(bContent)

          if (aIsAlpha && !bIsAlpha) return -1 // a comes first
          if (!aIsAlpha && bIsAlpha) return 1 // b comes first
          
          // If both are alpha or both are not, prefer longer length
          return b.length - a.length
        })[0]

        this.reverseSymbolMap[unicode] = bestCandidate
      }

      // Construct the big regex for reverse conversion
      // Sort keys by length descending to ensure greedy matching
      const sortedKeys = Object.keys(this.reverseSymbolMap).sort((a, b) => b.length - a.length)
      if (sortedKeys.length > 0) {
        const pattern = sortedKeys.map(key => this.escapeRegExp(key)).join('|')
        this.reverseRegex = new RegExp(pattern, 'g')
      }

      this.initialized = true
    } catch (error) {
      console.error('Failed to initialize symbol map:', error)
    }
  }

  // Convert Isabelle symbols to Unicode
  async convertSymbols(text: string): Promise<string> {
    await this.initializeSymbolMap()

    let result = text

    // First, handle subscripts and superscripts before general symbol replacement
    // Handle subscripts: \<^sub>text (only convert until next space or symbol)
    result = result.replace(/\\<\^sub>(\w+)/g, (match, content) => {
      return this.convertToSubscript(content)
    })

    // Handle superscripts: \<^sup>text (only convert until next space or symbol)
    result = result.replace(/\\<\^sup>(\w+)/g, (match, content) => {
      return this.convertToSuperscript(content)
    })

    // Then handle regular symbol replacements
    for (const [symbol, unicode] of Object.entries(this.symbolMap)) {
      result = result.replace(new RegExp(this.escapeRegExp(symbol), 'g'), unicode)
    }

    return result
  }

  // Convert Unicode to Isabelle symbols
  async convertUnicodeToIsabelle(text: string): Promise<string> {
    await this.initializeSymbolMap()

    let result = text.normalize('NFC')

    // 1. Handle subscripts: convert continuous sequence of subscript characters
    // We construct a regex character class from all subscript keys
    const subChars = Object.keys(this.reverseSubscriptMap).join('')
    if (subChars) {
      const subRegex = new RegExp(`([${subChars}]+)`, 'g')
      result = result.replace(subRegex, (match) => {
        const converted = match.split('').map(c => this.reverseSubscriptMap[c] || c).join('')
        return `\\<^sub>${converted}`
      })
    }

    // 2. Handle superscripts: convert continuous sequence of superscript characters
    const supChars = Object.keys(this.reverseSuperscriptMap).join('')
    if (supChars) {
      const supRegex = new RegExp(`([${supChars}]+)`, 'g')
      result = result.replace(supRegex, (match) => {
        const converted = match.split('').map(c => this.reverseSuperscriptMap[c] || c).join('')
        return `\\<^sup>${converted}`
      })
    }

    // 3. Handle general symbols using the pre-compiled regex
    if (this.reverseRegex) {
      result = result.replace(this.reverseRegex, (match) => {
        return this.reverseSymbolMap[match] || match
      })
    }

    return result
  }

  private convertToSubscript(text: string): string {
    return text.split('').map(char => this.subscriptMap[char] || char).join('')
  }

  private convertToSuperscript(text: string): string {
    return text.split('').map(char => this.superscriptMap[char] || char).join('')
  }

  // Utility function to escape special regex characters
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
}

export { SymbolConverter }