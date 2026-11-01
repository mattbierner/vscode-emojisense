import { commands, Disposable, Memento, QuickPickItem, window, workspace } from 'vscode';
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
            const recent = new Set(recentItems());
            const orderedItems = recent.size
                ? [...recent, ...items.filter(item => !recent.has(item))]
                : items;

            const picker = window.createQuickPick<EmojiQuickPickItem>();
            const disposables: Disposable[] = [];
            let selectedItem: EmojiQuickPickItem | undefined;
            try {
                selectedItem = await new Promise<EmojiQuickPickItem | undefined>((resolve) => {
                    const rankedItems = preferExactMatch || preferPrefixMatch
                        ? orderedItems.map(item => ({ ...item, description: `:${item.emoji.name}:` }))
                        : orderedItems;
                    picker.items = rankedItems;
                    let displayedItems = rankedItems;
                    picker.matchOnDescription = true;
                    picker.placeholder = 'Your Emoji Code';
                    picker.title = property === 'emoji' ? 'Emoji Picker' : 'Emoji Code Picker';
                    if (preferExactMatch || preferPrefixMatch) {
                        disposables.push(picker.onDidChangeValue(value => {
                            const name = value.trim().replace(/^:|:$/g, '').toLowerCase();
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
