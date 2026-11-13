import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

const read = (path) =>
	readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
const source = await read('form-obfuscator.js');
const definition = await read('define.js');
const css = await read('demo/styles.css');
const pages = ['index', 'esm', 'unpkg'];
const tokens = [
	'Canvas',
	'CanvasText',
	'ButtonFace',
	'ButtonText',
	'Field',
	'FieldText',
	'Mark',
	'MarkText',
];
// Read-only study fixtures: 62 observations, 19 distinct palettes. Preserve alpha.
// github.com/aarongustafson/system-color-study, November 2026 captures.
const palettes = [
	['#ffffff', '#000000', '#efefef', '#000000', '#ffffff', '#000000'],
	['#121212', '#ffffff', '#6b6b6b', '#ffffff', '#3b3b3b', '#ffffff'],
	['#ffffff', '#000000', '#e9e9ed', '#000000', '#ffffff', '#000000'],
	['#1c1b22', '#fbfbfe', '#2b2a33', '#fbfbfe', '#2b2a33', '#fbfbfe'],
	['#ffffff', '#000000', '#c0c0c0', '#000000d8', '#ffffff', '#000000d8'],
	['#1e1e1e', '#ffffff', '#ffffff3f', '#ffffffd8', '#ffffff3f', '#ffffffd8'],
	['#ffffff', '#000000', '#f0f0f0', '#000000', '#ffffff', '#000000'],
	['#202020', '#ffffff', '#202020', '#ffffff', '#202020', '#ffffff'],
	['#fffaef', '#3d3d3d', '#fffaef', '#202020', '#fffaef', '#3d3d3d'],
	['#2d3236', '#ffffff', '#2d3236', '#b6f6f0', '#2d3236', '#ffffff'],
	['#000000', '#ffffff', '#000000', '#ffee32', '#000000', '#ffffff'],
	['#000000', '#ffffff', '#000000', '#ffee32', '#000000', '#ffee32'],
	['#2d3236', '#ffffff', '#2d3236', '#b6f6f0', '#2d3236', '#b6f6f0'],
	['#fffaef', '#3d3d3d', '#fffaef', '#202020', '#fffaef', '#202020'],
	['#ffffff', '#000000', '#c0c0c0', '#000000', '#ffffff', '#000000'],
	['#000000', '#ffffff', '#c0c0c0', '#000000', '#ffffff', '#000000'],
	['#ffffff', '#000000', '#ffffff', '#000000d8', '#ffffff', '#000000d8'],
	['#282828', '#ffffff', '#202020', '#ffffff', '#202020', '#ffffff'],
	['#202020', '#ffffff', '#00000000', '#ffffff', '#00000000', '#ffffff'],
];

function substitute(styles, palette) {
	const values = Object.fromEntries(
		tokens.map((token, index) => [
			token.toLowerCase(),
			[...palette, '#ffff00', '#000000'][index],
		]),
	);
	return styles.replace(
		/\b(CanvasText|Canvas|ButtonFace|ButtonText|FieldText|Field|MarkText|Mark)\b/gi,
		(token) => values[token.toLowerCase()],
	);
}

async function demo(page, name = 'index', fail = false) {
	await page.route('https://esm.sh/**', (route) =>
		fail
			? route.abort()
			: route.fulfill({ contentType: 'text/javascript', body: source }),
	);
	await page.route('https://unpkg.com/**', (route) =>
		fail
			? route.abort()
			: route.fulfill({
					contentType: 'text/javascript',
					body: definition.replace(
						"'./form-obfuscator.js'",
						"'http://127.0.0.1:4189/form-obfuscator.js'",
					),
				}),
	);
	if (fail) await page.route('**/define.js', (route) => route.abort());
	await page.goto(`/demo/${name}.html`);
	if (!fail)
		await expect(
			page.locator('input[type="hidden"]').first(),
		).toBeAttached();
}

async function measureAll(locator) {
	return locator.evaluateAll((elements) => {
		const canvas = document.createElement('canvas');
		canvas.width = canvas.height = 1;
		const context = canvas.getContext('2d', { willReadFrequently: true });
		const pixel = () => [...context.getImageData(0, 0, 1, 1).data];
		const paint = (color) => {
			context.fillStyle = color;
			context.fillRect(0, 0, 1, 1);
			return pixel();
		};
		const background = (node) => {
			context.clearRect(0, 0, 1, 1);
			const ancestors = [];
			for (; node; node = node.parentElement) ancestors.unshift(node);
			for (const ancestor of ancestors) {
				const style = getComputedStyle(ancestor);
				if (style.opacity !== '1')
					throw new Error('Opacity requires group compositing.');
				paint(style.backgroundColor);
				if (style.backgroundImage !== 'none') {
					const uniform = style.backgroundImage.match(
						/^linear-gradient\((.+), \1\)$/,
					);
					if (!uniform) throw new Error('Unsupported background.');
					paint(uniform[1]);
				}
			}
			if (pixel()[3] !== 255) throw new Error('Expected opaque surface.');
			return pixel();
		};
		const luminance = (rgb) =>
			rgb.slice(0, 3).reduce((sum, channel, index) => {
				const value = channel / 255;
				return (
					sum +
					(value <= 0.04045
						? value / 12.92
						: ((value + 0.055) / 1.055) ** 2.4) *
						[0.2126, 0.7152, 0.0722][index]
				);
			}, 0);
		const ratio = (a, b) => {
			const values = [luminance(a), luminance(b)].sort((a, b) => b - a);
			return (values[0] + 0.05) / (values[1] + 0.05);
		};
		return elements.map((element) => {
			const style = getComputedStyle(element);
			const surround = background(
				element.tagName === 'BODY' ? element : element.parentElement,
			);
			const fill = background(element);
			const text = ratio(paint(style.color), fill);
			background(element);
			const border = paint(style.borderTopColor);
			const paintsBorder =
				parseFloat(style.borderTopWidth) > 0 &&
				!['none', 'hidden'].includes(style.borderTopStyle);
			return {
				tag: element.tagName,
				text,
				boundary: paintsBorder
					? Math.max(ratio(border, fill), ratio(border, surround))
					: 1,
			};
		});
	});
}

async function measurements(locator) {
	return (await measureAll(locator))[0];
}

test('palette replacement handles normalized CSSOM keyword casing', async ({
	page,
}) => {
	await page.setContent(
		'<style>.probe {color:canvastext;background:cAnVaS}</style><p class="probe">Text</p>',
	);
	const serialized = await page
		.locator('style')
		.evaluate((style) => style.sheet.cssRules[0].cssText);
	await page.addStyleTag({ content: substitute(serialized, palettes[1]) });
	await expect(page.locator('.probe')).toHaveCSS(
		'color',
		'rgb(255, 255, 255)',
	);
	await expect(page.locator('.probe')).toHaveCSS(
		'background-color',
		'rgb(18, 18, 18)',
	);
});

for (const name of pages) {
	for (const colorScheme of ['light', 'dark']) {
		test(`${name} ${colorScheme}: reading surfaces and native focus`, async ({
			page,
		}) => {
			await page.emulateMedia({ colorScheme });
			await demo(page, name);
			for (const selector of [
				'body',
				'.demo-section',
				'.demo',
				'footer',
				'small',
			]) {
				for (const element of await page.locator(selector).all())
					expect(
						(await measurements(element)).text,
						selector,
					).toBeGreaterThanOrEqual(4.5);
			}
			const field = page.locator('input:not([type="hidden"])').first();
			await field.focus();
			await page.keyboard.press('Tab');
			await page.keyboard.press('Shift+Tab');
			await expect(field).toBeFocused();
			expect(
				await field.evaluate((field) => {
					const style = getComputedStyle(field);
					return (
						field.matches(':focus-visible') &&
						style.outlineStyle !== 'none' &&
						parseFloat(style.outlineWidth) > 0
					);
				}),
			).toBe(true);
			expect(await field.getAttribute('aria-label')).toBeNull();
			expect(await field.getAttribute('id')).toBeTruthy();
		});

		test(`${name} ${colorScheme}: native control and code pairs`, async ({
			page,
			browserName,
		}) => {
			test.fail(
				process.platform === 'linux' &&
					browserName === 'webkit' &&
					colorScheme === 'dark',
				'Bundled Ubuntu WebKit native dark ButtonText/ButtonFace is 1.82:1.',
			);
			await page.emulateMedia({ colorScheme });
			await demo(page, name);
			for (const element of await page
				.locator(
					'code, pre, mark, input:not([type="hidden"]), button, output',
				)
				.all())
				expect(
					(await measurements(element)).text,
				).toBeGreaterThanOrEqual(4.5);
		});
	}

	test(`${name}: all 19 recorded palettes, inherited and transparent surfaces`, async ({
		page,
	}) => {
		test.setTimeout(120000);
		await demo(page, name);
		await page.locator('main').evaluate((main) => {
			main.insertAdjacentHTML(
				'beforeend',
				'<aside class="note"><p>Note <code>code</code> <a href="#sample">link</a></p><small>Note help</small></aside><aside class="api-reference"><p>API <code>code</code> <a href="#sample">link</a></p><small>API help</small></aside><button type="reset">Reset <small>Button help</small></button>',
			);
		});
		const styles = await page.addStyleTag({ content: css });
		for (const palette of palettes) {
			await styles.evaluate(
				(style, content) => {
					style.textContent = content;
				},
				substitute(css, palette),
			);
			for (const value of await measureAll(
				page.locator(
					'body, .demo-section, .demo, pre, code, mark, label, small, output, footer, .note p, .note a, .api-reference p, .api-reference a, input:not([type="hidden"]), button',
				),
			)) {
				expect(
					value.text,
					`${palette[0]} ${value.tag}`,
				).toBeGreaterThanOrEqual(4.5);
				if (['INPUT', 'BUTTON'].includes(value.tag))
					expect(value.boundary).toBeGreaterThanOrEqual(3);
			}
			for (const button of await page.locator('button').all()) {
				await button.hover();
				expect(
					(await measurements(button)).text,
				).toBeGreaterThanOrEqual(4.5);
				await expect(button).toHaveCSS(
					'text-decoration-line',
					'underline',
				);
				await page.mouse.move(0, 0);
			}
		}
	});

	for (const failure of ['no-js', 'module-failure']) {
		test(`${name}: ${failure} leaves native labeled, editable fields`, async ({
			browser,
		}) => {
			const context = await browser.newContext({
				baseURL: 'http://127.0.0.1:4189',
				javaScriptEnabled: failure !== 'no-js',
			});
			const page = await context.newPage();
			await demo(page, name, true);
			const field = page.locator('input:not([type="hidden"])').first();
			await field.fill('Public sample only');
			await expect(field).toHaveValue('Public sample only');
			await expect(page.locator('input[type="hidden"]')).toHaveCount(0);
			await expect(
				page.getByText('not encryption', { exact: false }).first(),
			).toBeVisible();
			await expect(field).toHaveAccessibleName(/.+/);
			if (name === 'index') {
				expect(
					await page
						.locator('#real-world-form')
						.evaluate((form) =>
							Object.fromEntries(new FormData(form)),
						),
				).toEqual({
					password: 'MySecretPassword123',
					ssn: '123-45-6789',
					credit_card: '1234-5678-9012-3456',
				});
			}
			await context.close();
		});
	}

	test(`${name}: code-left/live-right and 320px reflow with enlarged text`, async ({
		page,
	}) => {
		await demo(page, name);
		await page.setViewportSize({ width: 1200, height: 800 });
		const pair = page.locator('.code-demo-pair').first();
		const code = await pair.locator('> :first-child').boundingBox();
		const live = await pair.locator('> .demo').boundingBox();
		expect(code.x + code.width).toBeLessThanOrEqual(live.x);
		for (const size of [16, 32]) {
			await page.setViewportSize({ width: 320, height: 800 });
			await page.addStyleTag({ content: `html {font-size:${size}px}` });
			expect(
				await page.evaluate(() => document.documentElement.scrollWidth),
			).toBeLessThanOrEqual(320);
			const first = await pair.locator('> :first-child').boundingBox();
			const second = await pair.locator('> .demo').boundingBox();
			expect(first.y + first.height).toBeLessThanOrEqual(second.y);
		}
	});
}

test('keyboard reveals and hides values without changing submission or authored names', async ({
	page,
}) => {
	await demo(page);
	const field = page
		.getByRole('textbox', { name: 'Password', exact: true })
		.last();
	await field.focus();
	await expect(field).toHaveValue('MySecretPassword123');
	await field.fill('Edited sample');
	await page.keyboard.press('Tab');
	await expect(field).toHaveValue('*************');
	expect(
		await page
			.locator('#real-world-form')
			.evaluate((form) => Object.fromEntries(new FormData(form))),
	).toEqual({
		password: 'Edited sample',
		ssn: '123-45-6789',
		credit_card: '1234-5678-9012-3456',
	});
	await page.keyboard.press('Shift+Tab');
	await expect(field).toBeFocused();
	await expect(field).toHaveValue('Edited sample');
	await page.locator('#real-world-form').evaluate((form) => {
		form.addEventListener('submit', (event) => {
			event.preventDefault();
			form.dataset.submitted = JSON.stringify(
				Object.fromEntries(new FormData(form)),
			);
		});
	});
	await page.getByRole('button', { name: 'Submit', exact: true }).focus();
	await page.keyboard.press('Enter');
	await expect(page.locator('#real-world-form')).toHaveAttribute(
		'data-submitted',
		JSON.stringify({
			password: 'Edited sample',
			ssn: '123-45-6789',
			credit_card: '1234-5678-9012-3456',
		}),
	);
	const eventField = page.getByRole('textbox', { name: 'Event Demo' });
	await eventField.focus();
	await eventField.fill('<b>Fictional sample</b>');
	await page.keyboard.press('Tab');
	await eventField.focus();
	await expect(page.locator('#event-log')).toContainText(
		'<b>Fictional sample</b>',
	);
	await expect(page.locator('#event-log b')).toHaveCount(0);
});

test('generated README baseline keeps reading links and transparent code surfaces readable', async ({
	page,
}) => {
	const workflow = await read('.github/workflows/pages.yml');
	const baseline = workflow.match(/<style>(.+)<\/style>/)[1];
	for (const colorScheme of ['light', 'dark']) {
		await page.emulateMedia({ colorScheme });
		await page.setContent(
			`<style>${baseline}</style><p>Documentation <a href="#sample">link</a></p><code>Inline code</code><pre><code>Example</code></pre>`,
		);
		for (const value of await measureAll(page.locator('body, a')))
			expect(value.text).toBeGreaterThanOrEqual(4.5);
	}
	for (const palette of palettes) {
		await page.setContent(
			`<style>${substitute(baseline, palette)}</style><p>Documentation</p><code>Inline code</code><pre><code>Example</code></pre>`,
		);
		for (const value of await measureAll(page.locator('body, code, pre')))
			expect(value.text).toBeGreaterThanOrEqual(4.5);
	}
});
for (const preference of ['forced', 'more-contrast']) {
	test(`${preference}: system pairs and non-color hover cue survive`, async ({
		page,
		browserName,
	}) => {
		test.skip(
			preference === 'forced' && browserName === 'webkit',
			'WebKit does not emulate forced colors.',
		);
		await page.emulateMedia(
			preference === 'forced'
				? { forcedColors: 'active' }
				: { contrast: 'more' },
		);
		await demo(page);
		const button = page.getByRole('button', {
			name: 'Submit',
			exact: true,
		});
		await button.hover();
		await expect(button).toHaveCSS('text-decoration-line', 'underline');
		await expect(page.locator('footer')).toHaveCSS(
			'color',
			await page
				.locator('body')
				.evaluate((body) => getComputedStyle(body).color),
		);
		for (const selector of ['.demo', 'small', 'footer', 'mark', 'output'])
			expect(
				(await measurements(page.locator(selector).first())).text,
			).toBeGreaterThanOrEqual(4.5);
	});
}

test('fixture is no-cache, read-only, and does not expose dotfiles or dependencies', async ({
	request,
}) => {
	const response = await request.get('/demo/index.html');
	expect(response.headers()['cache-control']).toBe('no-store');
	expect((await request.get('/.git/config')).status()).toBe(403);
	expect(
		(await request.get('/node_modules/vitest/package.json')).status(),
	).toBe(403);
	expect((await request.post('/demo/index.html')).status()).toBe(405);
});
