// Global variables
let currentUser = null

// Initialize the page
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Initializing report item page...")

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

  // Set up form
  setupReportForm()

  // Set default date to today
  const dateInput = document.getElementById("date-incident")
  if (dateInput) {
    dateInput.value = new Date().toISOString().split("T")[0]
  }
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

function setupReportForm() {
  const reportForm = document.getElementById("report-form")
  if (reportForm) {
    reportForm.addEventListener("submit", handleReportSubmit)
  }
}

function validateImageFile(input) {
  const file = input.files[0]
  const errorDiv = document.getElementById("image-error")

  if (!file) {
    errorDiv.style.display = "none"
    return true
  }

  const allowedTypes = ["image/jpeg", "image/jpg", "image/png"]
  const fileType = file.type.toLowerCase()

  if (!allowedTypes.includes(fileType)) {
    errorDiv.textContent = "Invalid file format. Only JPG and PNG files are allowed."
    errorDiv.style.display = "block"
    input.value = "" // Clear the input
    return false
  }

  errorDiv.style.display = "none"
  return true
}

function validateItemName(name) {
  // Check if name is empty or only whitespace
  if (!name || name.trim().length === 0) {
    return {
      isValid: false,
      message: "Item name cannot be empty.",
    }
  }

  // Remove spaces and check the remaining content
  const trimmedName = name.trim()

  // Check if the name contains at least one letter
  const hasLetters = /[a-zA-Z]/.test(trimmedName)

  if (!hasLetters) {
    return {
      isValid: false,
      message: "Item name must contain at least one letter. Numbers and special characters only are not allowed.",
    }
  }

  // Check if it's only numbers
  const onlyNumbers = /^[0-9\s]+$/.test(trimmedName)
  if (onlyNumbers) {
    return {
      isValid: false,
      message: "Item name cannot contain only numbers.",
    }
  }

  // Check if it's only special characters
  const onlySpecialChars = /^[^a-zA-Z0-9\s]+$/.test(trimmedName)
  if (onlySpecialChars) {
    return {
      isValid: false,
      message: "Item name cannot contain only special characters.",
    }
  }

  // Check if it's only numbers and special characters (no letters)
  const onlyNumbersAndSpecialChars = /^[^a-zA-Z]+$/.test(trimmedName)
  if (onlyNumbersAndSpecialChars) {
    return {
      isValid: false,
      message: "Item name must contain at least one letter. Only numbers and special characters are not allowed.",
    }
  }

  // Check minimum meaningful length (at least 2 characters including at least 1 letter)
  if (trimmedName.length < 2) {
    return {
      isValid: false,
      message: "Item name must be at least 2 characters long.",
    }
  }

  return { isValid: true }
}

function validateItemNameRealTime(input) {
  const errorDiv = document.getElementById("item-name-error")
  const value = input.value

  if (!value) {
    errorDiv.style.display = "none"
    input.style.borderColor = ""
    return
  }

  const validation = validateItemName(value)

  if (!validation.isValid) {
    errorDiv.textContent = validation.message
    errorDiv.style.display = "block"
    input.style.borderColor = "#ef4444"
  } else {
    errorDiv.style.display = "none"
    input.style.borderColor = "#10b981"
  }
}

// Make function globally available
window.validateItemNameRealTime = validateItemNameRealTime

async function handleReportSubmit(event) {
  event.preventDefault()
  console.log("Report form submitted")

  if (!currentUser) {
    alert("You must be logged in to report an item.")
    return
  }

  // Get form data
  const formData = new FormData(event.target)
  const itemName = formData.get("item-name")

  // Validate item name
  const nameValidation = validateItemName(itemName)
  if (!nameValidation.isValid) {
    alert(nameValidation.message)
    return
  }

  // Validate image file if uploaded
  const imageInput = document.getElementById("item-image")
  if (imageInput.files[0] && !validateImageFile(imageInput)) {
    return
  }

  const itemData = {
    type: formData.get("item-type"),
    category: formData.get("item-category"),
    name: itemName.trim(), // Trim whitespace
    description: formData.get("item-description"),
    location: formData.get("campus"), // Use campus as location
    date_incident: formData.get("date-incident"),
    contact_info: formData.get("contact-info") || "",
    security_question: formData.get("security-question"),
  }

  // Show loading state
  const submitButton = event.target.querySelector('button[type="submit"]')
  const originalText = submitButton.textContent
  submitButton.disabled = true
  submitButton.textContent = "Submitting..."

  try {
    console.log("Submitting item data:", itemData)

    const { data, error } = await window.DatabaseService.createItem(itemData)

    if (error) {
      console.error("Error creating item:", error)
      alert("Failed to submit report: " + error)
      return
    }

    console.log("Item created successfully:", data)

    // Create success notification
    if (currentUser) {
      const notificationData = {
        user_id: currentUser.id,
        title: "Report Submitted",
        message: `Your ${itemData.type} item report "${itemData.name}" has been submitted successfully.`,
        type: "success",
      }

      await window.DatabaseService.createNotification(notificationData)
    }

    alert("Item reported successfully!")

    // Reset form
    event.target.reset()

    // Set default date again
    const dateInput = document.getElementById("date-incident")
    if (dateInput) {
      dateInput.value = new Date().toISOString().split("T")[0]
    }
  } catch (error) {
    console.error("Error reporting item:", error)
    alert("There was an error reporting your item. Please try again later.")
  } finally {
    // Reset button state
    submitButton.disabled = false
    submitButton.textContent = originalText
  }
}
