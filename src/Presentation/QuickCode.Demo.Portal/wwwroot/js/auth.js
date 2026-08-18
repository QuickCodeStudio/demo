(function () {
  "use strict";

  var TOAST_STORAGE_KEY = "qc-auth-toast";

  function busyLabelFor(original) {
    if (/sign in/i.test(original)) return "Signing in…";
    if (/create/i.test(original)) return "Creating account…";
    if (/send/i.test(original)) return "Sending…";
    if (/update/i.test(original)) return "Updating…";
    if (/resend/i.test(original)) return "Sending…";
    return "Please wait…";
  }

  function initPasswordToggles(root) {
    root.querySelectorAll("[data-auth-password-toggle]").forEach(function (button) {
      button.addEventListener("click", function () {
        var targetId = button.getAttribute("aria-controls");
        var input = targetId ? document.getElementById(targetId) : null;
        if (!input) {
          var wrap = button.closest(".auth-password");
          input = wrap ? wrap.querySelector("input") : null;
        }
        if (!input) return;

        var show = input.type === "password";
        input.type = show ? "text" : "password";
        button.setAttribute("aria-pressed", show ? "true" : "false");
        button.setAttribute("aria-label", show ? "Hide password" : "Show password");

        var icon = button.querySelector("i");
        if (icon) {
          icon.classList.toggle("fa-eye", !show);
          icon.classList.toggle("fa-eye-slash", show);
        }
      });
    });
  }

  function antiforgeryToken(form) {
    var input = form.querySelector('input[name="__RequestVerificationToken"]');
    return input ? input.value : "";
  }

  function ensureAlert(form) {
    var alertEl = form.querySelector("[data-auth-alert]");
    if (alertEl) {
      return alertEl;
    }
    alertEl = document.createElement("div");
    alertEl.className = "auth-alert";
    alertEl.setAttribute("data-auth-alert", "");
    alertEl.setAttribute("hidden", "");
    alertEl.setAttribute("role", "alert");
    form.appendChild(alertEl);
    return alertEl;
  }

  function setAlert(form, message, type) {
    var alertEl = ensureAlert(form);
    alertEl.classList.remove("auth-alert--error", "auth-alert--success");
    if (!message) {
      alertEl.textContent = "";
      alertEl.setAttribute("hidden", "");
      return;
    }
    alertEl.textContent = message;
    alertEl.classList.add(type === "success" ? "auth-alert--success" : "auth-alert--error");
    alertEl.removeAttribute("hidden");
  }

  function applyFieldErrors(form, fieldErrors) {
    form.querySelectorAll("[data-valmsg-for]").forEach(function (span) {
      var name = span.getAttribute("data-valmsg-for");
      var message = fieldErrors && name ? fieldErrors[name] : null;
      span.textContent = message || "";
      span.classList.toggle("field-validation-error", !!message);
      span.classList.toggle("field-validation-valid", !message);
    });
  }

  function showResend(form, visible) {
    var btn = form.querySelector("[data-auth-resend]");
    if (!btn) {
      return;
    }
    if (visible) {
      btn.removeAttribute("hidden");
    } else {
      btn.setAttribute("hidden", "");
    }
  }

  function setButtonBusy(btn, busy, original) {
    if (!btn) {
      return;
    }
    if (busy) {
      btn.dataset.authOriginalHtml = original;
      btn.classList.add("is-busy");
      btn.setAttribute("aria-busy", "true");
      btn.innerHTML =
        '<span class="auth-btn__spinner" aria-hidden="true"></span>' +
        "<span>" +
        busyLabelFor(original) +
        "</span>";
      window.setTimeout(function () {
        btn.disabled = true;
      }, 0);
      return;
    }

    btn.classList.remove("is-busy");
    btn.removeAttribute("aria-busy");
    btn.disabled = false;
    if (btn.dataset.authOriginalHtml) {
      btn.innerHTML = btn.dataset.authOriginalHtml;
      delete btn.dataset.authOriginalHtml;
    }
  }

  function getToastEl() {
    return document.getElementById("authToast");
  }

  function hideAuthToast() {
    var toast = getToastEl();
    if (!toast) {
      return;
    }
    toast.classList.remove("is-visible");
    toast.setAttribute("hidden", "");
  }

  function showAuthToast(message, type) {
    var toast = getToastEl();
    var body = document.getElementById("authToastBody");
    var icon = document.getElementById("authToastIcon");
    if (!toast || !body || !message) {
      return;
    }

    var isError = (type || "success").toLowerCase() === "error";
    toast.classList.toggle("auth-toast--error", isError);
    toast.classList.toggle("auth-toast--success", !isError);
    if (icon) {
      icon.className = isError ? "fas fa-exclamation-circle" : "fas fa-check-circle";
    }
    body.textContent = message;
    toast.removeAttribute("hidden");
    toast.classList.add("is-visible");

    window.clearTimeout(toast._hideTimer);
    toast._hideTimer = window.setTimeout(hideAuthToast, 6500);
  }

  function queueToast(message, type) {
    if (!message || typeof sessionStorage === "undefined") {
      return;
    }
    try {
      sessionStorage.setItem(
        TOAST_STORAGE_KEY,
        JSON.stringify({ message: message, type: type || "success" })
      );
    } catch (e) {
      // private mode
    }
  }

  function consumeQueuedToast() {
    if (typeof sessionStorage === "undefined") {
      return;
    }
    try {
      var raw = sessionStorage.getItem(TOAST_STORAGE_KEY);
      if (!raw) {
        return;
      }
      sessionStorage.removeItem(TOAST_STORAGE_KEY);
      var payload = JSON.parse(raw);
      if (payload && payload.message) {
        showAuthToast(payload.message, payload.type || "success");
      }
    } catch (e) {
      sessionStorage.removeItem(TOAST_STORAGE_KEY);
    }
  }

  function initAuthToast() {
    var toast = getToastEl();
    if (toast) {
      var closeBtn = toast.querySelector("[data-auth-toast-close]");
      if (closeBtn) {
        closeBtn.addEventListener("click", hideAuthToast);
      }
      if (toast.classList.contains("is-visible")) {
        window.clearTimeout(toast._hideTimer);
        toast._hideTimer = window.setTimeout(hideAuthToast, 6500);
      }
    }
    consumeQueuedToast();
  }

  function initAuthFetch(root) {
    if (!window.fetch) {
      return;
    }

    root.querySelectorAll("form.auth-form").forEach(function (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();

        if (window.jQuery) {
          var $form = window.jQuery(form);
          if ($form.data("validator") && !$form.valid()) {
            return;
          }
        }

        var submitter = event.submitter || form.querySelector("button[type='submit']");
        var url =
          (submitter && submitter.getAttribute("formaction")) || form.getAttribute("action") || window.location.href;
        var original = (submitter && (submitter.textContent || "").trim()) || "Submit";
        setButtonBusy(submitter, true, original);
        setAlert(form, "");
        applyFieldErrors(form, null);

        var headers = {
          "X-Auth-Fetch": "1",
          Accept: "application/json"
        };
        var token = antiforgeryToken(form);
        if (token) {
          headers.RequestVerificationToken = token;
        }

        window
          .fetch(url, {
            method: "POST",
            body: new FormData(form),
            credentials: "same-origin",
            headers: headers
          })
          .then(function (response) {
            return response.text().then(function (text) {
              var data = {};
              try {
                data = text ? JSON.parse(text) : {};
              } catch (e) {
                data = { ok: false, error: "Something went wrong. Please try again." };
              }
              return { okHttp: response.ok, data: data };
            });
          })
          .then(function (result) {
            var data = result.data || {};
            if (data.fieldErrors) {
              applyFieldErrors(form, data.fieldErrors);
            }
            if (typeof data.showResendConfirmation === "boolean") {
              showResend(form, data.showResendConfirmation);
            }

            if (data.redirectUrl) {
              if (data.toast) {
                queueToast(data.toast, "success");
              }
              window.location.assign(data.redirectUrl);
              return;
            }

            setButtonBusy(submitter, false);
            if (data.ok) {
              setAlert(form, "");
              if (data.toast) {
                showAuthToast(data.toast, "success");
              }
              return;
            }

            setAlert(form, data.error || "Something went wrong. Please try again.", "error");
          })
          .catch(function () {
            setButtonBusy(submitter, false);
            setAlert(form, "Something went wrong. Please try again.", "error");
          });
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initPasswordToggles(document);
    initAuthToast();
    initAuthFetch(document);
  });
})();
