// Initialize the page
document.addEventListener("DOMContentLoaded", () => {
  console.log("Initializing forgot password page...")
  setupForgotPasswordPage()
})

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
    console.log("Sending password reset email to:", email)

    // Wait for Supabase to be available
    await waitForSupabase()

    if (!window.supabase) {
      throw new Error("Supabase not available")
    }

    const supabaseClient = window.supabase.createClient(
      "https://yxvonbclhozzvijxdzhc.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4dm9uYmNsaG96enZpanhkemhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwODIyNTUsImV4cCI6MjA2NTY1ODI1NX0.Ii1uo5fAaF4RIvYlhrFqLPs5hcQER56uAbjXLtjTFDc",
    )

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/html/reset-password.html`,
    })

    if (error) {
      console.error("Password reset error:", error)
      showError(error.message)

      // Reset button state
      resetButtonState()
    } else {
      console.log("Password reset email sent successfully")
      // Show success state
      showSuccessState(email)
    }
  } catch (error) {
    console.error("Forgot password error:", error)
    showError("Failed to send reset email. Please try again.")

    // Reset button state
    resetButtonState()
  }
}

function resetButtonState() {
  const forgotButton = document.getElementById("forgot-button")
  const forgotText = document.getElementById("forgot-text")
  const forgotLoading = document.getElementById("forgot-loading")

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

function showSuccessState(email) {
  document.getElementById("forgot-form-container").style.display = "none"
  document.getElementById("success-container").style.display = "block"
  document.getElementById("reset-email").textContent = email
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
