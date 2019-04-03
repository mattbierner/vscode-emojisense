import { Uri, window, Disposable, QuickPickItem, workspace, TextEdit } from 'vscode';
import { EmojiProvider, Emoji } from './emoji'

export type EmojiDestination = 'terminal' | 'editor';
export const quickEmoji = (emoji: EmojiProvider) => {
	const items: QuickPickItem[] = Array.from(emoji.emojis).map(
		emoji => ({ description: emoji.name, label: emoji.emoji })
	);
	return (property: keyof Emoji, destination: EmojiDestination) => {
		return async function () {
			const terminal = window.activeTerminal;
			const editor = window.activeTextEditor;
			const emoji: QuickPickItem | undefined = await new Promise<QuickPickItem>(resolve => {
				const picker = window.createQuickPick<QuickPickItem>()
				picker.items = items;
				picker.matchOnDescription = true;
				picker.placeholder = 'Your Emojy Code';
				picker.title = property === 'emoji' ? 'Emoji Picker' : 'Emoji Code Picker';
				picker.onDidAccept(() => {
					picker.hide()
					resolve(picker.selectedItems[0]);
				});
				picker.onDidHide(() => {
					picker.dispose()
					resolve(undefined);
				});
				picker.show();
			});
			if (!emoji) return;

			const insert = property === 'name' ? `:${emoji.description}:` : emoji.label || '';
			if (terminal && destination === 'terminal') {
				terminal.sendText(insert, false);
			}
			else if (editor && destination === 'editor') {
				editor.edit(builder => builder.insert(editor.selection.active, insert));
			}
		}
	}
};
