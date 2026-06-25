import type { Locale } from '../i18n/config';
import { useTranslations } from '../i18n/utils';

/** schema.org MedicalClinic / LocalBusiness structured data for the clinic. */
export function clinicJsonLd(locale: Locale, siteUrl: string) {
	const t = useTranslations(locale);
	return {
		'@context': 'https://schema.org',
		'@type': 'MedicalClinic',
		name: t('site.name'),
		url: siteUrl,
		medicalSpecialty: ['Gastroenterologic', 'Proctologic'],
		address: {
			'@type': 'PostalAddress',
			streetAddress: '4-11-5 Shiba, KT Bldg. 3F',
			addressLocality: 'Minato-ku',
			addressRegion: 'Tokyo',
			postalCode: '105-0014',
			addressCountry: 'JP',
		},
		availableLanguage: ['ja', 'en', 'zh', 'pt', 'ru', 'es'],
		openingHoursSpecification: [
			{
				'@type': 'OpeningHoursSpecification',
				dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Friday'],
				opens: '10:00',
				closes: '12:15',
			},
			{
				'@type': 'OpeningHoursSpecification',
				dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Friday'],
				opens: '15:00',
				closes: '17:45',
			},
			{
				'@type': 'OpeningHoursSpecification',
				dayOfWeek: ['Saturday'],
				opens: '10:00',
				closes: '12:15',
			},
		],
	};
}
