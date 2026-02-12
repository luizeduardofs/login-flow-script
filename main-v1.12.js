document.addEventListener("DOMContentLoaded", () => {
	const btnLogout = document.getElementById("btn-logout");
	const btnLogin = document.getElementById("btn-login");
	const currentScript =
		document.currentScript || document.querySelector("script[site-id]");
	const siteId = currentScript?.getAttribute("site-id");

	// ========================================================================
	// Prepara o formulário de login com atributos de segurança
	// ========================================================================
	function prepareLoginForm() {
		const emailInput = document.querySelector("[login-flow-email]");
		const passwordInput = document.querySelector("[login-flow-password]");

		if (!emailInput && !passwordInput) {
			return;
		}

		const loginForm =
			emailInput?.closest("form") || passwordInput?.closest("form");

		if (loginForm) {
			loginForm.setAttribute("autocomplete", "on");
			loginForm.setAttribute("data-login-flow-form", "true");

			if (passwordInput) {
				passwordInput.setAttribute("autocomplete", "current-password");
				passwordInput.setAttribute("type", "password");
			}

			if (emailInput) {
				emailInput.setAttribute("autocomplete", "email");
				emailInput.setAttribute("type", "email");
			}

			console.info("✅ Login form ready");
		}
	}

	prepareLoginForm();

	// ========================================================================
	// MODIFICADO: Intercepta o formulário ANTES de clonar o botão
	// ========================================================================
	if (btnLogin) {
		const parentForm = btnLogin.closest("form");

		// CRÍTICO: Intercepta o form PRIMEIRO
		if (parentForm) {
			const hasLoginFields =
				parentForm.querySelector("[login-flow-email]") ||
				parentForm.querySelector("[login-flow-password]");

			if (hasLoginFields) {
				// Previne submit do formulário
				parentForm.addEventListener(
					"submit",
					(e) => {
						e.preventDefault();
						e.stopPropagation();
						e.stopImmediatePropagation();
						console.info("🛑 Form submission prevented");
						return false;
					},
					true,
				);

				console.info("✅ Form submission intercepted");
			}
		}

		// AGORA sim adiciona o listener no botão
		btnLogin.addEventListener("click", async (e) => {
			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();

			console.info("🔵 Login button clicked");

			const emailInput = document.querySelector("[login-flow-email]");
			const passwordInput = document.querySelector("[login-flow-password]");

			if (!emailInput || !passwordInput) {
				console.error("❌ Login fields not found");
				alert("Error: Login fields not found");
				return;
			}

			const email = emailInput.value.trim();
			const password = passwordInput.value;

			if (!email || !password) {
				console.warn("⚠️ Empty fields detected");
				alert("Please fill in all fields");
				return;
			}

			console.info("📤 Sending login request...");

			const payload = {
				email: email,
				password: password,
				siteId: siteId,
			};

			const originalText = btnLogin.textContent;
			btnLogin.textContent = "Loading...";
			btnLogin.disabled = true;

			try {
				const response = await fetch(
					"https://login-flow-backend.onrender.com/member-login",
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Accept: "application/json",
						},
						credentials: "include",
						body: JSON.stringify(payload),
					},
				);

				const result = await response.json();

				console.info("📥 Server response:", result);

				if (response.ok && result.token) {
					console.info("✅ Login successful, redirecting...");
					sessionStorage.setItem("token", result.token);
					window.location.href = `${window.location.origin}/`;
				} else {
					console.error("❌ Invalid credentials");
					alert("Invalid credentials");
					btnLogin.textContent = originalText;
					btnLogin.disabled = false;
				}
			} catch (error) {
				console.error(
					"❌ Error connecting to the authentication server:",
					error,
				);
				alert("Error connecting to the authentication server");

				btnLogin.textContent = originalText;
				btnLogin.disabled = false;
			}
		});
	}

	// ========================================================================
	// Logout handler
	// ========================================================================
	if (btnLogout) {
		btnLogout.addEventListener("click", () => {
			sessionStorage.removeItem("token");
			window.location.href = "/login";
		});
	}
});

// ============================================================================
// Verificação de acesso
// ============================================================================
(() => {
	const currentScript =
		document.currentScript || document.querySelector("script[site-id]");
	const siteId = currentScript?.getAttribute("site-id");

	let checkTimeout = null;

	async function checkAccess() {
		if (checkTimeout) {
			clearTimeout(checkTimeout);
		}

		const path = window.location.pathname;
		const token = sessionStorage.getItem("token");

		const loginPaths = ["/login", "/login-page", "/login/", "/login-page/"];
		const isLoginPage = loginPaths.some(
			(p) => path === p || path.startsWith(p),
		);

		if (isLoginPage) {
			if (token) {
				window.location.href = "/";
			}
			return;
		}

		if (!token || !siteId) {
			window.location.href = "/login";
			return;
		}

		try {
			const response = await fetch(
				"https://login-flow-backend.onrender.com/verify",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
					},
					credentials: "include",
					body: JSON.stringify({ url: path, token, site_id: siteId }),
				},
			);

			const result = await response.json();

			if (result.authorized === false) {
				sessionStorage.removeItem("token");
				window.location.href = "/login";
			}
		} catch (error) {
			console.error("Auth Error:", error);
		}
	}

	function debouncedCheckAccess() {
		if (checkTimeout) {
			clearTimeout(checkTimeout);
		}
		checkTimeout = setTimeout(checkAccess, 100);
	}

	checkAccess();
	window.addEventListener("popstate", debouncedCheckAccess);

	let oldHref = document.location.href;
	const observer = new MutationObserver(() => {
		if (oldHref !== document.location.href) {
			oldHref = document.location.href;
			debouncedCheckAccess();
		}
	});
	observer.observe(document.body, { childList: true, subtree: true });
})();

// ============================================================================
// Proteções de segurança
// ============================================================================
(function initSecurityFixes() {
	const originalAlert = window.alert;
	window.alert = function (message) {
		if (
			typeof message === "string" &&
			(message.includes("Passwords cannot be submitted") ||
				(message.includes("password") && message.includes("submit")))
		) {
			console.warn("⚠️ Browser password alert blocked:", message);
			return;
		}
		// biome-ignore lint/complexity/noArguments: <explanation>
		return originalAlert.apply(window, arguments);
	};

	if (
		window.location.protocol === "http:" &&
		window.location.hostname !== "localhost"
	) {
		console.warn("⚠️ Site on HTTP. To maximize security use HTTPS.");
	}
})();
