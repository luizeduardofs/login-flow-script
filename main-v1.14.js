document.addEventListener("DOMContentLoaded", () => {
	const btnLogout = document.getElementById("btn-logout");
	const btnLogin = document.getElementById("btn-login");
	const currentScript =
		document.currentScript || document.querySelector("script[site-id]");
	const siteId = currentScript?.getAttribute("site-id");

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
		}
	}

	prepareLoginForm();

	if (btnLogin) {
		const parentForm = btnLogin.closest("form");

		if (parentForm) {
			const hasLoginFields =
				parentForm.querySelector("[login-flow-email]") ||
				parentForm.querySelector("[login-flow-password]");

			if (hasLoginFields) {
				parentForm.addEventListener(
					"submit",
					(e) => {
						e.preventDefault();
						e.stopPropagation();
						e.stopImmediatePropagation();
						return false;
					},
					true,
				);
			}
		}

		btnLogin.addEventListener("click", async (e) => {
			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();

			const emailInput = document.querySelector("[login-flow-email]");
			const passwordInput = document.querySelector("[login-flow-password]");

			if (!emailInput || !passwordInput) {
				console.error("Login fields not found");
				alert("Error: Login fields not found");
				return;
			}

			const email = emailInput.value.trim();
			const password = passwordInput.value;

			if (!email || !password) {
				alert("Please fill in all fields");
				return;
			}

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

				if (response.ok && result.token) {
					sessionStorage.setItem("token", result.token);

					const urlParams = new URLSearchParams(window.location.search);
					const redirectTo = urlParams.get("redirect");

					if (redirectTo && redirectTo.startsWith("/")) {
						window.location.href = `${window.location.origin}${redirectTo}`;
					} else {
						window.location.href = `${window.location.origin}/`;
					}
				} else {
					console.error("Invalid credentials");
					alert("Invalid credentials");
					btnLogin.textContent = originalText;
					btnLogin.disabled = false;
				}
			} catch (error) {
				console.error("Error connecting to the authentication server:", error);
				alert("Error connecting to the authentication server");

				btnLogin.textContent = originalText;
				btnLogin.disabled = false;
			}
		});
	}

	if (btnLogout) {
		btnLogout.addEventListener("click", () => {
			sessionStorage.removeItem("token");
			window.location.href = "/";
		});
	}
});

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

		if (!siteId) {
			console.error("Site ID not found");
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
					body: JSON.stringify({
						url: path,
						token: token || null,
						site_id: siteId,
					}),
				},
			);

			const result = await response.json();

			if (result.authorized === false) {
				sessionStorage.removeItem("token");
				window.location.href = `/login?redirect=${encodeURIComponent(path)}`;
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

(function initSecurityFixes() {
	const originalAlert = window.alert;
	window.alert = function (message) {
		if (
			typeof message === "string" &&
			(message.includes("Passwords cannot be submitted") ||
				(message.includes("password") && message.includes("submit")))
		) {
			return;
		}
		return originalAlert.apply(window, arguments);
	};

	if (
		window.location.protocol === "http:" &&
		window.location.hostname !== "localhost"
	) {
		console.error("Site on HTTP. To maximize security use HTTPS.");
	}
})();
