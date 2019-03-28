import { Uri, window, Disposable, QuickPickItem, workspace, TextEdit } from 'vscode';
import {EmojiProvider, Emoji} from './emoji'

export const quickEmoji = (emoji: EmojiProvider) => (property: keyof Emoji) => {
	const items: QuickPickItem[] = Array.from(emoji.emojis).map(
		emoji =>({label: emoji.name, description: emoji.emoji})
	);
	let terminalCurrent = false;
	window.onDidChangeActiveTerminal(() => { terminalCurrent = true;})
	window.onDidChangeActiveTextEditor(() => { terminalCurrent = false;})

	return async function () {
		const terminal = window.activeTerminal;
		const editor = window.activeTextEditor;
		const emoji = await window.showQuickPick(items);
		if (!emoji) return;
		const insert = property === 'name' ? `:${emoji.label}`: emoji.description || '';
		if (terminal && terminalCurrent) terminal.sendText(insert, false);
		else if (editor) {
			editor.edit(builder => builder.insert(editor.selection.active, insert));
		}
	}
};
