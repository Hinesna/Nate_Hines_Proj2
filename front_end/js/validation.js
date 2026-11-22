// Constraint Validation API helpers.
// Convention: each field has a <span id="{input id}-error"> for its message.

export function showFieldError(input) {
  const span = document.getElementById(`${input.id}-error`);
  if (span) span.textContent = input.validationMessage;
  input.setAttribute("aria-invalid", input.validity.valid ? "false" : "true");
}

function clearFieldError(input) {
  const span = document.getElementById(`${input.id}-error`);
  if (span) span.textContent = "";
  input.setAttribute("aria-invalid", "false");
}

export function clearErrors(form) {
  for (const input of form.elements) {
    if (!input.willValidate) continue;
    input.setCustomValidity("");
    clearFieldError(input);
  }
}

// Show feedback as the user types or leaves a field. Typing also clears any
// message that came from the server.
export function attachLiveValidation(form) {
  for (const input of form.elements) {
    if (!input.willValidate) continue;
    const refresh = () => {
      input.setCustomValidity("");
      showFieldError(input);
    };
    input.addEventListener("input", refresh);
    input.addEventListener("change", refresh);
    input.addEventListener("blur", () => showFieldError(input));
  }
}

// Returns true when every field is valid; otherwise shows all messages and
// focuses the first invalid field.
export function validateForm(form) {
  let firstInvalid = null;
  for (const input of form.elements) {
    if (!input.willValidate) continue;
    if (!input.checkValidity() && !firstInvalid) firstInvalid = input;
    showFieldError(input);
  }
  if (firstInvalid) firstInvalid.focus();
  return !firstInvalid;
}

// errors: { fieldName: "message" } from the API. Fields are matched by name.
export function applyServerErrors(form, errors) {
  let first = null;
  for (const [field, message] of Object.entries(errors)) {
    const input = form.elements[field];
    if (!input || !input.setCustomValidity) continue;
    input.setCustomValidity(String(message));
    showFieldError(input);
    if (!first) first = input;
  }
  if (first) first.focus();
  return Boolean(first);
}
