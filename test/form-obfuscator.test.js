import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fireEvent, waitFor } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { FormObfuscatorElement } from '../form-obfuscator.js';

describe('FormObfuscatorElement', () => {
	let container;
	let user;

	beforeEach(() => {
		// Create a test container
		container = document.createElement('div');
		document.body.appendChild(container);
		user = userEvent.setup();
	});

	afterEach(() => {
		// Clean up
		document.body.removeChild(container);
	});

	const createForm = (formHTML) => {
		container.innerHTML = `<form>${formHTML}</form>`;
		return container.querySelector('form');
	};

	describe('Basic functionality', () => {
		it('should be defined as a custom element', () => {
			expect(customElements.get('form-obfuscator')).toBe(
				FormObfuscatorElement,
			);
		});

		it('should obfuscate field value on blur', async () => {
			const form = createForm(`
				<form-obfuscator>
					<label>
						Password
						<input type="text" name="password" value="">
					</label>
				</form-obfuscator>
			`);

			const formObfuscator = form.querySelector('form-obfuscator');

			// Wait for connectedCallback
			await new Promise((resolve) => setTimeout(resolve, 150));

			// After init, the visible field no longer has the name attribute
			const input = formObfuscator.querySelector('input[type="text"]');

			// Type into the field
			await user.click(input);
			await user.type(input, 'secret123');

			// Field should show actual value while focused
			expect(input.value).toBe('secret123');

			// Blur the field
			await user.click(document.body);
			fireEvent.blur(input);

			// Wait for blur handling
			await waitFor(() => {
				expect(input.value).toBe('*********');
			});
		});

		it('should reveal field value on focus', async () => {
			const form = createForm(`
				<form-obfuscator>
					<label>
						Password
						<input type="text" name="password" value="">
					</label>
				</form-obfuscator>
			`);

			const formObfuscator = form.querySelector('form-obfuscator');

			// Wait for connectedCallback
			await new Promise((resolve) => setTimeout(resolve, 150));

			// After init, the visible field no longer has the name attribute
			const input = formObfuscator.querySelector('input[type="text"]');

			// Type and blur
			await user.click(input);
			await user.type(input, 'secret123');
			// Explicitly trigger blur instead of clicking away
			input.blur();
			await new Promise((resolve) => setTimeout(resolve, 50));

			await waitFor(() => {
				expect(input.value).toBe('*********');
			});

			// Focus again - explicitly trigger focus
			input.focus();
			// Give time for the focus event to be processed
			await new Promise((resolve) => setTimeout(resolve, 50));

			await waitFor(() => {
				expect(input.value).toBe('secret123');
			});
		});

		it('should create a hidden field with the actual value', async () => {
			const form = createForm(`
				<form-obfuscator>
					<label>
						Password
						<input type="text" name="password" value="">
					</label>
				</form-obfuscator>
			`);

			const formObfuscator = form.querySelector('form-obfuscator');

			// Wait for connectedCallback
			await new Promise((resolve) => setTimeout(resolve, 150));

			// After init, the visible field no longer has the name attribute
			const input = formObfuscator.querySelector('input[type="text"]');

			// Type and blur
			await user.click(input);
			await user.type(input, 'secret123');
			await user.click(document.body);
			// Give time for blur event to be processed
			await new Promise((resolve) => setTimeout(resolve, 50));

			await waitFor(() => {
				// Find the hidden field
				const hiddenField = form.querySelector(
					'input[type="hidden"][name="password"]',
				);
				expect(hiddenField).not.toBeNull();
				expect(hiddenField.value).toBe('secret123');
			});
		});

		it('should use custom character for obfuscation', async () => {
			const form = createForm(`
				<form-obfuscator character="•">
					<label>
						Password
						<input type="text" name="password" value="">
					</label>
				</form-obfuscator>
			`);

			const formObfuscator = form.querySelector('form-obfuscator');

			// Wait for connectedCallback
			await new Promise((resolve) => setTimeout(resolve, 150));

			// After init, the visible field no longer has the name attribute
			const input = formObfuscator.querySelector('input[type="text"]');

			// Type and blur
			await user.click(input);
			await user.type(input, 'secret');
			await user.click(document.body);
			fireEvent.blur(input);

			await waitFor(() => {
				expect(input.value).toBe('••••••');
			});
		});

		it('should respect maxlength attribute', async () => {
			const form = createForm(`
				<form-obfuscator maxlength="4">
					<label>
						Password
						<input type="text" name="password" value="">
					</label>
				</form-obfuscator>
			`);

			const formObfuscator = form.querySelector('form-obfuscator');

			// Wait for connectedCallback
			await new Promise((resolve) => setTimeout(resolve, 150));

			// After init, the visible field no longer has the name attribute
			const input = formObfuscator.querySelector('input[type="text"]');

			// Type and blur
			await user.click(input);
			await user.type(input, 'secret123');
			await user.click(document.body);
			fireEvent.blur(input);

			await waitFor(() => {
				expect(input.value).toBe('****');
			});
		});
	});

	describe('Pattern-based obfuscation', () => {
		it('should obfuscate around pattern match', async () => {
			const form = createForm(`
				<form-obfuscator pattern="\\d{4}$">
					<label>
						Credit Card
						<input type="text" name="card" value="">
					</label>
				</form-obfuscator>
			`);

			const formObfuscator = form.querySelector('form-obfuscator');

			// Wait for connectedCallback
			await new Promise((resolve) => setTimeout(resolve, 150));

			// After init, the visible field no longer has the name attribute
			const input = formObfuscator.querySelector('input[type="text"]');

			// Type and blur
			await user.click(input);
			await user.type(input, '1234567812345678');
			await user.click(document.body);
			// Give time for blur event to be processed
			await new Promise((resolve) => setTimeout(resolve, 50));

			await waitFor(() => {
				// Should show only the last 4 digits with leading asterisks
				expect(input.value).toMatch(/\*+5678$/);
			});
		});
	});

	describe('Events', () => {
		it('should emit form-obfuscator:hide event on blur', async () => {
			const form = createForm(`
				<form-obfuscator>
					<label>
						Password
						<input type="text" name="password" value="">
					</label>
				</form-obfuscator>
			`);

			const formObfuscator = form.querySelector('form-obfuscator');

			// Wait for connectedCallback
			await new Promise((resolve) => setTimeout(resolve, 150));

			// After init, the visible field no longer has the name attribute
			const input = formObfuscator.querySelector('input[type="text"]');

			let hideEventFired = false;
			formObfuscator.addEventListener('form-obfuscator:hide', (e) => {
				hideEventFired = true;
				expect(e.detail.field).toBe(input);
			});

			// Type and blur
			await user.click(input);
			await user.type(input, 'secret');
			await user.click(document.body);
			fireEvent.blur(input);

			await waitFor(() => {
				expect(hideEventFired).toBe(true);
			});
		});

		it('should emit form-obfuscator:reveal event on focus', async () => {
			const form = createForm(`
				<form-obfuscator>
					<label>
						Password
						<input type="text" name="password" value="">
					</label>
				</form-obfuscator>
			`);

			const formObfuscator = form.querySelector('form-obfuscator');

			// Wait for connectedCallback
			await new Promise((resolve) => setTimeout(resolve, 150));

			// After init, the visible field no longer has the name attribute
			const input = formObfuscator.querySelector('input[type="text"]');

			// Type and blur first
			await user.click(input);
			await user.type(input, 'secret');
			await user.click(document.body);
			fireEvent.blur(input);

			await waitFor(() => {
				expect(input.value).toBe('******');
			});

			let revealEventFired = false;
			formObfuscator.addEventListener('form-obfuscator:reveal', (e) => {
				revealEventFired = true;
				expect(e.detail.field).toBe(input);
			});

			// Focus again
			await user.click(input);
			fireEvent.focus(input);

			await waitFor(() => {
				expect(revealEventFired).toBe(true);
			});
		});
	});
});
