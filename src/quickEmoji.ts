import { commands, Disposable, env, Memento, QuickPickItem, ThemeIcon, window, workspace } from 'vscode';
import { Emoji, EmojiProvider } from './emoji';
import { matchesPickerQuery } from './pickerMatching';

export type EmojiDestination = 'terminal' | 'editor';

interface EmojiQuickPickItem extends QuickPickItem {
    readonly emoji: Emoji;
}

const historyKey = 'picker.history';
const historyLimit = 200;

const detailFor = (emoji: Emoji) => emoji.tags.length
    ? `${emoji.description} · ${emoji.tags.map(tag => `#${tag}`).join(' ')}`
    : emoji.description;

export const quickEmoji = (provider: EmojiProvider, historyState: Memento) => {
    const items: EmojiQuickPickItem[] = provider.emojis.map((emoji) => {
        return ({ description: emoji.name, label: emoji.emoji, emoji });
    });
    const itemsByName = new Map(items.map(item => [item.emoji.name, item]));

    const recentItems = () => Array.from(new Set(historyState.get<readonly string[]>(historyKey, [])))
        .map(name => itemsByName.get(name))
        .filter((item): item is EmojiQuickPickItem => !!item)
        .slice(0, historyLimit);

    const remember = async (name: string) => {
        try {
            const names = [name, ...recentItems()
                .filter(recent => recent.emoji.name !== name)
                .map(recent => recent.emoji.name)].slice(0, historyLimit);
            await historyState.update(historyKey, names);
        } catch (error) {
            console.warn('Emojisense: Could not save picker history.', error);
        }
    };

    return (property: keyof Emoji, destination: EmojiDestination) => {
        return async () => {
            let insertionProperty = property;
            const textFor = (item: EmojiQuickPickItem) => insertionProperty === 'name'
                ? `:${item.emoji.name}:` : item.emoji.emoji;
            const config = workspace.getConfiguration('emojisense', window.activeTextEditor?.document.uri);
            const preferExactMatch = config.get<boolean>('picker.preferExactMatch', true);
            const preferPrefixMatch = config.get<boolean>('picker.preferPrefixMatch', true);
            let searchDescriptions = config.get<boolean>('picker.searchDescriptions', true);
            const ignoreSpaces = config.get<boolean>('picker.ignoreSpaces', true);
            const recent = new Set(recentItems());
            const orderedItems = recent.size
                ? [...recent, ...items.filter(item => !recent.has(item))]
                : items;

            const picker = window.createQuickPick<EmojiQuickPickItem>();
            const disposables: Disposable[] = [];
            let selectedItem: EmojiQuickPickItem | undefined;
            try {
                selectedItem = await new Promise<EmojiQuickPickItem | undefined>((resolve) => {
                    const copy = { iconPath: new ThemeIcon('copy'), tooltip: 'Copy in current insertion mode' };
                    const rankedItems: EmojiQuickPickItem[] = orderedItems.map(item => ({
                        ...item,
                        description: preferExactMatch || preferPrefixMatch ? `:${item.emoji.name}:` : item.description,
                        detail: searchDescriptions ? detailFor(item.emoji) : undefined,
                        buttons: [copy],
                    }));
                    picker.items = rankedItems;
                    let displayedItems = rankedItems;
                    let copyFeedbackDisposed = false;
                    const copyFeedbackTimers = new Map<EmojiQuickPickItem, ReturnType<typeof setTimeout>>();
                    disposables.push({ dispose: () => {
                        copyFeedbackDisposed = true;
                        copyFeedbackTimers.forEach(timer => clearTimeout(timer));
                        copyFeedbackTimers.clear();
                    } });
                    const refreshItems = () => {
                        const activeItems = picker.activeItems;
                        picker.items = displayedItems;
                        picker.activeItems = activeItems;
                    };
                    const updateSpaceMatches = () => {
                        const value = picker.value;
                        const normalized = value.replace(/ /g, '');
                        const needsFallback = ignoreSpaces && normalized !== value;
                        let changed = false;
                        for (const item of rankedItems) {
                            const alwaysShow = needsFallback && [item.label, item.description || '', item.detail || '']
                                .some(text => matchesPickerQuery(normalized, text));
                            if (!!item.alwaysShow !== alwaysShow) {
                                item.alwaysShow = alwaysShow;
                                changed = true;
                            }
                        }
                        return changed;
                    };
                    picker.matchOnDescription = true;
                    picker.matchOnDetail = searchDescriptions;
                    picker.placeholder = 'Your Emoji Code';
                    const showDescriptions = { iconPath: new ThemeIcon('list-selection'), tooltip: 'Show descriptions' };
                    const hideDescriptions = { iconPath: new ThemeIcon('list-selection'), tooltip: 'Hide descriptions' };
                    const useShortcode = { iconPath: new ThemeIcon('symbol-key'), tooltip: 'Insert :shortcode: instead' };
                    const useEmoji = { iconPath: new ThemeIcon('smiley'), tooltip: 'Insert emoji instead' };
                    const updateControls = () => {
                        picker.title = insertionProperty === 'emoji' ? '😃 Emoji Picker' : ':smiley: Emoji Code Picker';
                        picker.buttons = [
                            searchDescriptions ? hideDescriptions : showDescriptions,
                            insertionProperty === 'emoji' ? useShortcode : useEmoji,
                        ];
                    };
                    const toggleInsertionMode = () => {
                        insertionProperty = insertionProperty === 'emoji' ? 'name' : 'emoji';
                        updateControls();
                    };
                    updateControls();
                    const copyItem = async (item: EmojiQuickPickItem | undefined) => {
                        if (!item) {
                            return;
                        }
                        try {
                            const text = textFor(item);
                            await env.clipboard.writeText(text);
                            if (copyFeedbackDisposed) {
                                return;
                            }
                            clearTimeout(copyFeedbackTimers.get(item));
                            item.buttons = [{ iconPath: new ThemeIcon('check'), tooltip: `Copied ${text}` }];
                            refreshItems();
                            copyFeedbackTimers.set(item, setTimeout(() => {
                                copyFeedbackTimers.delete(item);
                                item.buttons = [copy];
                                refreshItems();
                            }, 1000));
                        } catch (error) {
                            console.warn('Emojisense: Could not copy picker selection.', error);
                            if (!copyFeedbackDisposed) {
                                void window.showWarningMessage('Could not copy emoji. Please try again.');
                            }
                        }
                    };
                    const copySelection = () => copyItem(picker.activeItems[0]);
                    disposables.push(commands.registerCommand('emojisense.togglePickerInsertionMode', toggleInsertionMode));
                    disposables.push(commands.registerCommand('emojisense.copyPickerSelection', copySelection));
                    disposables.push(picker.onDidTriggerItemButton(event => {
                        if (event.button === event.item.buttons?.[0]) {
                            return copyItem(event.item);
                        }
                    }));
                    disposables.push(picker.onDidTriggerButton(button => {
                        if (button === useShortcode || button === useEmoji) {
                            toggleInsertionMode();
                            return;
                        }
                        if (button !== showDescriptions && button !== hideDescriptions) {
                            return;
                        }
                        searchDescriptions = !searchDescriptions;
                        for (const item of rankedItems) {
                            item.detail = searchDescriptions ? detailFor(item.emoji) : undefined;
                        }
                        const activeItems = picker.activeItems;
                        picker.matchOnDetail = searchDescriptions;
                        updateSpaceMatches();
                        picker.items = displayedItems;
                        picker.activeItems = activeItems;
                        updateControls();
                    }));
                    if (preferExactMatch || preferPrefixMatch || ignoreSpaces) {
                        disposables.push(picker.onDidChangeValue(value => {
                            const query = ignoreSpaces ? value.replace(/ /g, '') : value;
                            const spaceMatchesChanged = updateSpaceMatches();
                            if (!preferExactMatch && !preferPrefixMatch) {
                                if (spaceMatchesChanged) {
                                    refreshItems();
                                }
                                return;
                            }
                            const name = query.trim().replace(/^:|:$/g, '').toLowerCase();
                            let exactMatch: EmojiQuickPickItem | undefined;
                            const prefixMatches: EmojiQuickPickItem[] = [];
                            const otherItems: EmojiQuickPickItem[] = [];

                            for (const item of rankedItems) {
                                const itemName = item.emoji.name.toLowerCase();
                                if (name && preferExactMatch && itemName === name) {
                                    exactMatch = item;
                                } else if (name && preferPrefixMatch && itemName.startsWith(name)) {
                                    prefixMatches.push(item);
                                } else {
                                    otherItems.push(item);
                                }
                            }

                            // EmojiProvider has one item per shortcode, so at most one is exact.
                            // Reorder the full list; let VS Code keep filtering fuzzy matches.
                            const nextItems = exactMatch
                                ? [exactMatch, ...prefixMatches, ...otherItems]
                                : [...prefixMatches, ...otherItems];
                            if (spaceMatchesChanged || nextItems.some((item, index) => item !== displayedItems[index])) {
                                picker.items = nextItems;
                                displayedItems = nextItems;
                            }
                            const bestMatch = exactMatch || prefixMatches[0];
                            if (bestMatch) {
                                picker.activeItems = [bestMatch];
                            }
                        }));
                    }
                    disposables.push(picker.onDidAccept(() => {
                        resolve(picker.selectedItems[0]);
                        picker.hide();
                    }));
                    disposables.push(picker.onDidHide(() => {
                        resolve(undefined);
                    }));
                    void commands.executeCommand('setContext', 'emojisense.pickerOpen', true);
                    picker.show();
                });
            } finally {
                disposables.forEach(disposable => disposable.dispose());
                picker.dispose();
                void commands.executeCommand('setContext', 'emojisense.pickerOpen', false);
            }
            if (!selectedItem) {
                return;
            }

            const insert = textFor(selectedItem);
            switch (destination) {
                case 'terminal':
                    if (window.activeTerminal) {
                        window.activeTerminal.sendText(insert, false);
                        await remember(selectedItem.emoji.name);
                        await commands.executeCommand('workbench.action.terminal.focus');
                    }
                    break;
                case 'editor':
                    if (window.activeTextEditor) {
                        const editor = window.activeTextEditor;
                        const inserted = await editor.edit((builder) => builder.insert(editor.selection.active, insert));
                        if (inserted) {
                            await remember(selectedItem.emoji.name);
                        }
                    }
                    break;
            }
        };
    };
};
