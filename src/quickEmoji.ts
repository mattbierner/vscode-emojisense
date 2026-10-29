import { commands, QuickPickItem, window, workspace } from 'vscode';
import { Emoji, EmojiProvider } from './emoji';

export type EmojiDestination = 'terminal' | 'editor';

interface EmojiQuickPickItem extends QuickPickItem {
    readonly emoji: Emoji;
}

export const quickEmoji = (provider: EmojiProvider) => {
    const items: EmojiQuickPickItem[] = provider.emojis.map((emoji) => {
        return ({ description: emoji.name, label: emoji.emoji, emoji });
    });

    return (property: keyof Emoji, destination: EmojiDestination) => {
        return async () => {

            const config = workspace.getConfiguration('emojisense', window.activeTextEditor?.document.uri);
            const preferExactMatch = config.get<boolean>('picker.preferExactMatch', true);
            const preferPrefixMatch = config.get<boolean>('picker.preferPrefixMatch', true);

            const selectedItem = await new Promise<EmojiQuickPickItem | undefined>((resolve) => {
                const picker = window.createQuickPick<EmojiQuickPickItem>();
                const rankedItems = preferExactMatch || preferPrefixMatch
                    ? items.map(item => ({ ...item, description: `:${item.emoji.name}:` }))
                    : items;
                picker.items = rankedItems;
                picker.matchOnDescription = true;
                picker.placeholder = 'Your Emoji Code';
                picker.title = property === 'emoji' ? 'Emoji Picker' : 'Emoji Code Picker';
                if (preferExactMatch || preferPrefixMatch) {
                    picker.onDidChangeValue(value => {
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
                        picker.items = exactMatch
                            ? [exactMatch, ...prefixMatches, ...otherItems]
                            : [...prefixMatches, ...otherItems];
                        const bestMatch = exactMatch || prefixMatches[0];
                        if (bestMatch) {
                            picker.activeItems = [bestMatch];
                        }
                    });
                }
                picker.onDidAccept(() => {
                    resolve(picker.selectedItems[0]);
                    picker.hide();
                });
                picker.onDidHide(() => {
                    picker.dispose();
                    resolve(undefined);
                });
                picker.show();
            });
            if (!selectedItem) {
                return;
            }

            const insert = property === 'name' ? `:${selectedItem.emoji.name}:` : selectedItem.emoji.emoji;
            switch (destination) {
                case 'terminal':
                    if (window.activeTerminal) {
                        window.activeTerminal.sendText(insert, false);
                        await commands.executeCommand('workbench.action.terminal.focus');
                    }
                    break;
                case 'editor':
                    if (window.activeTextEditor) {
                        const editor = window.activeTextEditor;
                        await editor.edit((builder) => builder.insert(editor.selection.active, insert));
                    }
                    break;
            }
        };
    };
};
