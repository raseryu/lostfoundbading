// Global variables
let currentUser = null
let allReports = []

// Initialize the page
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Initializing admin dashboard...")

  // Wait for services to be available
  await waitForServices()

  // Get current user
  try {
    const { user } = await window.DatabaseService.getCurrentUser()
    if (user) {
      currentUser = user
      console.log("Current admin user:", user)
    }
  } catch (error) {
    console.error("Error getting current user:", error)
  }

  await loadDashboardData()
  setupSidebar()
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

async function loadDashboardData() {
  try {
    // Load statistics
    const stats = await window.DatabaseService.getStatistics()
    updateStatistics(stats)

    // Load recent reports
    const { data: reports, error } = await window.DatabaseService.getItems()
    if (!error && reports) {
      allReports = reports
      updateRecentReports(reports.slice(0, 10)) // Show only 10 most recent
      updateRecentActivity(reports.slice(0, 5)) // Show 5 most recent for activity
    }
  } catch (error) {
    console.error("Error loading dashboard data:", error)
  }
}

function updateStatistics(stats) {
  document.getElementById("total-reports").textContent = stats.totalReports || 0
  document.getElementById("pending-claims").textContent = stats.pendingClaims || 0
  document.getElementById("resolved-items").textContent = stats.resolvedItems || 0
  document.getElementById("active-users").textContent = stats.activeUsers || 0
}

function updateRecentReports(reports) {
  const tableBody = document.getElementById("recent-reports-table")
  if (!tableBody) return

  tableBody.innerHTML = ""

  if (reports.length === 0) {
    tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 2rem; color: #6b7280;">
                    No reports found
                </td>
            </tr>
        `
    return
  }

  reports.forEach((report) => {
    const row = document.createElement("tr")
    row.innerHTML = `
            <td>${report.location}</td>
            <td>${report.name}</td>
            <td>${report.ref_no || "N/A"}</td>
            <td>${formatDate(report.date_incident)}</td>
            <td><span class="item-status ${report.status}">${report.status.charAt(0).toUpperCase() + report.status.slice(1)}</span></td>
        `
    tableBody.appendChild(row)
  })
}

function updateRecentActivity(reports) {
  const activityContainer = document.getElementById("recent-activity")
  if (!activityContainer) return

  activityContainer.innerHTML = ""

  if (reports.length === 0) {
    activityContainer.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #6b7280;">
                No recent activity
            </div>
        `
    return
  }

  reports.forEach((report) => {
    const activityItem = document.createElement("div")
    activityItem.className = "table-row"

    const actionText = `New ${report.type} item reported: ${report.name}`
    const timeText = formatTimeAgo(report.created_at)

    activityItem.innerHTML = `
            <div>${actionText}</div>
            <div>${timeText}</div>
        `

    activityContainer.appendChild(activityItem)
  })
}

function setupSidebar() {
  // Add toggle functionality
  window.toggleSidebar = () => {
    const sidebar = document.querySelector(".sidebar")
    if (sidebar) {
      sidebar.classList.toggle("collapsed")
    }
  }
}

function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatTimeAgo(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diffInMinutes = Math.floor((now - date) / (1000 * 60))

  if (diffInMinutes < 1) return "Just now"
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
  return `${Math.floor(diffInMinutes / 1440)}d ago`
}

// Make functions globally available
window.toggleSidebar = setupSidebar().toggleSidebar
