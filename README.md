Adds suggestions and autocomplete for emoji to VS Code.

![Example](/media/example.gif?raw=true)

Inspired by the [Atom autocomplete+ emojis suggestions plugin][atom].

## Features

- Quickly insert emoji using the `:smile:` syntax supported by Github and many other sites
- Insert emoji markup by typing `::`
- Enable and control emoji completion settings per language
- See emoji previews of `:smile:` style markup inline

[List of supported emoji][cheat]

## General Configuration

- `emojisense.unicodeCompletionsEnabled`: Enable completions that insert emoji as unicode, i.e. `:smile_cat:` -> 😸

- `emojisense.markupCompletionsEnabled`: Enable completions that insert emoji markup, i.e. `::smile_cat` -> `:smile_cat:`

- `emojisense.showOnColon`: Should emoji completions automatically be shown when you type a colon? Enabled by default. If you disable `showOnColon`, it is recomended that you have `quickSuggestions` enabled.

- `emojisense.emojiDecoratorsEnabled`: Show emoji decorators inline for `:smile_cat:` markup in a file? Enabled by default in markdown.

## Per Language Configuration

*Emojisense* is enabled by default in markdown, git commits, and plaintext files. You can enable it in other languages using `"emojisense.languages"`

```json
"emojisense.languages": {
    "markdown": true,
    "git-commit": false,
    "plaintext": false,
    "json": true
}
```

You can also change the settings for each language. Here's the default emojisense configuration for example:

```json
"emojisense.languages": {
    "markdown": true,
    "plaintext": {
        "markupCompletionsEnabled": false,
        "emojiDecoratorsEnabled": false
    },
    "git-commit": true
}
```

Whenever a value is left unspecified, the top level setting is used instead. In this case, markdown files will fallback to use the top level `emojisense.unicodeCompletionsEnabled` and `emojisense.markupCompletionsEnabled` settings, while plaintext files will have `markupCompletionsEnabled` disabled and fallback to the `emojisense.unicodeCompletionsEnabled` setting



## Credits

- Icon from emojione: https://www.emojione.com
- [Atom autocomplete+ emojis suggestions plugin][atom]


[atom]: https://atom.io/packages/autocomplete-emojis
[cheat]: https://www.webpagefx.com/tools/emoji-cheat-sheet/