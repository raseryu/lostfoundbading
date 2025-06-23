// Initialize the page
document.addEventListener("DOMContentLoaded", () => {
  const currentPage = getCurrentPage()
  console.log("Current page:", currentPage)

  if (currentPage === "login") {
    setupLoginPage()
  } else if (currentPage === "signup") {
    setupSignupPage()
  } else if (currentPage === "forgot-password") {
    setupForgotPasswordPage()
  }
})

function getCurrentPage() {
  const path = window.location.pathname
  if (path.includes("signup")) return "signup"
  if (path.includes("forgot-password")) return "forgot-password"
  return "login"
}

// Login Page Setup
function setupLoginPage() {
  const loginForm = document.getElementById("login-form")
  console.log("Setting up login page, form found:", !!loginForm)

  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin)
  }
}

async function handleLogin(event) {
  event.preventDefault()
  console.log("Login form submitted")

  const email = document.getElementById("email").value
  const password = document.getElementById("password").value
  const loginButton = document.getElementById("login-button")
  const loginText = document.getElementById("login-text")
  const loginLoading = document.getElementById("login-loading")

  console.log("Login attempt for:", email)

  // Clear previous errors
  hideError()

  // Validate inputs
  if (!email || !password) {
    showError("Please fill in all fields")
    return
  }

  // Show loading state
  if (loginButton) {
    loginButton.disabled = true
  }
  if (loginText) {
    loginText.style.display = "none"
  }
  if (loginLoading) {
    loginLoading.style.display = "inline"
  }

  try {
    console.log("Attempting login with DatabaseService...")

    // Check if DatabaseService is available
    if (!window.DatabaseService) {
      throw new Error("DatabaseService not available")
    }

    const { user, error } = await window.DatabaseService.signIn(email, password)

    if (error) {
      console.error("Login error:", error)
      if (error.includes("email address")) {
        showError("Please confirm your email address before logging in. Check your inbox for a confirmation link.")
      } else if (error.includes("Invalid login credentials")) {
        showError("Invalid email or password. Please try again.")
      } else {
        showError(error)
      }
    } else if (user) {
      console.log("Login successful:", user)
      // Store user session
      localStorage.setItem("currentUser", JSON.stringify(user))

      // Redirect based on role
      if (user.role === "admin") {
        window.location.href = "/html/admin-dashboard.html"
      } else {
        window.location.href = "/html/user-home.html"
      }
    }
  } catch (error) {
    console.error("Login exception:", error)
    showError("Login failed: " + error.message)
  } finally {
    // Reset button state
    if (loginButton) {
      loginButton.disabled = false
    }
    if (loginText) {
      loginText.style.display = "inline"
    }
    if (loginLoading) {
      loginLoading.style.display = "none"
    }
  }
}

// Signup Page Setup
function setupSignupPage() {
  const signupForm = document.getElementById("signup-form")
  console.log("Setting up signup page, form found:", !!signupForm)

  if (signupForm) {
    signupForm.addEventListener("submit", handleSignup)
  }
}

async function handleSignup(event) {
  event.preventDefault()
  console.log("Signup form submitted")

  const name = document.getElementById("name").value
  const email = document.getElementById("email").value
  const password = document.getElementById("password").value
  const confirmPassword = document.getElementById("confirm-password").value
  const signupButton = document.getElementById("signup-button")
  const signupText = document.getElementById("signup-text")
  const signupLoading = document.getElementById("signup-loading")

  console.log("Signup attempt for:", email)

  // Clear previous messages
  hideError()
  hideSuccess()

  // Validate inputs
  if (!name || !email || !password || !confirmPassword) {
    showError("Please fill in all fields")
    return
  }

  if (password !== confirmPassword) {
    showError("Passwords do not match")
    return
  }

  if (password.length < 6) {
    showError("Password must be at least 6 characters long")
    return
  }

  // Show loading state
  if (signupButton) {
    signupButton.disabled = true
  }
  if (signupText) {
    signupText.style.display = "none"
  }
  if (signupLoading) {
    signupLoading.style.display = "inline"
  }

  try {
    console.log("Attempting signup with DatabaseService...")

    // Check if DatabaseService is available
    if (!window.DatabaseService) {
      throw new Error("DatabaseService not available")
    }

    const { user, error, needsConfirmation } = await window.DatabaseService.signUp(email, password, name)

    if (error) {
      console.error("Signup error:", error)
      showError(error)
    } else {
      console.log("Signup successful, needs confirmation:", needsConfirmation)
      // Show success message for email confirmation
      showSuccess(
        "Account created successfully! Please check your email and click the confirmation link before logging in.",
      )

      // Don't redirect immediately - user needs to confirm email first
      setTimeout(() => {
        window.location.href = "/html/login.html"
      }, 5000)
    }
  } catch (error) {
    console.error("Signup exception:", error)
    showError("Signup failed: " + error.message)
  } finally {
    // Reset button state
    if (signupButton) {
      signupButton.disabled = false
    }
    if (signupText) {
      signupText.style.display = "inline"
    }
    if (signupLoading) {
      signupLoading.style.display = "none"
    }
  }
}

// Forgot Password Page Setup
function setupForgotPasswordPage() {
  const forgotForm = document.getElementById("forgot-form")
  console.log("Setting up forgot password page, form found:", !!forgotForm)

  if (forgotForm) {
    forgotForm.addEventListener("submit", handleForgotPassword)
  }
}

async function handleForgotPassword(event) {
  event.preventDefault()
  console.log("Forgot password form submitted")

  const email = document.getElementById("email").value
  const forgotButton = document.getElementById("forgot-button")
  const forgotText = document.getElementById("forgot-text")
  const forgotLoading = document.getElementById("forgot-loading")

  // Clear previous errors
  hideError()

  // Validate email
  if (!email) {
    showError("Please enter your email address")
    return
  }

  // Show loading state
  if (forgotButton) {
    forgotButton.disabled = true
  }
  if (forgotText) {
    forgotText.style.display = "none"
  }
  if (forgotLoading) {
    forgotLoading.style.display = "inline"
  }

  try {
    // Check if supabase is available
    if (!window.supabase) {
      throw new Error("Supabase not available")
    }

    const { error } = await window.supabase
      .createClient(
        "https://yxvonbclhozzvijxdzhc.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4dm9uYmNsaG96enZpanhkemhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwODIyNTUsImV4cCI6MjA2NTY1ODI1NX0.Ii1uo5fAaF4RIvYlhrFqLPs5hcQER56uAbjXLtjTFDc",
      )
      .auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password.html`,
      })

    if (error) {
      showError(error.message)

      // Reset button state
      if (forgotButton) {
        forgotButton.disabled = false
      }
      if (forgotText) {
        forgotText.style.display = "inline"
      }
      if (forgotLoading) {
        forgotLoading.style.display = "none"
      }
    } else {
      // Show success state
      document.getElementById("forgot-form-container").style.display = "none"
      document.getElementById("success-container").style.display = "block"
      document.getElementById("reset-email").textContent = email
    }
  } catch (error) {
    console.error("Forgot password error:", error)
    showError("Failed to send reset email. Please try again.")

    // Reset button state
    if (forgotButton) {
      forgotButton.disabled = false
    }
    if (forgotText) {
      forgotText.style.display = "inline"
    }
    if (forgotLoading) {
      forgotLoading.style.display = "none"
    }
  }
}

// Demo account functions
function fillDemoAdmin() {
  document.getElementById("email").value = "admin@mymail.mapua.edu.ph"
  document.getElementById("password").value = "admin123"
}

function fillDemoUser() {
  document.getElementById("email").value = "user@mymail.mapua.edu.ph"
  document.getElementById("password").value = "user123"
}

// Make demo functions globally available
window.fillDemoAdmin = fillDemoAdmin
window.fillDemoUser = fillDemoUser

// Utility functions
function showError(message) {
  const errorElement = document.getElementById("error-message")
  if (errorElement) {
    errorElement.textContent = message
    errorElement.style.display = "block"
  }
  console.error("Error:", message)
}

function hideError() {
  const errorElement = document.getElementById("error-message")
  if (errorElement) {
    errorElement.style.display = "none"
  }
}

function showSuccess(message) {
  const successElement = document.getElementById("success-message")
  if (successElement) {
    successElement.textContent = message
    successElement.style.display = "block"
  }
  console.log("Success:", message)
}

function hideSuccess() {
  const successElement = document.getElementById("success-message")
  if (successElement) {
    successElement.style.display = "none"
  }
}

// Check if user is already logged in
async function checkAuthStatus() {
  try {
    if (!window.DatabaseService) {
      console.log("DatabaseService not available yet")
      return
    }

    const { user } = await window.DatabaseService.getCurrentUser()
    if (user) {
      console.log("User already logged in:", user)
      if (user.role === "admin") {
        window.location.href = "/html/admin-dashboard.html"
      } else {
        window.location.href = "/html/user-home.html"
      }
    }
  } catch (error) {
    console.log("No user logged in or error checking auth:", error)
    // User not logged in, continue with current page
  }
}

// Call on page load for login and signup pages with delay to ensure DatabaseService is loaded
if (getCurrentPage() === "login" || getCurrentPage() === "signup") {
  setTimeout(checkAuthStatus, 1000)
}
