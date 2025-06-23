// Test database connection
document.addEventListener("DOMContentLoaded", async () => {
  console.log("=== DATABASE CONNECTION TEST ===")

  // Wait for services to be available
  setTimeout(async () => {
    try {
      // Test 1: Check if Supabase is loaded
      console.log("1. Supabase available:", !!window.supabase)

      // Test 2: Check if DatabaseService is loaded
      console.log("2. DatabaseService available:", !!window.DatabaseService)

      // Test 3: Try to get current user (should return null if not logged in)
      if (window.DatabaseService) {
        const { user, error } = await window.DatabaseService.getCurrentUser()
        console.log("3. Current user check:", { user, error })
      }

      // Test 4: Try to get items (should work even if not logged in)
      if (window.DatabaseService) {
        const { data, error } = await window.DatabaseService.getItems()
        console.log("4. Items fetch test:", { count: data?.length || 0, error })
      }

      console.log("=== TEST COMPLETE ===")
    } catch (error) {
      console.error("Test failed:", error)
    }
  }, 2000)
})
