const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');

test('emoji aliases retain their human-readable descriptions from gemoji', async () => {
    const data = await import('gemoji');
    const code = ts.transpileModule(
        fs.readFileSync(path.join(__dirname, '../src/emoji.ts'), 'utf8'),
        { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2018 } },
    ).outputText;
    const exports = {};
    new Function('require', 'exports', code)(name => {
        assert.equal(name, 'gemoji');
        return data;
    }, exports);
    const provider = new exports.EmojiProvider();
    const thumbsUp = data.gemoji.find(record => record.names.includes('thumbsup'));
    for (const name of thumbsUp.names) {
        const emoji = provider.lookup(name);
        assert.equal(emoji.name, name);
        assert.equal(emoji.emoji, thumbsUp.emoji);
        assert.equal(emoji.description, thumbsUp.description);
        assert.deepEqual(emoji.tags, thumbsUp.tags);
    }
    assert(provider.emojis.every(emoji => typeof emoji.description === 'string' && emoji.description.length > 0));
    assert(provider.emojis.every(emoji => Array.isArray(emoji.tags)));
});
