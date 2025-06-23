// Initialize the page
document.addEventListener("DOMContentLoaded", () => {
  console.log("Initializing reset password page...")
  setupResetPasswordPage()
})

function setupResetPasswordPage() {
  const resetForm = document.getElementById("reset-form")
  console.log("Setting up reset password page, form found:", !!resetForm)

  if (resetForm) {
    resetForm.addEventListener("submit", handleResetPassword)
  }
}

async function handleResetPassword(event) {
  event.preventDefault()
  console.log("Reset password form submitted")

  const password = document.getElementById("password").value
  const confirmPassword = document.getElementById("confirm-password").value
  const resetButton = document.getElementById("reset-button")
  const resetText = document.getElementById("reset-text")
  const resetLoading = document.getElementById("reset-loading")

  // Clear previous errors
  hideError()

  // Validate passwords
  if (!password || !confirmPassword) {
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
  if (resetButton) {
    resetButton.disabled = true
  }
  if (resetText) {
    resetText.style.display = "none"
  }
  if (resetLoading) {
    resetLoading.style.display = "inline"
  }

  try {
    console.log("Updating password...")

    // Wait for Supabase to be available
    await waitForSupabase()

    if (!window.supabase) {
      throw new Error("Supabase not available")
    }

    const supabaseClient = window.supabase.createClient(
      "https://yxvonbclhozzvijxdzhc.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4dm9uYmNsaG96enZpanhkemhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwODIyNTUsImV4cCI6MjA2NTY1ODI1NX0.Ii1uo5fAaF4RIvYlhrFqLPs5hcQER56uAbjXLtjTFDc",
    )

    const { error } = await supabaseClient.auth.updateUser({
      password: password,
    })

    if (error) {
      console.error("Password update error:", error)
      showError(error.message)

      // Reset button state
      resetButtonState()
    } else {
      console.log("Password updated successfully")
      // Show success state
      showSuccessState()
    }
  } catch (error) {
    console.error("Reset password error:", error)
    showError("Failed to update password. Please try again.")

    // Reset button state
    resetButtonState()
  }
}

function resetButtonState() {
  const resetButton = document.getElementById("reset-button")
  const resetText = document.getElementById("reset-text")
  const resetLoading = document.getElementById("reset-loading")

  if (resetButton) {
    resetButton.disabled = false
  }
  if (resetText) {
    resetText.style.display = "inline"
  }
  if (resetLoading) {
    resetLoading.style.display = "none"
  }
}

function showSuccessState() {
  document.getElementById("reset-form-container").style.display = "none"
  document.getElementById("success-container").style.display = "block"
}

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

function goToLogin() {
  window.location.href = "/html/login.html"
}

// Wait for Supabase to be available
async function waitForSupabase() {
  return new Promise((resolve) => {
    const checkSupabase = () => {
      if (window.supabase) {
        resolve()
      } else {
        setTimeout(checkSupabase, 100)
      }
    }
    checkSupabase()
  })
}

// Make function globally available
window.goToLogin = goToLogin
