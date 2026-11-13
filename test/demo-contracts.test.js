import { mkdir, readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';

const read = (path) => readFile(resolve(path), 'utf8');

it('retains surface pairs without accent focus, faded controls, or forced-color prose overrides', async () => {
	const css = await read('demo/styles.css');
	expect(css).not.toMatch(/GrayText|ActiveText|Highlight|SelectedItem/);
	expect(css).not.toMatch(/:focus-visible|opacity:|forced-color-adjust/);
	expect(css).toMatch(/code\s*\{[^}]*color:\s*ButtonText/s);
	expect(css).toMatch(/\.demo\s*\{[^}]*color:\s*CanvasText/s);
	expect(css).toMatch(/\.note\s*\{[^}]*color:\s*MarkText/s);
	expect(css).toContain('prefers-contrast: more');
});

it('provides paired examples, fallback guidance, and credits on every import page', async () => {
	for (const name of ['index', 'esm', 'unpkg']) {
		const html = await read(`demo/${name}.html`);
		expect(html).toContain('class="code-demo-pair"');
		expect(html).toContain('class="demo"');
		expect(html).toContain('<footer>');
		expect(html).toContain('<noscript>');
		expect(html).not.toMatch(/<pre>/);
		expect(html).toContain('not encryption');
		expect(html).toContain(
			'https://github.com/aarongustafson/form-obfuscator/blob/main/README.md',
		);
	}
});

it('preserves release scripts, versioned class import, and guarded registration', async () => {
	const pkg = JSON.parse(await read('package.json'));
	expect(pkg.scripts.version).toBe(
		'node scripts/update-demo-versions.js && git add demo/esm.html',
	);
	expect(pkg.scripts.postversion).toBe('git push --follow-tags');
	expect(await read('demo/esm.html')).toContain(
		`form-obfuscator@${pkg.version}/form-obfuscator.js`,
	);
	expect(await read('demo/unpkg.html')).toContain(
		'form-obfuscator@latest/define.js?module',
	);
	expect(await read('form-obfuscator.js')).not.toMatch(
		/Canvas|ButtonFace|Highlight|createElement\(['"]style/,
	);
});

it('pairs the generated README page and retains native link colors', async () => {
	const workflow = await read('.github/workflows/pages.yml');
	expect(workflow).toContain('color:CanvasText;background:Canvas');
	expect(workflow).toContain('color:LinkText');
	expect(workflow).not.toContain('hotpink');
	expect(workflow).toContain('sed \'s/<pre>/<pre tabindex="0">/g\'');
});

it('retains the version helper without bumping, staging, tagging, or pushing', async () => {
	const before = await read('demo/esm.html');
	execFileSync(process.execPath, ['scripts/update-demo-versions.js']);
	expect(await read('demo/esm.html')).toBe(before);
	const publish = await read('.github/workflows/publish.yml');
	expect(publish).toContain('npm publish --provenance --access public');
	expect(publish).toContain('npm publish --dry-run --access public');
	expect(publish).toContain('test "$GITHUB_REF_NAME" = "$expected_tag"');
});

for (const failing of [false, true]) {
	it(`README conversion ${failing ? 'failure stops deployment' : 'success preserves focusable code and proceeds'}`, async () => {
		const workflow = await read('.github/workflows/pages.yml');
		const conversion = workflow
			.split('              run: |\n')[1]
			.split('\n\n')[0]
			.replace(/^ {18}/gm, '')
			.replaceAll(
				'${{ github.event.repository.name }}',
				'form-obfuscator',
			);
		const fixture = resolve(
			`coverage/pages-conversion-${process.pid}-${failing}`,
		);
		await mkdir(fixture, { recursive: true });
		try {
			const converter = failing
				? "npx() { printf '%s\\n' '<pre>Partial conversion</pre>'; return 47; }\n"
				: "npx() { printf '%s\\n' '<pre><code>Example</code></pre>'; }\n";
			const result = spawnSync(
				'bash',
				[
					'-e',
					'-c',
					`${converter}${conversion}\nprintf deployed > deployment-reached`,
				],
				{ cwd: fixture, encoding: 'utf8' },
			);
			expect(result.error).toBeUndefined();
			expect(result.status).toBe(failing ? 47 : 0);
			const html = await readFile(resolve(fixture, 'index.html'), 'utf8');
			if (failing) {
				expect(html).not.toContain('</body></html>');
				await expect(
					readFile(resolve(fixture, 'deployment-reached')),
				).rejects.toMatchObject({ code: 'ENOENT' });
			} else {
				expect(html).toContain(
					'<pre tabindex="0"><code>Example</code></pre>',
				);
				expect(
					await readFile(
						resolve(fixture, 'deployment-reached'),
						'utf8',
					),
				).toBe('deployed');
			}
		} finally {
			await rm(fixture, { recursive: true, force: true });
		}
	});
}

it('keeps Field/Mark assertions outside the native-button expected failure', async () => {
	const browserTests = await read('test/browser/colors.spec.js');
	const normalTest = browserTests.match(
		/test\(`\$\{name\} \$\{colorScheme\}: Field\/Mark text contrast`,([\s\S]*?)\n\t\t}\);/,
	);
	expect(normalTest).not.toBeNull();
	expect(normalTest[1]).not.toContain('test.fail');
	expect(normalTest[1]).toContain('assertTextContrast');
});
