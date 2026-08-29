/**
 * Booking form validation.
 *
 * The form carries `novalidate` so the messaging is ours and consistent across
 * browsers, but every control still has its real `required` / `type` attributes
 * — that is what assistive tech reads, and it is what keeps the form usable if
 * this script never runs.
 *
 * On submit the form is POSTed to its `action` (Formspree) with fetch, so the
 * visitor stays on the page and gets the confirmation panel instead of
 * Formspree's own thank-you screen.
 */

/** @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} control */
function isValid(control) {
  const value = control.value.trim();
  // Empty is fine on an optional control — only `required` makes blank a failure.
  if (!value) return !control.required;
  // `validity.typeMismatch` is the browser's own email/tel parser — more
  // correct than any regex worth writing here.
  return !control.validity.typeMismatch;
}

/**
 * @param {HTMLElement} field
 * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} control
 * @param {boolean} invalid
 */
function setFieldState(field, control, invalid) {
  field.classList.toggle('is-invalid', invalid);
  control.setAttribute('aria-invalid', String(invalid));
}

export function initForm() {
  const form = document.getElementById('bookingForm');
  const success = document.getElementById('formSuccess');
  const error = document.getElementById('formError');
  const button = form?.querySelector('button[type="submit"]');
  if (!form) return;

  // Optional email still gets checked for shape, just not for presence.
  const controls = Array.from(form.querySelectorAll('[required], input[type="email"]'));

  controls.forEach((control) => {
    const field = control.closest('.field');
    if (!field) return;

    // Clear the error as soon as the user fixes it, but never mark a field
    // invalid mid-typing — only on blur or submit.
    control.addEventListener('input', () => {
      if (field.classList.contains('is-invalid') && isValid(control)) {
        setFieldState(field, control, false);
      }
    });

    control.addEventListener('blur', () => {
      if (control.value.trim() !== '') setFieldState(field, control, !isValid(control));
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    let firstInvalid = null;

    controls.forEach((control) => {
      const field = control.closest('.field');
      if (!field) return;
      const invalid = !isValid(control);
      setFieldState(field, control, invalid);
      if (invalid && !firstInvalid) firstInvalid = control;
    });

    if (firstInvalid) {
      // Move focus to the first problem so a keyboard or screen-reader user is
      // taken straight to it instead of being told "nothing happened".
      firstInvalid.focus();
      return;
    }

    if (error) error.hidden = true;
    if (button) {
      button.disabled = true;
      button.dataset.label = button.textContent;
      button.textContent = 'Sending…';
    }

    let sent = false;
    try {
      // `Accept: application/json` keeps Formspree from answering with a
      // redirect to its own thank-you page.
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });
      sent = response.ok;
    } catch {
      // Offline or blocked — falls through to the error message below.
    }

    if (!sent) {
      // Leave the filled-in form alone so nothing the visitor typed is lost.
      if (button) {
        button.disabled = false;
        button.textContent = button.dataset.label;
      }
      if (error) {
        error.hidden = false;
        error.focus();
      }
      return;
    }

    form.hidden = true;
    if (success) {
      success.classList.add('is-shown');
      // The panel is role="status"; focusing it also scrolls it into view and
      // gives sighted keyboard users a sane place to continue from.
      success.focus();
    }
  });
}
