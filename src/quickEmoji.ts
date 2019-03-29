import { Uri, window, Disposable, QuickPickItem, workspace, TextEdit } from 'vscode';
import {EmojiProvider, Emoji} from './emoji'

export type EmojiDestination = 'terminal' | 'editor';
export const quickEmoji = (emoji: EmojiProvider) => (property: keyof Emoji, destination: EmojiDestination) => {
	const items: QuickPickItem[] = Array.from(emoji.emojis).map(
		emoji => ({label: emoji.name, description: emoji.emoji})
	);
	return async function () {
		const terminal = window.activeTerminal;
		const editor = window.activeTextEditor;
		const emoji = await window.showQuickPick(items);
		if (!emoji) return;
		const insert = property === 'name' ? `:${emoji.label}:`: emoji.description || '';
		if (terminal && destination === 'terminal') terminal.sendText(insert, false);
		else if (editor && destination === 'editor') {
			editor.edit(builder => builder.insert(editor.selection.active, insert));
		}
	}
};
