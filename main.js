document.addEventListener("DOMContentLoaded", () => {
  const btnLogout = document.getElementById("btn-logout");
  const btnLogin = document.getElementById("btn-login");

  btnLogin.addEventListener("click", async (e) => {
    e.preventDefault();

    const emailInput = document.querySelector("[lf-login-email]");
    const passwordInput = document.querySelector("[lf-login-password]");

    const payload = {
      email: emailInput ? emailInput.value : "",
      password: passwordInput ? passwordInput.value : "",
    };
    try {
      const response = await fetch("http://localhost:3000/member-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok && result.token) {
        sessionStorage.setItem("token", result.token);
        window.location.href = "/home";
      } else {
        window.location.href = "/login";
      }
    } catch (error) {
      console.error("Error connecting to the authentication server:", error);
    }
  });

  btnLogout.addEventListener("click", () => {
    sessionStorage.removeItem("token");
    window.location.href = "/login";
  });
});

(async function () {
  const currentScript = document.currentScript;
  const siteId = currentScript.getAttribute("site-id");

  if (!siteId) {
    console.error("Erro: Atributo site-id não encontrado na tag script.");
    return;
  }

  const payload = {
    url: window.location.pathname,
    token: sessionStorage.getItem("token"),
    site_id: siteId,
  };

  try {
    const response = await fetch("http://localhost:3000/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (result.authorized === false) {
      console.warn("Access denied. Redirecting...");
      //   window.location.href = result.redirect;
      window.location.href = "/login";
    } else {
      console.log("✅ Authorized access to the website:", siteId);
    }
  } catch (error) {
    console.error("Error connecting to the authentication server.:", error);
  }
})();
