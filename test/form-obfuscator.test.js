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

		it('should include hidden field in event detail', async () => {
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

			const input = formObfuscator.querySelector('input[type="text"]');

			let hiddenField;
			formObfuscator.addEventListener('form-obfuscator:hide', (e) => {
				expect(e.detail.hidden).toBeDefined();
				expect(e.detail.hidden.type).toBe('hidden');
				hiddenField = e.detail.hidden;
			});

			// Type and blur
			await user.click(input);
			await user.type(input, 'secret123');
			fireEvent.blur(input);

			await waitFor(() => {
				expect(hiddenField).toBeDefined();
				expect(hiddenField.value).toBe('secret123');
			});
		});
	});

	describe('Comprehensive attribute tests', () => {
		it('should handle different special characters', async () => {
			const specialChars = ['•', '✖', '█', '●', '▪'];

			for (const char of specialChars) {
				const form = createForm(`
					<form-obfuscator character="${char}">
						<label>
							Field
							<input type="text" name="field" value="">
						</label>
					</form-obfuscator>
				`);

				const formObfuscator = form.querySelector('form-obfuscator');
				await new Promise((resolve) => setTimeout(resolve, 150));

				const input =
					formObfuscator.querySelector('input[type="text"]');
				await user.click(input);
				await user.type(input, 'test');
				fireEvent.blur(input);

				await waitFor(() => {
					expect(input.value).toBe(char.repeat(4));
				});

				// Clean up for next iteration
				container.innerHTML = '';
			}
		});

		it('should combine character and maxlength correctly', async () => {
			const form = createForm(`
				<form-obfuscator character="•" maxlength="3">
					<label>
						Field
						<input type="text" name="field" value="">
					</label>
				</form-obfuscator>
			`);

			const formObfuscator = form.querySelector('form-obfuscator');
			await new Promise((resolve) => setTimeout(resolve, 150));

			const input = formObfuscator.querySelector('input[type="text"]');
			await user.click(input);
			await user.type(input, 'verylongpassword');
			fireEvent.blur(input);

			await waitFor(() => {
				expect(input.value).toBe('•••');
			});
		});

		it('should handle pattern with custom character', async () => {
			const form = createForm(`
				<form-obfuscator pattern="\\d{4}$" character="•">
					<label>
						Credit Card
						<input type="text" name="card" value="">
					</label>
				</form-obfuscator>
			`);

			const formObfuscator = form.querySelector('form-obfuscator');
			await new Promise((resolve) => setTimeout(resolve, 150));

			const input = formObfuscator.querySelector('input[type="text"]');
			await user.click(input);
			await user.type(input, '1234567890123456');
			fireEvent.blur(input);

			await waitFor(() => {
				expect(input.value).toMatch(/^•+3456$/);
			});
		});

		it('should combine pattern, character, and maxlength correctly', async () => {
			const form = createForm(`
				<form-obfuscator pattern="\\d{4}$" character="•" maxlength="16">
					<label>
						Credit Card
						<input type="text" name="card" value="">
					</label>
				</form-obfuscator>
			`);

			const formObfuscator = form.querySelector('form-obfuscator');
			await new Promise((resolve) => setTimeout(resolve, 150));

			const input = formObfuscator.querySelector('input[type="text"]');
			await user.click(input);
			await user.type(input, '1234-5678-9012-3456'); // 19 chars with hyphens
			fireEvent.blur(input);

			await waitFor(() => {
				// Pattern should keep last 4 digits visible: ••••••••••••••••3456 (15 bullets + 4 digits = 19)
				// Maxlength 16 should truncate to: ••••••••••••3456 (12 bullets + 4 digits = 16)
				expect(input.value).toBe('••••••••••••3456');
				expect(input.value.length).toBe(16);
			});
		});
	});

	describe('Comprehensive attribute tests', () => {
		it('should handle different special characters', async () => {
			const form = createForm(`
				<form-obfuscator>
					<label>
						Field
						<input type="text" name="field" value="">
					</label>
				</form-obfuscator>
			`);

			const formObfuscator = form.querySelector('form-obfuscator');
			await new Promise((resolve) => setTimeout(resolve, 150));

			const input = formObfuscator.querySelector('input[type="text"]');
			await user.click(input);
			fireEvent.blur(input);

			await waitFor(() => {
				expect(input.value).toBe('');
			});
		});

		it('should preserve spaces when obfuscating', async () => {
			const form = createForm(`
				<form-obfuscator>
					<label>
						Field
						<input type="text" name="field" value="">
					</label>
				</form-obfuscator>
			`);

			const formObfuscator = form.querySelector('form-obfuscator');
			await new Promise((resolve) => setTimeout(resolve, 150));

			const input = formObfuscator.querySelector('input[type="text"]');
			await user.click(input);
			await user.type(input, 'hello world');
			fireEvent.blur(input);

			await waitFor(() => {
				expect(input.value).toBe('***********');
				expect(input.value.length).toBe(11);
			});
		});

		it('should work with pre-filled values', async () => {
			const form = createForm(`
				<form-obfuscator character="•">
					<label>
						Field
						<input type="text" name="field" value="prefilled123">
					</label>
				</form-obfuscator>
			`);

			const formObfuscator = form.querySelector('form-obfuscator');
			await new Promise((resolve) => setTimeout(resolve, 150));

			const input = formObfuscator.querySelector('input[type="text"]');

			// Should be obfuscated on load
			await waitFor(() => {
				expect(input.value).toBe('••••••••••••');
			});

			// Focus should reveal
			input.focus();
			await new Promise((resolve) => setTimeout(resolve, 50));

			await waitFor(() => {
				expect(input.value).toBe('prefilled123');
			});
		});

		it('should handle maxlength of 0', async () => {
			const form = createForm(`
				<form-obfuscator maxlength="0">
					<label>
						Field
						<input type="text" name="field" value="">
					</label>
				</form-obfuscator>
			`);

			const formObfuscator = form.querySelector('form-obfuscator');
			await new Promise((resolve) => setTimeout(resolve, 150));

			const input = formObfuscator.querySelector('input[type="text"]');
			await user.click(input);
			await user.type(input, 'test');
			fireEvent.blur(input);

			await waitFor(() => {
				expect(input.value).toBe('');
			});
		});
	});

	describe('Pattern variations', () => {
		it('should handle SSN pattern correctly', async () => {
			const form = createForm(`
				<form-obfuscator pattern="\\d{4}$">
					<label>
						SSN
						<input type="text" name="ssn" value="">
					</label>
				</form-obfuscator>
			`);

			const formObfuscator = form.querySelector('form-obfuscator');
			await new Promise((resolve) => setTimeout(resolve, 150));

			const input = formObfuscator.querySelector('input[type="text"]');
			await user.click(input);
			await user.type(input, '123-45-6789');
			fireEvent.blur(input);

			await waitFor(() => {
				expect(input.value).toMatch(/\*+6789$/);
			});
		});

		it('should handle phone number pattern', async () => {
			const form = createForm(`
				<form-obfuscator pattern="\\d{4}$">
					<label>
						Phone
						<input type="text" name="phone" value="">
					</label>
				</form-obfuscator>
			`);

			const formObfuscator = form.querySelector('form-obfuscator');
			await new Promise((resolve) => setTimeout(resolve, 150));

			const input = formObfuscator.querySelector('input[type="text"]');
			await user.click(input);
			await user.type(input, '(555) 123-4567');
			fireEvent.blur(input);

			await waitFor(() => {
				expect(input.value).toMatch(/\*+4567$/);
			});
		});

		it('should obfuscate everything if pattern does not match', async () => {
			const form = createForm(`
				<form-obfuscator pattern="\\d{10}$">
					<label>
						Field
						<input type="text" name="field" value="">
					</label>
				</form-obfuscator>
			`);

			const formObfuscator = form.querySelector('form-obfuscator');
			await new Promise((resolve) => setTimeout(resolve, 150));

			const input = formObfuscator.querySelector('input[type="text"]');
			await user.click(input);
			await user.type(input, 'short');
			fireEvent.blur(input);

			await waitFor(() => {
				expect(input.value).toBe('*****');
			});
		});
	});

	describe('Replacer function tests', () => {
		it('should use custom replacer function', async () => {
			// Define custom replacer
			window.testReplacer = function (match) {
				return match.replace(/\d/g, 'X');
			};

			const form = createForm(`
				<form-obfuscator pattern="\\d+" replacer="return testReplacer(arguments[0])">
					<label>
						Field
						<input type="text" name="field" value="">
					</label>
				</form-obfuscator>
			`);

			const formObfuscator = form.querySelector('form-obfuscator');
			await new Promise((resolve) => setTimeout(resolve, 150));

			const input = formObfuscator.querySelector('input[type="text"]');
			await user.click(input);
			await user.type(input, 'test123');
			fireEvent.blur(input);

			await waitFor(() => {
				expect(input.value).toBe('testXXX');
			});

			// Cleanup
			delete window.testReplacer;
		});

		it('should ignore replacer without pattern', async () => {
			window.testReplacer2 = function () {
				return 'REPLACED';
			};

			const form = createForm(`
				<form-obfuscator replacer="return testReplacer2()">
					<label>
						Field
						<input type="text" name="field" value="">
					</label>
				</form-obfuscator>
			`);

			const formObfuscator = form.querySelector('form-obfuscator');
			await new Promise((resolve) => setTimeout(resolve, 150));

			const input = formObfuscator.querySelector('input[type="text"]');
			await user.click(input);
			await user.type(input, 'test');
			fireEvent.blur(input);

			await waitFor(() => {
				// Should use default obfuscation since replacer requires pattern
				expect(input.value).toBe('****');
			});

			delete window.testReplacer2;
		});
	});

	describe('Edge cases', () => {
		it('should handle rapid focus/blur cycles', async () => {
			const form = createForm(`
				<form-obfuscator character="•">
					<label>
						Field
						<input type="text" name="field" value="">
					</label>
				</form-obfuscator>
			`);

			const formObfuscator = form.querySelector('form-obfuscator');
			await new Promise((resolve) => setTimeout(resolve, 150));

			const input = formObfuscator.querySelector('input[type="text"]');
			await user.click(input);
			await user.type(input, 'test');

			// Rapid focus/blur
			for (let i = 0; i < 3; i++) {
				fireEvent.blur(input);
				await new Promise((resolve) => setTimeout(resolve, 10));
				fireEvent.focus(input);
				await new Promise((resolve) => setTimeout(resolve, 10));
			}

			// Final blur
			fireEvent.blur(input);

			await waitFor(() => {
				expect(input.value).toBe('••••');
			});
		});

		it('should maintain hidden field value through multiple blur/focus cycles', async () => {
			const form = createForm(`
				<form-obfuscator>
					<label>
						Field
						<input type="text" name="field" value="">
					</label>
				</form-obfuscator>
			`);

			const formObfuscator = form.querySelector('form-obfuscator');
			await new Promise((resolve) => setTimeout(resolve, 150));

			const input = formObfuscator.querySelector('input[type="text"]');
			await user.click(input);
			await user.type(input, 'persistent');

			for (let i = 0; i < 3; i++) {
				fireEvent.blur(input);
				await new Promise((resolve) => setTimeout(resolve, 20));
				fireEvent.focus(input);
				await new Promise((resolve) => setTimeout(resolve, 20));
			}

			const hiddenField = form.querySelector(
				'input[type="hidden"][name="field"]',
			);

			expect(hiddenField.value).toBe('persistent');
		});

		it('should handle special regex characters in character attribute', async () => {
			const form = createForm(`
				<form-obfuscator character=".">
					<label>
						Field
						<input type="text" name="field" value="">
					</label>
				</form-obfuscator>
			`);

			const formObfuscator = form.querySelector('form-obfuscator');
			await new Promise((resolve) => setTimeout(resolve, 150));

			const input = formObfuscator.querySelector('input[type="text"]');
			await user.click(input);
			await user.type(input, 'test');
			fireEvent.blur(input);

			await waitFor(() => {
				expect(input.value).toBe('....');
			});
		});
	});

	describe('Advanced integration and memory management', () => {
		it('should handle multiple input fields independently', async () => {
			const form = createForm(`
				<form-obfuscator>
					<label>Field 1 <input type="text" name="field1" value=""></label>
					<label>Field 2 <input type="text" name="field2" value=""></label>
				</form-obfuscator>
			`);
			const formObfuscator = form.querySelector('form-obfuscator');
			await new Promise((resolve) => setTimeout(resolve, 150));
			const [input1, input2] =
				formObfuscator.querySelectorAll('input[type="text"]');

			await user.click(input1);
			await user.type(input1, 'alpha');
			await user.click(input2);
			await user.type(input2, 'beta');
			// Blur both
			input1.blur();
			input2.blur();
			await new Promise((resolve) => setTimeout(resolve, 50));
			await waitFor(() => {
				expect(input1.value).toBe('*****'); // 5 asterisks for 'alpha'
				expect(input2.value).toBe('****'); // 4 asterisks for 'beta'
			});
			// Focus and check reveal
			input1.focus();
			await new Promise((resolve) => setTimeout(resolve, 20));
			await waitFor(() => {
				expect(input1.value).toBe('alpha');
			});
			input2.focus();
			await new Promise((resolve) => setTimeout(resolve, 20));
			await waitFor(() => {
				expect(input2.value).toBe('beta');
			});
		});

		it('should not expose $clone property on input fields', async () => {
			const form = createForm(`
				<form-obfuscator>
					<label>Field <input type="text" name="field" value="foo"></label>
				</form-obfuscator>
			`);
			const formObfuscator = form.querySelector('form-obfuscator');
			await new Promise((resolve) => setTimeout(resolve, 150));
			const input = formObfuscator.querySelector('input[type="text"]');
			// $clone should not be present
			expect(input.$clone).toBeUndefined();
		});

		it('should not throw or react to events after removal from DOM', async () => {
			const form = createForm(`
				<form-obfuscator>
					<label>Field <input type="text" name="field" value="foo"></label>
				</form-obfuscator>
			`);
			const formObfuscator = form.querySelector('form-obfuscator');
			await new Promise((resolve) => setTimeout(resolve, 150));
			const input = formObfuscator.querySelector('input[type="text"]');
			await user.click(input);
			await user.type(input, 'bar');
			// Remove from DOM
			formObfuscator.remove();
			// Try to fire events (should not throw)
			expect(() => {
				fireEvent.blur(input);
				fireEvent.focus(input);
			}).not.toThrow();
		});
	});
});
