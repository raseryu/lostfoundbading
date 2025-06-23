// Global variables
let currentUser = null
let allReports = []
let selectedReportId = null

// Initialize the page
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Initializing admin manage reports...")

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

  await loadReports()
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

async function loadReports() {
  try {
    const { data: reports, error } = await window.DatabaseService.getItems()
    if (!error && reports) {
      allReports = reports
      updateReportsTable()
    } else {
      console.error("Error loading reports:", error)
      allReports = []
      updateReportsTable()
    }
  } catch (error) {
    console.error("Error loading reports:", error)
    allReports = []
    updateReportsTable()
  }
}

function updateReportsTable() {
  const tableBody = document.getElementById("reports-table-body")
  if (!tableBody) return

  tableBody.innerHTML = ""

  if (allReports.length === 0) {
    tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2rem; color: #6b7280;">
                    No reports found
                </td>
            </tr>
        `
    return
  }

  allReports.forEach((report) => {
    const row = document.createElement("tr")
    row.onclick = () => selectReport(report.id)

    row.innerHTML = `
            <td>${report.location}</td>
            <td>${report.name}</td>
            <td>${report.ref_no || "N/A"}</td>
            <td>${formatDate(report.date_incident)}</td>
            <td><span class="item-status ${report.status}">${report.status.charAt(0).toUpperCase() + report.status.slice(1)}</span></td>
            <td>
                <button class="delete-btn" onclick="deleteReport(event, '${report.id}')" title="Delete Report">
                    🗑️
                </button>
            </td>
        `

    tableBody.appendChild(row)
  })
}

function selectReport(reportId) {
  // Remove previous selection
  document.querySelectorAll(".reports-table tbody tr").forEach((row) => {
    row.classList.remove("selected")
  })

  // Add selection to clicked row
  event.target.closest("tr").classList.add("selected")
  selectedReportId = reportId
}

async function deleteReport(event, reportId) {
  event.stopPropagation() // Prevent row selection

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
    allReports = allReports.filter((report) => report.id !== reportId)

    // Update display
    updateReportsTable()

    alert("Report deleted successfully!")
  } catch (error) {
    console.error("Error deleting report:", error)
    alert("Failed to delete report. Please try again.")
  }
}

function deleteSelectedReport() {
  if (!selectedReportId) {
    alert("Please select a report to delete.")
    return
  }

  const report = allReports.find((r) => r.id === selectedReportId)
  if (report) {
    deleteReport({ stopPropagation: () => {} }, selectedReportId)
  }
}

function showAddReportModal() {
  document.getElementById("add-report-modal").classList.add("active")
}

function closeAddReportModal() {
  document.getElementById("add-report-modal").classList.remove("active")
  document.getElementById("add-report-form").reset()
}

async function addReport(event) {
  event.preventDefault()

  const formData = new FormData(event.target)
  const reportData = {
    location: formData.get("location"),
    name: formData.get("name"),
    ref_no: formData.get("ref_no"),
    date_incident: formData.get("date_found"),
    status: formData.get("status").toLowerCase(),
    type: "found", // Admin reports are typically found items
    category: "other",
    description: formData.get("name"),
  }

  try {
    const { data, error } = await window.DatabaseService.createItem(reportData)

    if (error) {
      alert("Failed to add report: " + error)
      return
    }

    closeAddReportModal()
    await loadReports()
    alert("Report added successfully!")
  } catch (error) {
    console.error("Error adding report:", error)
    alert("Failed to add report. Please try again.")
  }
}

function exportReports() {
  if (allReports.length === 0) {
    alert("No reports to export.")
    return
  }

  // Create CSV content
  const headers = ["Location", "Name/Description", "Ref. No.", "Date", "Status", "Type", "Category"]
  const csvContent = [
    headers.join(","),
    ...allReports.map((report) =>
      [
        report.location,
        `"${report.name}"`,
        report.ref_no || "",
        report.date_incident,
        report.status,
        report.type,
        report.category,
      ].join(","),
    ),
  ].join("\n")

  // Download CSV
  const blob = new Blob([csvContent], { type: "text/csv" })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `reports_${new Date().toISOString().split("T")[0]}.csv`
  a.click()
  window.URL.revokeObjectURL(url)
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

// Make functions globally available
window.showAddReportModal = showAddReportModal
window.closeAddReportModal = closeAddReportModal
window.addReport = addReport
window.deleteSelectedReport = deleteSelectedReport
window.exportReports = exportReports
window.deleteReport = deleteReport
window.toggleSidebar = setupSidebar().toggleSidebar
