const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');

// Exercise the actual TypeScript implementation without installing a VS Code host.
const code = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, '../src/quickEmoji.ts'), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2018 } },
).outputText;

// Deliberately put fuzzy matches before prefixes and the exact match.
const emojis = [
    { name: 'sweat_smile', emoji: '😅' },
    { name: 'smile_cat', emoji: '😸' },
    { name: 'smiley', emoji: '😃' },
    { name: 'smile', emoji: '😄' },
    { name: 'cat', emoji: '🐱' },
    { name: '+1', emoji: '👍' },
    { name: 'thumbsup', emoji: '👍' },
];
const originalNames = emojis.map(emoji => emoji.name);

function openPicker({ settings = {}, property = 'emoji', destination = 'editor', dataset = emojis } = {}) {
    let onChange;
    let onAccept;
    let onHide;
    let items = [];
    let activeItems = [];
    let itemUpdates = 0;
    let focusUpdates = 0;
    let disposed = false;
    const insertions = [];
    const terminalWrites = [];
    const commands = [];
    const picker = {
        get items() { return items; },
        set items(value) {
            items = value;
            activeItems = value.slice(0, 1);
            itemUpdates++;
        },
        get activeItems() { return activeItems; },
        set activeItems(value) { activeItems = value; focusUpdates++; },
        selectedItems: [],
        onDidChangeValue(callback) { onChange = callback; },
        onDidAccept(callback) { onAccept = callback; },
        onDidHide(callback) { onHide = callback; },
        show() {},
        hide() { onHide(); },
        dispose() { disposed = true; },
    };
    const api = {
        workspace: {
            getConfiguration: () => ({ get: (key, fallback) => settings[key] ?? fallback }),
        },
        window: {
            createQuickPick: () => picker,
            activeTextEditor: {
                document: { uri: {} },
                selection: { active: {} },
                edit: async callback => callback({ insert: (_, text) => insertions.push(text) }),
            },
            activeTerminal: { sendText: (text, addNewLine) => terminalWrites.push({ text, addNewLine }) },
        },
        commands: { executeCommand: async command => { commands.push(command); } },
    };
    const exports = {};
    new Function('require', 'exports', code)(name => {
        assert.equal(name, 'vscode');
        return api;
    }, exports);
    const done = exports.quickEmoji({ emojis: dataset })(property, destination)();

    return {
        picker, done, api, insertions, terminalWrites, commands,
        get names() { return picker.items.map(item => item.emoji.name); },
        get itemUpdates() { return itemUpdates; },
        get focusUpdates() { return focusUpdates; },
        get hasChangeHandler() { return !!onChange; },
        get disposed() { return disposed; },
        change(value) {
            // Simulate native focus before notifying the extension. Native fuzzy
            // filtering/rendering itself is outside the scope of these tests.
            activeItems = items.slice(0, 1);
            onChange?.(value);
        },
        select(name) { activeItems = [items.find(item => item.emoji.name === name)]; },
        async accept() {
            picker.selectedItems = activeItems;
            onAccept();
            await done;
        },
        async cancel() { picker.hide(); await done; },
    };
}

const combinations = [
    { exact: false, prefix: false, expected: originalNames, focused: undefined },
    {
        exact: true, prefix: false,
        expected: ['smile', 'sweat_smile', 'smile_cat', 'smiley', 'cat', '+1', 'thumbsup'],
        focused: 'smile',
    },
    {
        exact: false, prefix: true,
        expected: ['smile_cat', 'smiley', 'smile', 'sweat_smile', 'cat', '+1', 'thumbsup'],
        focused: 'smile_cat',
    },
    {
        exact: true, prefix: true,
        expected: ['smile', 'smile_cat', 'smiley', 'sweat_smile', 'cat', '+1', 'thumbsup'],
        focused: 'smile',
    },
];

for (const { exact, prefix, expected, focused } of combinations) {
    test(`independent preferences: exact=${exact}, prefix=${prefix}`, async t => {
        const session = openPicker({ settings: {
            'picker.preferExactMatch': exact, 'picker.preferPrefixMatch': prefix,
        } });
        t.after(() => session.cancel());
        session.change('smile');
        assert.deepEqual(session.names, expected);
        assert.equal(new Set(session.names).size, emojis.length);
        assert.equal(session.names.filter(name => name === 'smile').length, 1);
        if (focused) {
            assert.equal(session.picker.activeItems.length, 1);
            assert.equal(session.picker.activeItems[0].emoji.name, focused);
        } else {
            assert.equal(session.focusUpdates, 0);
        }
    });
}

test('both preferences default to enabled', async t => {
    const session = openPicker();
    t.after(() => session.cancel());
    session.change('smile');
    assert.deepEqual(session.names, combinations[3].expected);
});

for (const query of ['smile', ':smile:', ':smile', 'smile:', 'SMILE', '  :SMILE:  ']) {
    test(`normalizes ${JSON.stringify(query)} without dropping other candidates`, async t => {
        const session = openPicker();
        t.after(() => session.cancel());
        session.change(query);
        assert.deepEqual(session.names, combinations[3].expected);
        assert.equal(session.picker.activeItems[0].emoji.name, 'smile');
    });
}

test('partial input favors prefixes and preserves fuzzy candidates in their original order', async t => {
    const session = openPicker();
    t.after(() => session.cancel());
    session.change('smi');
    assert.deepEqual(session.names, combinations[2].expected);
    assert.equal(session.picker.activeItems[0].emoji.name, 'smile_cat');
});

test('exact-only mode does not promote prefixes', async t => {
    const session = openPicker({ settings: { 'picker.preferPrefixMatch': false } });
    t.after(() => session.cancel());
    session.change('smi');
    assert.deepEqual(session.names, originalNames);
    assert.equal(session.focusUpdates, 0);
});

test('both off preserves original presentation, list identity, and native focus', async t => {
    const session = openPicker({ settings: {
        'picker.preferExactMatch': false, 'picker.preferPrefixMatch': false,
    } });
    t.after(() => session.cancel());
    const initialItems = session.picker.items;
    assert.equal(session.hasChangeHandler, false);
    assert.deepEqual(initialItems.map(({ label, description }) => ({ label, description })),
        emojis.map(emoji => ({ label: emoji.emoji, description: emoji.name })));
    for (const query of ['smile', ':smile:', 'smi', '', 'missing']) session.change(query);
    assert.equal(session.picker.items, initialItems);
    assert.equal(session.itemUpdates, 1);
    assert.equal(session.focusUpdates, 0);
});

test('clearing or replacing an exact query restores original order', async t => {
    const session = openPicker();
    t.after(() => session.cancel());
    for (const query of ['', ':', 'missing', 'sml']) {
        session.change('smile');
        session.change(query);
        assert.deepEqual(session.names, originalNames);
    }
});

test('user can accept a different fuzzy result after exact-match focus', async () => {
    const session = openPicker();
    session.change('smile');
    session.select('sweat_smile');
    await session.accept();
    assert.deepEqual(session.insertions, ['😅']);
    assert.equal(session.disposed, true);
});

for (const destination of ['editor', 'terminal']) {
    for (const property of ['emoji', 'name']) {
        test(`inserts ${property} in ${destination} when hide fires synchronously on acceptance`, async () => {
            const session = openPicker({ property, destination });
            session.change(':smile:');
            await session.accept();
            const text = property === 'emoji' ? '😄' : ':smile:';
            assert.deepEqual(session.insertions, destination === 'editor' ? [text] : []);
            assert.deepEqual(session.terminalWrites, destination === 'terminal' ? [{ text, addNewLine: false }] : []);
            assert.deepEqual(session.commands, destination === 'terminal' ? ['workbench.action.terminal.focus'] : []);
            assert.equal(session.disposed, true);
        });
    }
}

for (const query of [':+1:', 'thumbsup']) {
    test(`keeps the selected shortcode for alias ${query}`, async () => {
        const session = openPicker({ property: 'name' });
        session.change(query);
        await session.accept();
        assert.deepEqual(session.insertions, [query === 'thumbsup' ? ':thumbsup:' : ':+1:']);
    });
}

test('cancelling inserts nothing', async () => {
    const session = openPicker();
    session.change('smile');
    await session.cancel();
    assert.deepEqual(session.insertions, []);
    assert.deepEqual(session.terminalWrites, []);
    assert.equal(session.disposed, true);
});

test('closing the editor or terminal while picking does not throw or insert', async () => {
    for (const destination of ['editor', 'terminal']) {
        const session = openPicker({ destination });
        session.change('smile');
        session.api.window.activeTextEditor = undefined;
        session.api.window.activeTerminal = undefined;
        await session.accept();
        assert.deepEqual(session.insertions, []);
        assert.deepEqual(session.terminalWrites, []);
    }
});

test('all real emoji aliases remain unique and available across ranking transitions', async t => {
    const { gemoji } = await import('gemoji');
    const byName = new Map();
    for (const record of gemoji) {
        for (const name of record.names) {
            if (!byName.has(name)) byName.set(name, { name, emoji: record.emoji });
        }
    }
    const dataset = [...byName.values()];
    const allNames = [...byName.keys()].sort();
    for (const { exact, prefix } of combinations) {
        const session = openPicker({ dataset, settings: {
            'picker.preferExactMatch': exact, 'picker.preferPrefixMatch': prefix,
        } });
        t.after(() => session.cancel());
        for (const query of ['s', 'smi', 'smile', ':smile:', 'cat', ':+1:', 'heart', 'missing', '']) {
            session.change(query);
            assert.deepEqual([...session.names].sort(), allNames);
            assert.equal(new Set(session.names).size, dataset.length);
        }
    }
});
