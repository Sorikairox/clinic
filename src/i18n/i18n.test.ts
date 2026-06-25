import { describe, expect, it } from 'vitest';
import { LOCALES } from './config';

import ja from './ja.json';
import en from './en.json';
import zhHans from './zh-Hans.json';
import zhHant from './zh-Hant.json';
import ptBR from './pt-BR.json';
import ru from './ru.json';
import es from './es.json';

const DICTS: Record<string, unknown> = {
	ja,
	en,
	'zh-Hans': zhHans,
	'zh-Hant': zhHant,
	'pt-BR': ptBR,
	ru,
	es,
};

// Flatten to a sorted list of dotted keys, marking arrays so a list that becomes
// a string (or vice versa) is also caught.
function keysOf(obj: unknown, prefix = ''): string[] {
	if (Array.isArray(obj)) return [`${prefix}[]`];
	if (obj && typeof obj === 'object') {
		return Object.entries(obj as Record<string, unknown>)
			.flatMap(([k, v]) => keysOf(v, prefix ? `${prefix}.${k}` : k))
			.sort();
	}
	return [prefix];
}

describe('i18n dictionaries', () => {
	const reference = keysOf(en);

	it('covers every configured locale', () => {
		expect(Object.keys(DICTS).sort()).toEqual([...LOCALES].sort());
	});

	for (const locale of LOCALES) {
		it(`${locale} has the same keys as en`, () => {
			expect(keysOf(DICTS[locale])).toEqual(reference);
		});
	}
});
