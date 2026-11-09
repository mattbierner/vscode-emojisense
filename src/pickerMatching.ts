/*!
 * Matching algorithm adapted from microsoft/vscode (MIT).
 * Copyright (c) Microsoft Corporation.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
// Space-free queries need a fallback because QuickPick has no separate filter text.
// Follow VS Code's matchesFuzzy semantics: wildcard/substring, then camel-case
// anchors (not arbitrary subsequences). Native filtering still handles normal input.
// Reference: microsoft/vscode, src/vs/base/common/filters.ts (MIT).
export const matchesPickerQuery = (query: string, text: string): boolean => {
    query = query.trim();
    if (!query) {
        return true;
    }
    const pattern = query.replace(/[-\\{}+?|^$.,[\]()#\s]/g, '\\$&').replace(/\*/g, '.*');
    if (new RegExp(pattern, 'i').test(text)) {
        return true;
    }

    const isUpper = (char: string) => char >= 'A' && char <= 'Z';
    const isLower = (char: string) => char >= 'a' && char <= 'z';
    const isNumber = (char: string) => char >= '0' && char <= '9';
    const isAlphanumeric = (char: string) => isUpper(char) || isLower(char) || isNumber(char);
    const upper = [...query].filter(isUpper).length;
    const lower = [...query].filter(isLower).length;
    const hasWhitespace = /[ \t\r\n]/.test(query);
    if ((upper === 0 || lower === 0) && !hasWhitespace ? query.length > 30 : upper > 5) {
        return false;
    }

    let target = text.trim().slice(0, 60);
    if (!target) {
        return false;
    }
    const upperRatio = [...target].filter(isUpper).length / target.length;
    const lowerRatio = [...target].filter(isLower).length / target.length;
    const alphaRatio = [...target].filter(isAlphanumeric).length / target.length;
    const numberRatio = [...target].filter(isNumber).length / target.length;
    if (!(lowerRatio > 0.2 && upperRatio < 0.8 && alphaRatio > 0.6 && numberRatio < 0.2)) {
        if (!(lowerRatio === 0 && upperRatio > 0.6)) {
            return false;
        }
        target = target.toLowerCase();
    }
    const needle = query.toLowerCase();
    const nextAnchor = (start: number) => {
        for (let index = start; index < target.length; index++) {
            if (isUpper(target[index]) || isNumber(target[index])
                || (index > 0 && !isAlphanumeric(target[index - 1]))) {
                return index;
            }
        }
        return target.length;
    };
    const failed = new Set<string>();
    const match = (queryIndex: number, textIndex: number): boolean => {
        if (queryIndex === needle.length) {
            return true;
        }
        const key = `${queryIndex}:${textIndex}`;
        if (textIndex === target.length || needle[queryIndex] !== target[textIndex].toLowerCase() || failed.has(key)) {
            return false;
        }
        if (match(queryIndex + 1, textIndex + 1)) {
            return true;
        }
        for (let index = nextAnchor(textIndex + 1); index < target.length; index = nextAnchor(index + 1)) {
            if (match(queryIndex + 1, index)) {
                return true;
            }
        }
        failed.add(key);
        return false;
    };
    for (let start = 0; start < target.length; start = nextAnchor(start + 1)) {
        if (match(0, start)) {
            return true;
        }
    }
    return false;
};
