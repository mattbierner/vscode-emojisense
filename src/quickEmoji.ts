import { commands, Disposable, Memento, QuickPickItem, ThemeIcon, window, workspace } from 'vscode';
import { Emoji, EmojiProvider } from './emoji';

export type EmojiDestination = 'terminal' | 'editor';

interface EmojiQuickPickItem extends QuickPickItem {
    readonly emoji: Emoji;
}

const historyKey = 'picker.history';
const historyLimit = 200;

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
                    const rankedItems: EmojiQuickPickItem[] = orderedItems.map(item => ({
                        ...item,
                        description: preferExactMatch || preferPrefixMatch ? `:${item.emoji.name}:` : item.description,
                        detail: searchDescriptions ? item.emoji.description : undefined,
                    }));
                    picker.items = rankedItems;
                    let displayedItems = rankedItems;
                    picker.matchOnDescription = true;
                    picker.matchOnDetail = searchDescriptions;
                    picker.placeholder = 'Your Emoji Code';
                    picker.title = property === 'emoji' ? 'Emoji Picker' : 'Emoji Code Picker';
                    const showDescriptions = { iconPath: new ThemeIcon('list-selection'), tooltip: 'Show descriptions' };
                    const hideDescriptions = { iconPath: new ThemeIcon('list-selection'), tooltip: 'Hide descriptions' };
                    picker.buttons = [searchDescriptions ? hideDescriptions : showDescriptions];
                    disposables.push(picker.onDidTriggerButton(button => {
                        if (button !== showDescriptions && button !== hideDescriptions) {
                            return;
                        }
                        searchDescriptions = !searchDescriptions;
                        for (const item of rankedItems) {
                            item.detail = searchDescriptions ? item.emoji.description : undefined;
                        }
                        const activeItems = picker.activeItems;
                        picker.matchOnDetail = searchDescriptions;
                        picker.items = displayedItems;
                        picker.activeItems = activeItems;
                        picker.buttons = [searchDescriptions ? hideDescriptions : showDescriptions];
                    }));
                    if (preferExactMatch || preferPrefixMatch || ignoreSpaces) {
                        disposables.push(picker.onDidChangeValue(value => {
                            const query = ignoreSpaces ? value.replace(/ /g, '') : value;
                            if (query !== value) {
                                picker.value = query;
                            }
                            if (!preferExactMatch && !preferPrefixMatch) {
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
                            if (nextItems.some((item, index) => item !== displayedItems[index])) {
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
                    picker.show();
                });
            } finally {
                disposables.forEach(disposable => disposable.dispose());
                picker.dispose();
            }
            if (!selectedItem) {
                return;
            }

            const insert = property === 'name' ? `:${selectedItem.emoji.name}:` : selectedItem.emoji.emoji;
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
