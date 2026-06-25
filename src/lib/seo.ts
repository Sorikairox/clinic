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
		telephone: '+81-3-6453-9307',
		faxNumber: '+81-3-6453-9367',
		medicalSpecialty: ['Gastroenterologic', 'Proctologic'],
		address: {
			'@type': 'PostalAddress',
			streetAddress: '4-11-5 Shiba, KT Bldg. 3F',
			addressLocality: 'Minato-ku',
			addressRegion: 'Tokyo',
			postalCode: '108-0014',
			addressCountry: 'JP',
		},
		availableLanguage: ['ja', 'en', 'zh', 'pt', 'ru', 'es'],
		openingHoursSpecification: [
			{
				'@type': 'OpeningHoursSpecification',
				dayOfWeek: ['Monday', 'Thursday', 'Friday'],
				opens: '10:00',
				closes: '12:30',
			},
			{
				'@type': 'OpeningHoursSpecification',
				dayOfWeek: ['Monday', 'Thursday', 'Friday'],
				opens: '15:00',
				closes: '18:00',
			},
			{
				'@type': 'OpeningHoursSpecification',
				dayOfWeek: ['Tuesday', 'Saturday'],
				opens: '10:00',
				closes: '12:30',
			},
		],
	};
}
