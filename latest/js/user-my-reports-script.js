// Global variables
let currentUser = null
let userReports = []

// Initialize the page
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Initializing my reports page...")

  // Wait for services to be available
  await waitForServices()

  // Get current user
  try {
    const { user } = await window.DatabaseService.getCurrentUser()
    if (user) {
      currentUser = user
      console.log("Current user:", user)
    }
  } catch (error) {
    console.error("Error getting current user:", error)
  }

  await loadUserReports()
  updateReportsDisplay()
  await updateBadges()
})

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

async function loadUserReports() {
  if (!currentUser) return

  try {
    const { data, error } = await window.DatabaseService.getUserItems(currentUser.id)
    if (error) {
      console.error("Error loading user reports:", error)
      userReports = []
    } else {
      userReports = data || []
      console.log("Loaded user reports:", userReports)
    }
  } catch (error) {
    console.error("Error loading user reports:", error)
    userReports = []
  }
}

function updateReportsDisplay() {
  const container = document.getElementById("user-reports")
  if (!container) return

  container.innerHTML = ""

  // Show empty state if no reports
  if (userReports.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📋</div>
                <h3>No Current Reports</h3>
                <p>You haven't submitted any reports yet. Start by reporting a lost or found item!</p>
                <button class="primary-btn" onclick="window.location.href='user-report-item.html'" style="margin-top: 1rem;">
                    <span class="btn-icon">➕</span>
                    Report New Item
                </button>
            </div>
        `
    return
  }

  // Add clear all button
  const clearAllBtn = document.createElement("div")
  clearAllBtn.style.marginBottom = "1rem"
  clearAllBtn.innerHTML = `
        <button class="secondary-btn" onclick="clearAllReports()" style="margin-left: auto; display: block;">
            <span class="btn-icon">🗑️</span>
            Clear All Reports
        </button>
    `
  container.appendChild(clearAllBtn)

  // Display reports
  userReports.forEach((report) => {
    const reportCard = document.createElement("div")
    reportCard.className = "report-card"

    const typeLabel = report.type === "lost" ? "Lost Item" : "Found Item"

    reportCard.innerHTML = `
            <div class="report-header">
                <div class="report-title">${report.name}</div>
                <div class="report-date">${formatDate(report.created_at)}</div>
            </div>
            <div class="report-description">${report.description}</div>
            <div class="report-footer">
                <div class="report-location">📍 ${report.location}</div>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <span class="item-status ${report.status}">${report.status.charAt(0).toUpperCase() + report.status.slice(1)}</span>
                    <button class="delete-btn" onclick="deleteReport('${report.id}')" title="Delete Report">
                        🗑️
                    </button>
                </div>
            </div>
            <div style="margin-top: 0.5rem; font-size: 0.875rem; color: #6b7280;">
                <strong>Type:</strong> ${typeLabel} | 
                <strong>Category:</strong> ${report.category.charAt(0).toUpperCase() + report.category.slice(1)} | 
                <strong>Ref:</strong> ${report.ref_no || "N/A"}
            </div>
        `

    container.appendChild(reportCard)
  })
}

async function deleteReport(reportId) {
  if (!confirm("Are you sure you want to delete this report? This action cannot be undone.")) {
    return
  }

  try {
    console.log("Deleting report:", reportId)

    const { error } = await window.DatabaseService.deleteItem(reportId)

    if (error) {
      console.error("Delete error:", error)
      alert("Failed to delete report: " + error)
      return
    }

    console.log("Report deleted successfully")

    // Remove from local array immediately
    userReports = userReports.filter((report) => report.id !== reportId)

    // Update display
    updateReportsDisplay()

    alert("Report deleted successfully!")
  } catch (error) {
    console.error("Error deleting report:", error)
    alert("Failed to delete report. Please try again.")
  }
}

async function clearAllReports() {
  if (!confirm("Are you sure you want to delete ALL your reports? This action cannot be undone.")) {
    return
  }

  try {
    console.log("Clearing all reports for user:", currentUser.id)

    // Delete all user reports one by one
    const deletePromises = userReports.map(async (report) => {
      const { error } = await window.DatabaseService.deleteItem(report.id)
      if (error) {
        console.error("Error deleting report:", report.id, error)
        throw error
      }
      return report.id
    })

    await Promise.all(deletePromises)

    console.log("All reports deleted successfully")

    // Clear local array
    userReports = []

    // Update display
    updateReportsDisplay()

    alert("All reports cleared successfully!")
  } catch (error) {
    console.error("Error clearing reports:", error)
    alert("Failed to clear some reports. Please try again.")

    // Reload to get current state
    await loadUserReports()
    updateReportsDisplay()
  }
}

async function updateBadges() {
  if (!currentUser) return

  try {
    const { data: notifications } = await window.DatabaseService.getUserNotifications(currentUser.id)

    const unreadNotifications = notifications ? notifications.filter((n) => !n.read).length : 0

    const notificationBadge = document.getElementById("notification-count")
    const messageBadge = document.getElementById("message-count")

    if (notificationBadge) {
      notificationBadge.textContent = unreadNotifications
      notificationBadge.style.display = unreadNotifications > 0 ? "block" : "none"
    }

    if (messageBadge) {
      messageBadge.textContent = "0"
      messageBadge.style.display = "none"
    }
  } catch (error) {
    console.error("Error updating badges:", error)
  }
}

function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

// Make functions globally available
window.deleteReport = deleteReport
window.clearAllReports = clearAllReports
