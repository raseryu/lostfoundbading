// Global variables
let currentUser = null
let selectedItemId = null
let recentItems = []

// Initialize the page
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Initializing user home page...")

  // Wait for services to be available
  await waitForServices()

  // Get current user
  try {
    const { user } = await window.DatabaseService.getCurrentUser()
    if (user) {
      currentUser = user
      updateUsernameDisplay(user)
    }
  } catch (error) {
    console.error("Error getting current user:", error)
  }

  await loadRecentItems()
  updateRecentItems()
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

// Update username display
function updateUsernameDisplay(user) {
  const usernameDisplay = document.getElementById("username-display")
  if (usernameDisplay) {
    usernameDisplay.textContent = user.name || "User"
  }
}

async function loadRecentItems() {
  try {
    const { data, error } = await window.DatabaseService.getItems()
    if (error) {
      console.error("Error loading items:", error)
      recentItems = []
    } else {
      recentItems = data || []
    }
  } catch (error) {
    console.error("Error loading items:", error)
    recentItems = []
  }
}

function updateRecentItems() {
  const container = document.getElementById("recent-items")
  if (!container) return

  container.innerHTML = ""

  // Show empty state if no items
  if (recentItems.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📦</div>
                <h3>No Current Lost/Found Items</h3>
                <p>There are no items reported yet. Be the first to report a lost or found item!</p>
                <button class="primary-btn" onclick="window.location.href='user-report-item.html'" style="margin-top: 1rem;">
                    <span class="btn-icon">➕</span>
                    Report Item
                </button>
            </div>
        `
    return
  }

  // Show only first 4 items
  const itemsToShow = recentItems.slice(0, 4)

  itemsToShow.forEach((item) => {
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

function showItemDetails(itemId) {
  const item = recentItems.find((i) => i.id === itemId)
  if (!item) return

  selectedItemId = itemId

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
  }

  document.getElementById("item-modal").classList.add("active")
}

function closeItemModal() {
  document.getElementById("item-modal").classList.remove("active")
  selectedItemId = null
}

async function claimItem() {
  if (!selectedItemId || !currentUser) return

  const item = recentItems.find((i) => i.id === selectedItemId)
  if (!item) return

  // Show security question modal
  showSecurityQuestionModal(selectedItemId, item)
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
    const item = recentItems.find((i) => i.id === itemId)
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
    await loadRecentItems()
    updateRecentItems()
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

    // For now, set messages to 0 since we haven't implemented user messages yet
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

// Close modal when clicking outside
document.addEventListener("click", (event) => {
  const modal = document.getElementById("item-modal")
  if (event.target === modal) {
    closeItemModal()
  }
})

// Make functions globally available
window.showItemDetails = showItemDetails
window.closeItemModal = closeItemModal
window.claimItem = claimItem
window.closeSecurityModal = closeSecurityModal
window.submitClaim = submitClaim
