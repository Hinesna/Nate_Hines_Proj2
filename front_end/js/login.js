import { get, post } from "./api.js";
import { attachLiveValidation, validateForm, applyServerErrors } from "./validation.js";

const LIBRARY_PAGE = "library.html";

// Already logged in? Skip straight to the library.
const me = await get("/auth/me");
if (me.ok) location.href = LIBRARY_PAGE;

function setupForm(formId, endpoint, messageId) {
  const form = document.getElementById(formId);
  const message = document.getElementById(messageId);
  const button = form.querySelector("button[type=submit]");
  attachLiveValidation(form);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "";
    if (!validateForm(form)) return;

    button.disabled = true;
    try {
      const result = await post(endpoint, {
        username: form.elements.username.value,
        password: form.elements.password.value,
      });

      if (result.ok) {
        location.href = LIBRARY_PAGE;
        return;
      }
      const shown = result.data?.errors && applyServerErrors(form, result.data.errors);
      if (!shown) message.textContent = result.data?.error ?? "Something went wrong. Please try again.";
    } catch {
      message.textContent = "Could not reach the server. Please try again.";
    } finally {
      button.disabled = false;
    }
  });
}

setupForm("login-form", "/auth/login", "login-message");
setupForm("register-form", "/auth/register", "register-message");
