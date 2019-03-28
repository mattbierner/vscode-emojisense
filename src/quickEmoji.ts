import { Uri, window, Disposable, QuickPickItem, workspace, TextEdit } from 'vscode';
import {EmojiProvider, Emoji} from './emoji'

export const quickEmoji = (emoji: EmojiProvider) => (property: keyof Emoji) => {
	const items: QuickPickItem[] = Array.from(emoji.emojis).map(
		emoji =>({label: emoji.name, description: emoji.emoji})
		);
	return async function () {
		const emoji = await window.showQuickPick(items);
		if (!emoji) return;
		const insert = property === 'name' ? `:${emoji.label}`: emoji.description || '';
		if (window.activeTextEditor) {
			const editor = window.activeTextEditor
			editor.edit(builder => builder.insert(editor.selection.active, insert));
		}
		else if (window.activeTerminal) window.activeTerminal.sendText(insert, false);
	}
};