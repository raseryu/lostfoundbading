// Global variables
let currentUser = null
let notifications = []

// Initialize the page
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Initializing notifications page...")

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

  await loadNotifications()
  updateNotificationsDisplay()
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

async function loadNotifications() {
  if (!currentUser) return

  try {
    const { data, error } = await window.DatabaseService.getUserNotifications(currentUser.id)
    if (error) {
      console.error("Error loading notifications:", error)
      notifications = []
    } else {
      notifications = data || []
      console.log("Loaded notifications:", notifications)
    }
  } catch (error) {
    console.error("Error loading notifications:", error)
    notifications = []
  }
}

function updateNotificationsDisplay() {
  const container = document.getElementById("notifications-list")
  if (!container) return

  container.innerHTML = ""

  // Show empty state if no notifications
  if (notifications.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🔔</div>
                <h3>No Current Notifications</h3>
                <p>You don't have any notifications yet. We'll notify you when there are updates on your reports or claims!</p>
            </div>
        `
    return
  }

  // Add clear all button
  const clearAllBtn = document.createElement("div")
  clearAllBtn.style.marginBottom = "1rem"
  clearAllBtn.innerHTML = `
        <button class="secondary-btn" onclick="clearAllNotifications()" style="margin-left: auto; display: block;">
            <span class="btn-icon">🗑️</span>
            Clear All Notifications
        </button>
    `
  container.appendChild(clearAllBtn)

  // Display notifications
  notifications.forEach((notification) => {
    const notificationItem = document.createElement("div")
    notificationItem.className = `notification-item ${!notification.read ? "unread" : ""}`
    notificationItem.onclick = () => markAsRead(notification.id)

    notificationItem.innerHTML = `
            <div class="notification-icon">🔔</div>
            <div class="notification-content">
                <div class="notification-title">${notification.title}</div>
                <div class="notification-message">${notification.message}</div>
                <div class="notification-time">${formatDate(notification.created_at)}</div>
            </div>
            <button class="delete-btn" onclick="deleteNotification(event, '${notification.id}')" title="Delete Notification" style="margin-left: auto;">
                🗑️
            </button>
        `

    container.appendChild(notificationItem)
  })
}

async function markAsRead(notificationId) {
  try {
    await window.DatabaseService.markNotificationAsRead(notificationId)

    // Update local state
    const notification = notifications.find((n) => n.id === notificationId)
    if (notification) {
      notification.read = true
    }

    updateNotificationsDisplay()
    await updateBadges()
  } catch (error) {
    console.error("Error marking notification as read:", error)
  }
}

async function markAllAsRead() {
  if (!currentUser) return

  try {
    await window.DatabaseService.markAllNotificationsAsRead(currentUser.id)

    // Update local state
    notifications.forEach((n) => (n.read = true))

    updateNotificationsDisplay()
    await updateBadges()

    alert("All notifications marked as read!")
  } catch (error) {
    console.error("Error marking all notifications as read:", error)
    alert("Failed to mark notifications as read. Please try again.")
  }
}

async function deleteNotification(event, notificationId) {
  event.stopPropagation() // Prevent triggering the click event on the parent

  if (!confirm("Are you sure you want to delete this notification?")) {
    return
  }

  try {
    console.log("Deleting notification:", notificationId)

    // Use DatabaseService if available, otherwise direct Supabase call
    if (window.DatabaseService && window.DatabaseService.deleteNotification) {
      const { error } = await window.DatabaseService.deleteNotification(notificationId)
      if (error) {
        throw new Error(error)
      }
    } else {
      // Fallback to direct Supabase call
      const client = window.supabase?.createClient(
        "https://yxvonbclhozzvijxdzhc.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4dm9uYmNsaG96enZpanhkemhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwODIyNTUsImV4cCI6MjA2NTY1ODI1NX0.Ii1uo5fAaF4RIvYlhrFqLPs5hcQER56uAbjXLtjTFDc",
      )

      if (client) {
        const { error } = await client.from("notifications").delete().eq("id", notificationId)
        if (error) {
          console.error("Database delete error:", error)
          throw error
        }
      }
    }

    console.log("Notification deleted successfully")

    // Remove from local array immediately
    notifications = notifications.filter((n) => n.id !== notificationId)

    // Update display
    updateNotificationsDisplay()
    await updateBadges()
  } catch (error) {
    console.error("Error deleting notification:", error)
    alert("Failed to delete notification. Please try again.")
  }
}

async function clearAllNotifications() {
  if (!currentUser) return

  if (!confirm("Are you sure you want to delete ALL notifications? This action cannot be undone.")) {
    return
  }

  try {
    console.log("Clearing all notifications for user:", currentUser.id)

    // Use DatabaseService if available
    if (window.DatabaseService && window.DatabaseService.deleteAllUserNotifications) {
      const { error } = await window.DatabaseService.deleteAllUserNotifications(currentUser.id)
      if (error) {
        throw new Error(error)
      }
    } else {
      // Fallback to direct Supabase call
      const client = window.supabase?.createClient(
        "https://yxvonbclhozzvijxdzhc.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4dm9uYmNsaG96enZpanhkemhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwODIyNTUsImV4cCI6MjA2NTY1ODI1NX0.Ii1uo5fAaF4RIvYlhrFqLPs5hcQER56uAbjXLtjTFDc",
      )

      if (client) {
        const { error } = await client.from("notifications").delete().eq("user_id", currentUser.id)
        if (error) {
          throw new Error(error.message)
        }
      }
    }

    console.log("All notifications deleted successfully")

    // Clear local array
    notifications = []

    // Update display
    updateNotificationsDisplay()
    await updateBadges()

    alert("All notifications cleared successfully!")
  } catch (error) {
    console.error("Error clearing notifications:", error)
    alert("Failed to clear notifications. Please try again.")

    // Reload to get current state
    await loadNotifications()
    updateNotificationsDisplay()
    await updateBadges()
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
    hour: "2-digit",
    minute: "2-digit",
  })
}

// Make functions globally available
window.markAllAsRead = markAllAsRead
window.deleteNotification = deleteNotification
window.clearAllNotifications = clearAllNotifications
window.markAsRead = markAsRead
