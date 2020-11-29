import { commands, QuickPickItem, window } from 'vscode';
import { Emoji, EmojiProvider } from './emoji';

export type EmojiDestination = 'terminal' | 'editor';

export const quickEmoji = (provider: EmojiProvider) => {
    const items: QuickPickItem[] = provider.emojis.map((emoji) => {
        return ({ description: emoji.name, label: emoji.emoji });
    });

    return (property: keyof Emoji, destination: EmojiDestination) => {
        return async () => {

            const emoji: QuickPickItem | undefined = await new Promise<QuickPickItem | undefined>((resolve) => {
                const picker = window.createQuickPick<QuickPickItem>();
                picker.items = items;
                picker.matchOnDescription = true;
                picker.placeholder = 'Your Emoji Code';
                picker.title = property === 'emoji' ? 'Emoji Picker' : 'Emoji Code Picker';
                picker.onDidAccept(() => {
                    picker.hide();
                    resolve(picker.selectedItems[0]);
                });
                picker.onDidHide(() => {
                    picker.dispose();
                    resolve(undefined);
                });
                picker.show();
            });
            if (!emoji) {
                return;
            }

            const insert = property === 'name' ? `:${emoji.description}:` : emoji.label || '';
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
