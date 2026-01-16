document.addEventListener("DOMContentLoaded", () => {
  const btnLogout = document.getElementById("btn-logout");
  const btnLogin = document.getElementById("btn-login");
  const siteId = currentScript?.getAttribute("site-id");

  if (btnLogin) {
    btnLogin.addEventListener("click", async (e) => {
      e.preventDefault();

      const emailInput = document.querySelector("[lf-login-email]");
      const passwordInput = document.querySelector("[lf-login-password]");

      const payload = {
        email: emailInput ? emailInput.value : "",
        password: passwordInput ? passwordInput.value : "",
        siteId: siteId ? siteId : "",
      };

      try {
        const response = await fetch("http://localhost:3333/member-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (response.ok && result.token) {
          sessionStorage.setItem("token", result.token);
          window.location.replace(window.location.origin + "/");
        } else {
          alert(
            "Erro no login: " + (result.message || "Credenciais inválidas")
          );
        }
      } catch (error) {
        console.error("Error connecting to the authentication server:", error);
      }
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      sessionStorage.removeItem("token");
      window.location.href = "/login";
    });
  }
});

(function () {
  const currentScript = document.currentScript;
  const siteId = currentScript?.getAttribute("site-id");

  async function checkAccess() {
    const path = window.location.pathname;
    const token = sessionStorage.getItem("token");

    if (path === "/login" || path === "/login-page") {
      if (token) window.location.href = "/";
      return;
    }

    if (!token || !siteId) {
      window.location.href = "/login";
      return;
    }

    try {
      const response = await fetch("http://localhost:3333/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: path, token, site_id: siteId }),
      });

      const result = await response.json();

      if (result.authorized === false) {
        sessionStorage.removeItem("token");
        window.location.href = "/login";
      }
    } catch (error) {
      console.error("Auth Error:", error);
    }
  }

  checkAccess();

  window.addEventListener("popstate", checkAccess);

  let oldHref = document.location.href;
  const observer = new MutationObserver(() => {
    if (oldHref !== document.location.href) {
      oldHref = document.location.href;
      checkAccess();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
