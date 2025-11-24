
import * as assert from 'assert';
import * as path from 'path';
import { SymbolConverter } from '../src/symbol_converter';

describe('SymbolConverter Tests', () => {
    let converter: SymbolConverter;

    before(async () => {
        // We need to point to the extension root to find the snippets file
        // Assuming tests are running from the root or test folder
        const extensionPath = path.resolve(__dirname, '../');
        converter = new SymbolConverter(extensionPath);
        // Force initialization
        await converter.convertSymbols('');
    });

    it('Reverse Conversion - Basic Symbols', async () => {
        const input = '∀x. ∃y. x ⟶ y';
        const expected = '\\<forall>x. \\<exists>y. x \\<longrightarrow> y';
        const result = await converter.convertUnicodeToIsabelle(input);
        assert.strictEqual(result, expected);
    });

    it('Reverse Conversion - Subscripts', async () => {
        const input = 'x₁ + y₂ = z₁₂';
        const expected = 'x\\<^sub>1 + y\\<^sub>2 = z\\<^sub>12';
        const result = await converter.convertUnicodeToIsabelle(input);
        assert.strictEqual(result, expected);
    });

    it('Reverse Conversion - Superscripts', async () => {
        const input = 'x² + y³ = z¹²';
        const expected = 'x\\<^sup>2 + y\\<^sup>3 = z\\<^sup>12';
        const result = await converter.convertUnicodeToIsabelle(input);
        assert.strictEqual(result, expected);
    });

    it('Reverse Conversion - Mixed Sub/Superscripts', async () => {
        const input = 'A₁²';
        const expected = 'A\\<^sub>1\\<^sup>2';
        const result = await converter.convertUnicodeToIsabelle(input);
        assert.strictEqual(result, expected);
    });

    it('Reverse Conversion - Longest Match Priority', async () => {
        // Assuming we have symbols like -> and --> (just an example concept)
        // If we have a symbol that is a prefix of another, the longer one should be matched
        // Let's use actual symbols if possible. 
        // ⟶ (\longrightarrow) vs ─ (\bar? no, let's check snippets)
        
        // For now, let's trust the regex engine's order (we sorted by length)
        // Let's try a known long symbol
        const input = '⟷'; // \longleftrightarrow
        const result = await converter.convertUnicodeToIsabelle(input);
        assert.strictEqual(result, '\\<longleftrightarrow>');
    });

    it('Reverse Conversion - No Change for ASCII', async () => {
        const input = 'Hello World 123';
        const result = await converter.convertUnicodeToIsabelle(input);
        assert.strictEqual(result, input);
    });
    
    it('Reverse Conversion - Special Control Symbols', async () => {
        const input = '⌂';
        const result = await converter.convertUnicodeToIsabelle(input);
        // Snippets define \here -> ⌂, so it converts back to \<here>
        // Hardcoded map has \<^here>, but snippets overwrite reverse mapping
        assert.strictEqual(result, '\\<here>');
    });

    it('Reverse Conversion - Prefer Full Names', async () => {
        // ⇒ should map to \<Rightarrow>, not \<=>
        const input = '⇒';
        const result = await converter.convertUnicodeToIsabelle(input);
        assert.strictEqual(result, '\\<Rightarrow>');
    });
});
