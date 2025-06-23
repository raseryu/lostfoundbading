// Global variables
let currentUser = null
let messages = []

// Initialize the page
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Initializing messages page...")

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

  await loadMessages()
  updateMessagesDisplay()
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

async function loadMessages() {
  if (!currentUser) return

  try {
    // For now, we'll create some sample messages since the messaging system isn't fully implemented
    messages = []
    console.log("Loaded messages:", messages)
  } catch (error) {
    console.error("Error loading messages:", error)
    messages = []
  }
}

function updateMessagesDisplay() {
  const container = document.getElementById("messages-list")
  if (!container) return

  container.innerHTML = ""

  // Show empty state if no messages
  if (messages.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 3rem; margin-bottom: 1rem;">✉️</div>
                <h3>No Current Messages</h3>
                <p>You don't have any messages yet. Admins will contact you here if they need to verify your claims or provide updates!</p>
            </div>
        `
    return
  }

  // Add clear all button
  const clearAllBtn = document.createElement("div")
  clearAllBtn.style.marginBottom = "1rem"
  clearAllBtn.innerHTML = `
        <button class="secondary-btn" onclick="clearAllMessages()" style="margin-left: auto; display: block;">
            <span class="btn-icon">🗑️</span>
            Clear All Messages
        </button>
    `
  container.appendChild(clearAllBtn)

  // Display messages
  messages.forEach((message) => {
    const messageItem = document.createElement("div")
    messageItem.className = `message-item ${!message.read ? "unread" : ""}`
    messageItem.onclick = () => openMessage(message.id)

    messageItem.innerHTML = `
            <div class="message-avatar">👤</div>
            <div class="message-content">
                <div class="message-sender">${message.sender_name || "Admin"}</div>
                <div class="message-preview">${message.content.substring(0, 100)}${message.content.length > 100 ? "..." : ""}</div>
                <div class="message-time">${formatDate(message.created_at)}</div>
            </div>
            <button class="delete-btn" onclick="deleteMessage(event, '${message.id}')" title="Delete Message" style="margin-left: auto;">
                🗑️
            </button>
        `

    container.appendChild(messageItem)
  })
}

function openMessage(messageId) {
  // For now, just mark as read
  const message = messages.find((m) => m.id === messageId)
  if (message) {
    message.read = true
    updateMessagesDisplay()
    alert(`Message from ${message.sender_name || "Admin"}:\n\n${message.content}`)
  }
}

async function deleteMessage(event, messageId) {
  event.stopPropagation() // Prevent triggering the click event on the parent

  if (!confirm("Are you sure you want to delete this message?")) {
    return
  }

  try {
    // Remove from local array
    messages = messages.filter((m) => m.id !== messageId)
    updateMessagesDisplay()
    await updateBadges()
  } catch (error) {
    console.error("Error deleting message:", error)
    alert("Failed to delete message. Please try again.")
  }
}

async function clearAllMessages() {
  if (!currentUser) return

  if (!confirm("Are you sure you want to delete ALL messages? This action cannot be undone.")) {
    return
  }

  try {
    messages = []
    updateMessagesDisplay()
    await updateBadges()

    alert("All messages cleared successfully!")
  } catch (error) {
    console.error("Error clearing messages:", error)
    alert("Failed to clear messages. Please try again.")
  }
}

async function updateBadges() {
  if (!currentUser) return

  try {
    const { data: notifications } = await window.DatabaseService.getUserNotifications(currentUser.id)

    const unreadNotifications = notifications ? notifications.filter((n) => !n.read).length : 0
    const unreadMessages = messages ? messages.filter((m) => !m.read).length : 0

    const notificationBadge = document.getElementById("notification-count")
    const messageBadge = document.getElementById("message-count")

    if (notificationBadge) {
      notificationBadge.textContent = unreadNotifications
      notificationBadge.style.display = unreadNotifications > 0 ? "block" : "none"
    }

    if (messageBadge) {
      messageBadge.textContent = unreadMessages
      messageBadge.style.display = unreadMessages > 0 ? "block" : "none"
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
    hour: "2-digit",
    minute: "2-digit",
  })
}

// Make functions globally available
window.clearAllMessages = clearAllMessages
window.deleteMessage = deleteMessage
window.openMessage = openMessage
