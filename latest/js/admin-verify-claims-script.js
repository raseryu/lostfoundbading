// Global variables
let currentUser = null
let allClaims = []
let selectedClaimId = null

// Initialize the page
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Initializing admin verify claims...")

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

  await loadClaims()
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

async function loadClaims() {
  try {
    const { data: claims, error } = await window.DatabaseService.getClaims()
    if (!error && claims) {
      allClaims = claims
      console.log("Loaded claims:", claims)
      updateClaimsList()
    } else {
      console.error("Error loading claims:", error)
      allClaims = []
      updateClaimsList()
    }
  } catch (error) {
    console.error("Error loading claims:", error)
    allClaims = []
    updateClaimsList()
  }
}

function updateClaimsList() {
  const claimsList = document.getElementById("claims-list")
  if (!claimsList) return

  claimsList.innerHTML = ""

  if (allClaims.length === 0) {
    claimsList.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #6b7280;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">✅</div>
                <h3>No Pending Claims</h3>
                <p>There are no claims waiting for verification at the moment.</p>
            </div>
        `
    return
  }

  allClaims.forEach((claim) => {
    const claimItem = document.createElement("div")
    claimItem.className = "claim-item"
    claimItem.onclick = () => selectClaim(claim.id)

    const itemName = claim.item?.name || "Unknown Item"
    const userName = claim.user?.name || "Unknown User"
    const timeAgo = formatTimeAgo(claim.created_at)

    claimItem.innerHTML = `
            <div class="claim-avatar">👤</div>
            <div class="claim-content">
                <p><strong>${userName}</strong> wants to claim "${itemName}"</p>
                <span class="claim-time">${timeAgo}</span>
            </div>
        `

    claimsList.appendChild(claimItem)
  })
}

function selectClaim(claimId) {
  // Remove previous selection
  document.querySelectorAll(".claim-item").forEach((item) => {
    item.classList.remove("active")
  })

  // Add selection to clicked item
  event.target.closest(".claim-item").classList.add("active")
  selectedClaimId = claimId

  // Update claim details
  const claim = allClaims.find((c) => c.id === claimId)
  if (claim) {
    updateClaimDetails(claim)
  }
}

function updateClaimDetails(claim) {
  const claimDescription = document.getElementById("claim-description")
  const securityQuestion = document.getElementById("security-question")
  const securityAnswer = document.getElementById("security-answer")
  const acceptBtn = document.getElementById("accept-btn")
  const rejectBtn = document.getElementById("reject-btn")

  const itemName = claim.item?.name || "Unknown Item"
  const userName = claim.user?.name || "Unknown User"

  claimDescription.textContent = `${userName} wants to claim "${itemName}"`
  securityQuestion.textContent = claim.item?.security_question || "No security question provided"
  securityAnswer.textContent = claim.security_answer || "No answer provided"

  // Enable buttons
  acceptBtn.disabled = false
  rejectBtn.disabled = false
}

async function acceptClaim() {
  if (!selectedClaimId) return

  const claim = allClaims.find((c) => c.id === selectedClaimId)
  if (!claim) return

  if (confirm(`Are you sure you want to approve this claim for "${claim.item?.name || "this item"}"?`)) {
    try {
      // Update claim status
      const { error: claimError } = await window.DatabaseService.updateClaim(selectedClaimId, {
        status: "approved",
      })

      if (claimError) {
        alert("Failed to approve claim: " + claimError)
        return
      }

      // Update item status to claimed
      const { error: itemError } = await window.DatabaseService.updateItem(claim.item_id, {
        status: "claimed",
      })

      if (itemError) {
        console.error("Error updating item status:", itemError)
      }

      // Create notification for user
      const notificationData = {
        user_id: claim.user_id,
        title: "Claim Approved",
        message: `Your claim for "${claim.item?.name || "the item"}" has been approved! Please contact the admin to arrange pickup.`,
        type: "status",
      }

      await window.DatabaseService.createNotification(notificationData)

      // Reload claims
      await loadClaims()
      clearClaimDetails()

      alert("Claim approved successfully!")
    } catch (error) {
      console.error("Error approving claim:", error)
      alert("Failed to approve claim. Please try again.")
    }
  }
}

async function rejectClaim() {
  if (!selectedClaimId) return

  const claim = allClaims.find((c) => c.id === selectedClaimId)
  if (!claim) return

  if (confirm(`Are you sure you want to reject this claim for "${claim.item?.name || "this item"}"?`)) {
    try {
      // Update claim status
      const { error: claimError } = await window.DatabaseService.updateClaim(selectedClaimId, {
        status: "rejected",
      })

      if (claimError) {
        alert("Failed to reject claim: " + claimError)
        return
      }

      // Create notification for user
      const notificationData = {
        user_id: claim.user_id,
        title: "Claim Rejected",
        message: `Your claim for "${claim.item?.name || "the item"}" has been rejected. Please contact admin if you have questions.`,
        type: "status",
      }

      await window.DatabaseService.createNotification(notificationData)

      // Reload claims
      await loadClaims()
      clearClaimDetails()

      alert("Claim rejected.")
    } catch (error) {
      console.error("Error rejecting claim:", error)
      alert("Failed to reject claim. Please try again.")
    }
  }
}

function clearClaimDetails() {
  document.getElementById("claim-description").textContent = "Select a claim to view details"
  document.getElementById("security-question").textContent = "No claim selected"
  document.getElementById("security-answer").textContent = "No claim selected"
  document.getElementById("accept-btn").disabled = true
  document.getElementById("reject-btn").disabled = true
  selectedClaimId = null
}

async function addSampleClaim() {
  try {
    // Get a random item and user for demo
    const { data: items } = await window.DatabaseService.getItems()
    const { data: users } = (await window.DatabaseService.getUsers?.()) || { data: [] }

    if (!items || items.length === 0) {
      alert("No items available to create a sample claim. Please add some items first.")
      return
    }

    const randomItem = items[Math.floor(Math.random() * items.length)]

    // Create sample claim
    const sampleClaim = {
      item_id: randomItem.id,
      user_id: currentUser.id, // Use current admin as sample user
      security_question: `What color is the ${randomItem.name}?`,
      security_answer: "Please describe the exact color and any distinctive markings.",
      status: "pending",
    }

    const { error } = await window.DatabaseService.createClaim(sampleClaim)

    if (error) {
      alert("Failed to create sample claim: " + error)
      return
    }

    await loadClaims()
    alert("Sample claim created successfully!")
  } catch (error) {
    console.error("Error creating sample claim:", error)
    alert("Failed to create sample claim. Please try again.")
  }
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
window.acceptClaim = acceptClaim
window.rejectClaim = rejectClaim
window.addSampleClaim = addSampleClaim
window.toggleSidebar = setupSidebar().toggleSidebar
