import * as vscode from 'vscode';

export const scmPseudoLanguageId = '@scm/commit';

export const scmInputSelector = Object.freeze<vscode.DocumentFilter>({
    scheme: 'vscode',
    pattern: 'scm/**/input',
    language: 'plaintext',
});

export function isScmInputDocument(document: vscode.TextDocument): boolean {
    return vscode.languages.match(scmInputSelector, document) > 0;
}

interface LanguageConfig {
    readonly unicodeCompletionsEnabled?: boolean;
    readonly markupCompletionsEnabled?: boolean;
    readonly showOnColon?: boolean;
    readonly emojiDecoratorsEnabled?: boolean;
}

export class Configuration implements LanguageConfig {

    public get languages(): Iterable<string> {
        return this.languageConfigurations.keys();
    }

    public unicodeCompletionsEnabled: boolean = true;
    public markupCompletionsEnabled: boolean = true;
    public showOnColon: boolean = true;
    public emojiDecoratorsEnabled: boolean = true;
    private languageConfigurations = new Map<string, LanguageConfig>();

    constructor() {
        this.updateConfiguration();
    }

    public areUnicodeCompletionsEnabled(document: vscode.TextDocument): boolean {
        return this.is('unicodeCompletionsEnabled', this.getLanguageId(document));
    }

    public areMarkupCompletionsEnabled(document: vscode.TextDocument): boolean {
        return this.is('markupCompletionsEnabled', this.getLanguageId(document));
    }

    public shouldShowOnColon(forLanguage: string): boolean {
        return this.is('showOnColon', forLanguage);
    }

    public isInlineEnabled(forLanguage: string): boolean {
        return this.is('emojiDecoratorsEnabled', forLanguage);
    }

    public updateConfiguration(): void {
        const config = vscode.workspace.getConfiguration('emojisense');
        this.unicodeCompletionsEnabled = config.get<boolean>('unicodeCompletionsEnabled', true);
        this.markupCompletionsEnabled = config.get<boolean>('markupCompletionsEnabled', true);
        this.showOnColon = config.get<boolean>('showOnColon', true);
        this.emojiDecoratorsEnabled = config.get<boolean>('emojiDecoratorsEnabled', true);

        this.languageConfigurations = new Map();
        const languagesConfig = config.get<any>('languages', {});
        for (const language of Object.keys(languagesConfig || {})) {
            const configValue = languagesConfig[language];
            const languageName = language.toLowerCase();
            if (typeof configValue === 'boolean') {
                if (configValue) {
                    this.languageConfigurations.set(languageName, {});
                }
            } else {
                this.languageConfigurations.set(languageName, configValue);
            }
        }
    }

    private getLanguageId(document: vscode.TextDocument): string {
        return isScmInputDocument(document) ? scmPseudoLanguageId : document.languageId;
    }

    private is(setting: keyof LanguageConfig, forLanguage: string): boolean {
        const languageConfig = this.getLanguageConfig(forLanguage);
        if (!languageConfig) {
            return false;
        }

        return typeof languageConfig[setting] !== 'undefined' ? !!languageConfig[setting] : this[setting];
    }

    private getLanguageConfig(languageId: string): LanguageConfig | undefined {
        return this.languageConfigurations.get(languageId.toLowerCase());
    }
}
