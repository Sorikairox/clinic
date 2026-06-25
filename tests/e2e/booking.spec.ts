import { expect, test } from '@playwright/test';

test.describe('Booking + dashboard flow', () => {
	test('a patient can pick a slot, submit, and see the confirmation page', async ({ page }) => {
		await page.goto('/en/reservation');
		await page.locator('a.slot').first().click();

		// Patient form is shown for the selected slot.
		await expect(page.locator('#name')).toBeVisible();
		await page.fill('#name', 'E2E Patient');
		await page.fill('#email', 'e2e-patient@example.com');
		await page.fill('#phone', '09000000000');
		await page.click('button[type=submit]');

		await expect(page.locator('.success-banner')).toBeVisible();
	});

	test('concurrent booking of the same slot: one succeeds, one is rejected', async ({ request }) => {
		const slotStart = '2026-06-26T16:00';
		const post = () =>
			request.post('/en/reservation?_action=createBooking', {
				form: {
					slotStart,
					name: 'Race Condition',
					email: 'race@example.com',
					phone: '09000000000',
					locale: 'ja',
				},
				headers: { Origin: 'http://127.0.0.1:4321' },
				maxRedirects: 0,
			});

		const [a, b] = await Promise.all([post(), post()]);
		const statuses = [a.status(), b.status()];
		// Exactly one conflict (409); the other is a success redirect (3xx).
		expect(statuses.filter((s) => s === 409)).toHaveLength(1);
		expect(statuses.filter((s) => s >= 300 && s < 400)).toHaveLength(1);
	});

	test('staff can log in, see a pending booking, and confirm it', async ({ page }) => {
		// Create a booking to act on.
		await page.goto('/en/reservation');
		await page.locator('a.slot').first().click();
		await page.fill('#name', 'Dashboard Patient');
		await page.fill('#email', 'dash-patient@example.com');
		await page.fill('#phone', '09000000000');
		await page.click('button[type=submit]');
		await expect(page.locator('.success-banner')).toBeVisible();

		// Log in.
		await page.goto('/admin/login');
		await page.fill('#email', 'e2e@clinic.test');
		await page.fill('#password', 'e2epass123');
		await page.click('button[type=submit]');
		await expect(page).toHaveURL(/\/admin$/);
		await expect(page.locator('body')).toContainText('Dashboard Patient');

		// Confirm the first pending booking.
		await page.locator('form[action*="confirmBooking"] button').first().click();
		await expect(page.locator('.success-banner')).toContainText('confirmed');
	});

	test('the homepage renders localized content for non-default locales', async ({ page }) => {
		await page.goto('/es');
		await expect(page).toHaveTitle(/Clínica Coloproctológica Shiba/);
		await page.goto('/');
		await expect(page.locator('html')).toHaveAttribute('lang', 'ja-JP');
	});
});
