document.addEventListener("DOMContentLoaded", () => {
  const btnLogout = document.getElementById("btn-logout");
  const btnLogin = document.getElementById("btn-login");

  if (btnLogin) {
    btnLogin.addEventListener("click", async (e) => {
      e.preventDefault();

      const emailInput = document.querySelector("[lf-login-email]");
      const passwordInput = document.querySelector("[lf-login-password]");

      const payload = {
        email: emailInput ? emailInput.value : "",
        password: passwordInput ? passwordInput.value : "",
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
          // Redireciona para home após salvar o token
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

// --- LÓGICA DE PROTEÇÃO DE ROTAS ---
(function () {
  const currentScript = document.currentScript;
  const siteId = currentScript?.getAttribute("site-id");

  async function checkAccess() {
    const path = window.location.pathname;
    const token = sessionStorage.getItem("token");

    // 1. Se estiver na página de login, não bloqueia
    if (path === "/login" || path === "/login-page") {
      // Se já está logado e tentou entrar no login, manda pra home
      if (token) window.location.href = "/";
      return;
    }

    // 2. Se não tem token e não está no login, manda para o login
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

      // 3. Se o servidor disser que não está autorizado, tchau
      if (result.authorized === false) {
        sessionStorage.removeItem("token"); // Limpa token inválido se houver
        window.location.href = "/login";
      }
    } catch (error) {
      console.error("Auth Error:", error);
    }
  }

  // Executa ao carregar a página
  checkAccess();

  // Monitora mudanças de URL sem refresh (comum no Webflow)
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
