// Email confirmation handler
document.addEventListener("DOMContentLoaded", async () => {
  await handleEmailConfirmation()
})

async function handleEmailConfirmation() {
  try {
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search)
    const tokenHash = urlParams.get("token_hash")
    const type = urlParams.get("type")

    console.log("Confirmation parameters:", { tokenHash, type })

    if (!tokenHash || type !== "email") {
      showError("Invalid confirmation link. Please check your email and try again.")
      return
    }

    // Wait for services to be available
    await waitForServices()

    // Use DatabaseService to confirm email
    const { data, error } = await window.DatabaseService.confirmEmail(tokenHash, type)

    if (error) {
      console.error("Confirmation error:", error)
      showError(error)
      return
    }

    console.log("Email confirmed successfully:", data)
    showSuccess()
  } catch (error) {
    console.error("Email confirmation error:", error)
    showError("An unexpected error occurred. Please try again.")
  }
}

// Wait for services to be available
async function waitForServices() {
  return new Promise((resolve) => {
    const checkServices = () => {
      if (window.DatabaseService) {
        resolve()
      } else {
        setTimeout(checkServices, 100)
      }
    }
    checkServices()
  })
}

function showSuccess() {
  document.getElementById("loading-state").style.display = "none"
  document.getElementById("error-state").style.display = "none"
  document.getElementById("success-state").style.display = "block"
}

function showError(message) {
  document.getElementById("loading-state").style.display = "none"
  document.getElementById("success-state").style.display = "none"
  document.getElementById("error-state").style.display = "block"
  document.getElementById("error-message").textContent = message
}

function goToLogin() {
  window.location.href = "/html/login.html"
}

// Make function globally available
window.goToLogin = goToLogin
