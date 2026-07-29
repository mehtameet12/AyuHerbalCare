/**
 * Booking form validation.
 *
 * The form carries `novalidate` so the messaging is ours and consistent across
 * browsers, but every control still has its real `required` / `type` attributes
 * — that is what assistive tech reads, and it is what keeps the form usable if
 * this script never runs.
 *
 * NOTE: there is no backend. Submitting shows the confirmation panel and
 * nothing is sent. Point the <form> at an endpoint (`action` + `method`) or
 * POST `new FormData(form)` from `onValid()` to make it live; every control
 * already has a `name`.
 */

/** @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} control */
function isValid(control) {
  const value = control.value.trim();
  if (!value) return false;
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
  if (!form) return;

  const controls = Array.from(form.querySelectorAll('[required]'));

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

  form.addEventListener('submit', (event) => {
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

    form.hidden = true;
    if (success) {
      success.classList.add('is-shown');
      // The panel is role="status"; focusing it also scrolls it into view and
      // gives sighted keyboard users a sane place to continue from.
      success.focus();
    }
  });
}
