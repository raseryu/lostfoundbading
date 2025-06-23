// Global variables
let currentUser = null
let allItems = []
let filteredItems = []

// Initialize the page
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Initializing view all items page...")

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

  await loadAllItems()
  updateItemsDisplay()
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

async function loadAllItems() {
  try {
    const { data, error } = await window.DatabaseService.getItems()
    if (error) {
      console.error("Error loading items:", error)
      allItems = []
    } else {
      allItems = data || []
      filteredItems = [...allItems]
      console.log("Loaded all items:", allItems)
    }
  } catch (error) {
    console.error("Error loading items:", error)
    allItems = []
    filteredItems = []
  }
}

function updateItemsDisplay() {
  const container = document.getElementById("all-items")
  const noResults = document.getElementById("no-results")

  if (!container) return

  container.innerHTML = ""

  // Show empty state if no items
  if (filteredItems.length === 0) {
    container.style.display = "none"
    if (noResults) {
      noResults.style.display = "block"
    }
    return
  }

  container.style.display = "grid"
  if (noResults) {
    noResults.style.display = "none"
  }

  filteredItems.forEach((item) => {
    const itemCard = document.createElement("div")
    itemCard.className = "item-card"
    itemCard.onclick = () => showItemDetails(item.id)

    const typeLabel = item.type === "lost" ? "Lost Item" : "Found Item"
    const reporterName = item.user?.name || "Anonymous"

    // Display actual image if available, otherwise show placeholder
    const imageHtml = item.image_url
      ? `<img src="${item.image_url}" alt="${item.name}" style="width: 4rem; height: 4rem; object-fit: cover; border-radius: 50%;">`
      : `<div class="item-avatar">📷</div>`

    itemCard.innerHTML = `
      <div class="item-header">
        ${imageHtml}
      </div>
      <div class="item-content">
        <div class="item-type">${typeLabel}</div>
        <div class="item-description">${item.description}</div>
        <div class="item-footer">
          <span>${reporterName}</span>
          <span class="item-status ${item.status}">${item.status.charAt(0).toUpperCase() + item.status.slice(1)}</span>
        </div>
      </div>
    `

    container.appendChild(itemCard)
  })
}

function applyFilters() {
  const categoryFilter = document.getElementById("category-filter").value
  const typeFilter = document.getElementById("type-filter").value
  const statusFilter = document.getElementById("status-filter").value
  const campusFilter = document.getElementById("campus-filter").value
  const searchInput = document.getElementById("search-input").value.toLowerCase()

  filteredItems = allItems.filter((item) => {
    // Category filter
    if (categoryFilter && item.category !== categoryFilter) return false

    // Type filter
    if (typeFilter && item.type !== typeFilter.toLowerCase().replace(" item", "")) return false

    // Status filter
    if (statusFilter && item.status !== statusFilter) return false

    // Campus filter
    if (campusFilter && !item.location.toLowerCase().includes(campusFilter.toLowerCase())) return false

    // Search filter
    if (searchInput) {
      const searchableText = `${item.name} ${item.description} ${item.location}`.toLowerCase()
      if (!searchableText.includes(searchInput)) return false
    }

    return true
  })

  updateItemsDisplay()
}

function showItemDetails(itemId) {
  const item = allItems.find((i) => i.id === itemId)
  if (!item) return

  const modalTitle = document.getElementById("modal-title")
  const modalBody = document.getElementById("modal-body")
  const claimBtn = document.getElementById("claim-btn")

  modalTitle.textContent = item.name

  const typeLabel = item.type === "lost" ? "Lost Item" : "Found Item"

  // Add image to modal if available
  const imageHtml = item.image_url
    ? `<div class="item-detail">
         <h3>Image</h3>
         <img src="${item.image_url}" alt="${item.name}" style="width: 100%; max-width: 300px; height: auto; border-radius: 0.5rem;">
       </div>`
    : ""

  modalBody.innerHTML = `
    ${imageHtml}
    <div class="item-detail">
      <h3>Type</h3>
      <p>${typeLabel}</p>
    </div>
    <div class="item-detail">
      <h3>Description</h3>
      <p>${item.description}</p>
    </div>
    <div class="item-detail">
      <h3>Location</h3>
      <p>${item.location}</p>
    </div>
    <div class="item-detail">
      <h3>Date</h3>
      <p>${formatDate(item.date_incident)}</p>
    </div>
    <div class="item-detail">
      <h3>Category</h3>
      <p>${item.category.charAt(0).toUpperCase() + item.category.slice(1)}</p>
    </div>
    <div class="item-detail">
      <h3>Status</h3>
      <p class="item-status ${item.status}">${item.status.charAt(0).toUpperCase() + item.status.slice(1)}</p>
    </div>
    <div class="item-detail">
      <h3>Reference Number</h3>
      <p>${item.ref_no || "N/A"}</p>
    </div>
  `

  // Show/hide claim button based on status and ownership
  if (item.status === "claimed" || item.user_id === currentUser?.id) {
    claimBtn.style.display = "none"
  } else {
    claimBtn.style.display = "block"
    claimBtn.textContent = item.type === "lost" ? "I Found This" : "This is Mine"
    claimBtn.onclick = () => claimItem(itemId)
  }

  document.getElementById("item-modal").classList.add("active")
}

function closeItemModal() {
  document.getElementById("item-modal").classList.remove("active")
}

async function claimItem(itemId) {
  if (!currentUser) return

  const item = allItems.find((i) => i.id === itemId)
  if (!item) return

  // Show security question modal
  showSecurityQuestionModal(itemId, item)
}

function showSecurityQuestionModal(itemId, item) {
  const modal = document.createElement("div")
  modal.className = "modal active"
  modal.id = "security-modal"

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Security Verification</h2>
        <button class="close-btn" onclick="closeSecurityModal()">&times;</button>
      </div>
      <div class="modal-body">
        <p>To claim "${item.name}", please answer the following security question:</p>
        <div class="form-group">
          <label><strong>Security Question:</strong></label>
          <p style="background: #f3f4f6; padding: 1rem; border-radius: 0.375rem; margin: 0.5rem 0;">${item.security_question || "What can you tell us about this item that would prove it's yours?"}</p>
        </div>
        <div class="form-group">
          <label for="security-answer">Your Answer:</label>
          <textarea id="security-answer" rows="3" placeholder="Provide detailed answer to prove this item belongs to you" required></textarea>
        </div>
      </div>
      <div class="modal-actions">
        <button class="secondary-btn" onclick="closeSecurityModal()">Cancel</button>
        <button class="primary-btn" onclick="submitClaim('${itemId}')">Submit Claim</button>
      </div>
    </div>
  `

  document.body.appendChild(modal)
}

function closeSecurityModal() {
  const modal = document.getElementById("security-modal")
  if (modal) {
    modal.remove()
  }
}

async function submitClaim(itemId) {
  const securityAnswer = document.getElementById("security-answer").value

  if (!securityAnswer) {
    alert("Please provide an answer to the security question.")
    return
  }

  try {
    // Create a claim with only the security answer
    const claimData = {
      item_id: itemId,
      user_id: currentUser.id,
      security_answer: securityAnswer,
      status: "pending",
    }

    const { data: claimResult, error: claimError } = await window.DatabaseService.createClaim(claimData)

    if (claimError) {
      alert("Failed to submit claim. Please try again.")
      return
    }

    // Create notification for user
    const item = allItems.find((i) => i.id === itemId)
    const notificationData = {
      user_id: currentUser.id,
      title: "Claim Submitted",
      message: `Your claim for "${item.name}" has been submitted and is pending admin review.`,
      type: "status",
    }

    await window.DatabaseService.createNotification(notificationData)

    // Close modals and reload
    closeSecurityModal()
    closeItemModal()
    await loadAllItems()
    updateItemsDisplay()
    await updateBadges()

    alert("Claim submitted successfully! You will be notified once it's reviewed.")
  } catch (error) {
    console.error("Error submitting claim:", error)
    alert("Failed to submit claim. Please try again.")
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
window.applyFilters = applyFilters
window.showItemDetails = showItemDetails
window.closeItemModal = closeItemModal
window.claimItem = claimItem
window.closeSecurityModal = closeSecurityModal
window.submitClaim = submitClaim
