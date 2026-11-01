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

function createHistoryState(initial = []) {
    const values = new Map([['picker.history', [...initial]]]);
    return {
        get: (key, fallback) => values.get(key) ?? fallback,
        update: async (key, value) => { values.set(key, [...value]); },
        get names() { return values.get('picker.history'); },
    };
}

function openPicker({ settings = {}, property = 'emoji', destination = 'editor', dataset = emojis, historyState = createHistoryState(), showError } = {}) {
    let onChange;
    let onAccept;
    let onHide;
    let items = [];
    let activeItems = [];
    let itemUpdates = 0;
    let focusUpdates = 0;
    let disposed = false;
    let activeSubscriptions = 0;
    const insertions = [];
    const terminalWrites = [];
    const commands = [];
    const warnings = [];
    const subscribe = () => {
        activeSubscriptions++;
        let disposed = false;
        return { dispose() {
            if (!disposed) activeSubscriptions--;
            disposed = true;
        } };
    };
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
        onDidChangeValue(callback) { onChange = callback; return subscribe(); },
        onDidAccept(callback) { onAccept = callback; return subscribe(); },
        onDidHide(callback) { onHide = callback; return subscribe(); },
        show() { if (showError) throw showError; },
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
                edit: async callback => {
                    callback({ insert: (_, text) => insertions.push(text) });
                    return true;
                },
            },
            activeTerminal: { sendText: (text, addNewLine) => terminalWrites.push({ text, addNewLine }) },
        },
        commands: { executeCommand: async command => { commands.push(command); } },
    };
    const exports = {};
    new Function('require', 'exports', 'console', code)(name => {
        assert.equal(name, 'vscode');
        return api;
    }, exports, { warn: (...args) => warnings.push(args) });
    const done = exports.quickEmoji({ emojis: dataset }, historyState)(property, destination)();

    return {
        picker, done, api, insertions, terminalWrites, commands, historyState, warnings,
        get names() { return picker.items.map(item => item.emoji.name); },
        get itemUpdates() { return itemUpdates; },
        get focusUpdates() { return focusUpdates; },
        get hasChangeHandler() { return !!onChange; },
        get disposed() { return disposed; },
        get activeSubscriptions() { return activeSubscriptions; },
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
    assert.equal(session.activeSubscriptions, 0);
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
            assert.equal(session.activeSubscriptions, 0);
        });
    }
}

for (const query of [':+1:', 'thumbsup']) {
    test(`keeps the selected shortcode for alias ${query}`, async () => {
        const session = openPicker({ property: 'name' });
        session.change(query);
        await session.accept();
        assert.deepEqual(session.insertions, [query === 'thumbsup' ? ':thumbsup:' : ':+1:']);
        assert.deepEqual(session.historyState.names, [query === 'thumbsup' ? 'thumbsup' : '+1']);
    });
}

test('cancelling inserts nothing', async () => {
    const session = openPicker();
    session.change('smile');
    await session.cancel();
    assert.deepEqual(session.insertions, []);
    assert.deepEqual(session.terminalWrites, []);
    assert.deepEqual(session.historyState.names, []);
    assert.equal(session.disposed, true);
    assert.equal(session.activeSubscriptions, 0);
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
        assert.deepEqual(session.historyState.names, []);
    }
});

test('Unicode and shortcode pickers share persistent most-recent-first history across destinations', async t => {
    const historyState = createHistoryState();
    const unicode = openPicker({ historyState });
    unicode.select('cat');
    await unicode.accept();
    assert.deepEqual(historyState.names, ['cat']);

    // Each opening creates a fresh factory, also checking restoration from storage.
    const shortcode = openPicker({ historyState, property: 'name', destination: 'terminal' });
    assert.equal(shortcode.names[0], 'cat');
    shortcode.select('smile');
    await shortcode.accept();
    assert.deepEqual(historyState.names, ['smile', 'cat']);

    const reopened = openPicker({ historyState });
    t.after(() => reopened.cancel());
    assert.deepEqual(reopened.names.slice(0, 2), ['smile', 'cat']);
    assert.deepEqual([...reopened.names].sort(), [...originalNames].sort());
});

test('reusing an emoji moves its one history entry to the front', async () => {
    const historyState = createHistoryState(['smile', 'cat']);
    const session = openPicker({ historyState, property: 'name' });
    session.select('cat');
    await session.accept();
    assert.deepEqual(historyState.names, ['cat', 'smile']);
});

test('match preferences take priority over history and clearing input restores recents', async t => {
    const historyState = createHistoryState(['cat', 'sweat_smile', 'smile']);
    const session = openPicker({ historyState });
    t.after(() => session.cancel());
    session.change('smile');
    assert.deepEqual(session.names.slice(0, 4), ['smile', 'smile_cat', 'smiley', 'cat']);
    session.change('smi');
    assert.deepEqual(session.names.slice(0, 3), ['smile', 'smile_cat', 'smiley']);
    session.change('');
    assert.deepEqual(session.names.slice(0, 3), ['cat', 'sweat_smile', 'smile']);
});

test('history remains shared when both match preferences are disabled', async t => {
    const session = openPicker({ historyState: createHistoryState(['cat']), settings: {
        'picker.preferExactMatch': false, 'picker.preferPrefixMatch': false,
    } });
    t.after(() => session.cancel());
    assert.equal(session.names[0], 'cat');
    assert.equal(session.hasChangeHandler, false);
    assert.equal(session.picker.items[0].description, 'cat');
});

test('history is bounded, ignores removed shortcodes, and does not duplicate candidates', async () => {
    const dataset = Array.from({ length: 205 }, (_, i) => ({ name: `emoji_${i}`, emoji: '😄' }));
    const historyState = createHistoryState(['removed', 'emoji_0', 'emoji_0', ...dataset.map(item => item.name)]);
    const session = openPicker({ dataset, historyState });
    assert.equal(session.names.length, dataset.length);
    assert.equal(new Set(session.names).size, dataset.length);
    session.select('emoji_204');
    await session.accept();
    assert.deepEqual(historyState.names, ['emoji_204', ...dataset.slice(0, 199).map(item => item.name)]);
});

test('only changed rankings replace the picker list', async t => {
    const session = openPicker();
    t.after(() => session.cancel());
    session.change('s');
    assert.equal(session.itemUpdates, 1);
    session.change('sm');
    const prefixes = session.picker.items;
    assert.equal(session.itemUpdates, 2);
    for (const query of ['smi', 'smil']) {
        session.change(query);
        assert.equal(session.picker.items, prefixes);
        assert.equal(session.itemUpdates, 2);
    }
    session.change('smile');
    assert.equal(session.itemUpdates, 3);
    const exact = session.picker.items;
    session.change(':SMILE:');
    assert.equal(session.picker.items, exact);
    assert.equal(session.itemUpdates, 3);
    session.change('');
    assert.equal(session.itemUpdates, 4);
    const original = session.picker.items;
    for (const query of [':', 'missing', 'sml']) {
        session.change(query);
        assert.equal(session.picker.items, original);
        assert.equal(session.itemUpdates, 4);
    }
    assert.deepEqual(session.names, originalNames);
});

for (const destination of ['editor', 'terminal']) {
    for (const synchronous of [false, true]) {
        test(`${destination} insertion succeeds when history saving ${synchronous ? 'throws' : 'rejects'}`, async () => {
            const historyState = createHistoryState(['cat']);
            const error = new Error('History storage unavailable');
            historyState.update = synchronous
                ? () => { throw error; }
                : async () => { throw error; };
            const session = openPicker({ historyState, destination });
            session.change('smile');
            await session.accept();
            assert.deepEqual(session.insertions, destination === 'editor' ? ['😄'] : []);
            assert.deepEqual(session.terminalWrites, destination === 'terminal' ? [{ text: '😄', addNewLine: false }] : []);
            assert.deepEqual(session.commands, destination === 'terminal' ? ['workbench.action.terminal.focus'] : []);
            assert.deepEqual(historyState.names, ['cat']);
            assert.equal(session.warnings.length, 1);
            assert.equal(session.warnings[0][1], error);
            assert.equal(session.activeSubscriptions, 0);
            assert.equal(session.disposed, true);
        });
    }
}

test('picker and event subscriptions are disposed if showing the picker fails', async () => {
    const error = new Error('Cannot show picker');
    const session = openPicker({ showError: error });
    await assert.rejects(session.done, error);
    assert.equal(session.activeSubscriptions, 0);
    assert.equal(session.disposed, true);
    assert.deepEqual(session.insertions, []);
    assert.deepEqual(session.historyState.names, []);
});

test('failed editor edits and cancellation do not change existing history', async () => {
    const historyState = createHistoryState(['cat']);
    const failed = openPicker({ historyState });
    failed.api.window.activeTextEditor.edit = async () => false;
    failed.select('smile');
    await failed.accept();
    assert.deepEqual(historyState.names, ['cat']);

    const cancelled = openPicker({ historyState });
    cancelled.select('smile');
    await cancelled.cancel();
    assert.deepEqual(historyState.names, ['cat']);
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
