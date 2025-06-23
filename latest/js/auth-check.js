// Authentication check for protected pages
async function checkAuthentication() {
  try {
    // Wait for DatabaseService to be available
    if (!window.DatabaseService) {
      console.log("DatabaseService not available, waiting...")
      return null
    }

    const { user } = await window.DatabaseService.getCurrentUser()

    if (!user) {
      // Redirect to login if not authenticated
      window.location.href = "/html/login.html"
      return null
    }

    // Check if user is admin for admin pages
    if (window.location.pathname.includes("admin-") && user.role !== "admin") {
      // Redirect non-admin users to user dashboard
      window.location.href = "/html/user-home.html"
      return null
    }

    // Check if admin is trying to access user pages
    if (window.location.pathname.includes("user-") && user.role === "admin") {
      // Redirect admin to admin dashboard
      window.location.href = "/html/admin-dashboard.html"
      return null
    }

    return user
  } catch (error) {
    console.error("Auth check error:", error)
    // Redirect to login on error
    window.location.href = "/html/login.html"
    return null
  }
}

// Fixed logout function
async function logout() {
  if (confirm("Are you sure you want to log out?")) {
    try {
      console.log("Logging out...")

      // Clear local storage first
      localStorage.removeItem("currentUser")
      localStorage.clear()

      // Sign out from Supabase if available
      if (window.DatabaseService) {
        const { error } = await window.DatabaseService.signOut()
        if (error) {
          console.error("Logout error:", error)
        }
      }

      // Force redirect to login
      window.location.href = "/html/login.html"
    } catch (error) {
      console.error("Logout error:", error)
      // Force logout even if there's an error
      localStorage.clear()
      window.location.href = "/html/login.html"
    }
  }
}

// Make logout function globally available
window.logout = logout

// Initialize authentication check on page load
document.addEventListener("DOMContentLoaded", async () => {
  // Only check auth for protected pages (not login/signup pages)
  if (
    !window.location.pathname.includes("login.html") &&
    !window.location.pathname.includes("signup.html") &&
    !window.location.pathname.includes("forgot-password.html") &&
    !window.location.pathname.includes("confirm-email.html")
  ) {
    // Wait for DatabaseService to be available
    let attempts = 0
    const maxAttempts = 50 // 5 seconds max wait

    const waitForService = async () => {
      if (window.DatabaseService || attempts >= maxAttempts) {
        const user = await checkAuthentication()
        if (user) {
          // Store current user globally
          window.currentUser = user

          // Update any username displays
          updateUsernameDisplays(user)
        }
      } else {
        attempts++
        setTimeout(waitForService, 100)
      }
    }

    waitForService()
  }
})

// Function to update username displays
function updateUsernameDisplays(user) {
  // Update username display
  const usernameDisplay = document.getElementById("username-display")
  if (usernameDisplay) {
    usernameDisplay.textContent = user.name || "User"
  }

  // Update any other username elements
  const usernameElements = document.querySelectorAll('[id*="username"], [class*="username"]')
  usernameElements.forEach((element) => {
    if (element.textContent.includes("{username}") || element.textContent === "") {
      element.textContent = user.name || "User"
    }
  })
}

// Make function globally available
window.updateUsernameDisplays = updateUsernameDisplays
