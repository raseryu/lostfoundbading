// Supabase configuration
const SUPABASE_URL = "https://yxvonbclhozzvijxdzhc.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4dm9uYmNsaG96enZpanhkemhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwODIyNTUsImV4cCI6MjA2NTY1ODI1NX0.Ii1uo5fAaF4RIvYlhrFqLPs5hcQER56uAbjXLtjTFDc"

// Initialize Supabase client
let supabase = null

// Wait for Supabase to be available
function initializeSupabase() {
  if (window.supabase && !supabase) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    console.log("Supabase client initialized")
  }
  return supabase
}

// Database service functions
class DatabaseService {
  // Authentication methods
  static async signUp(email, password, name) {
    try {
      console.log("Starting signup process for:", email)

      const client = initializeSupabase()
      if (!client) {
        throw new Error("Supabase client not available")
      }

      // Create auth user with email confirmation
      const { data: authData, error: authError } = await client.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          },
          emailRedirectTo: `${window.location.origin}/html/confirm-email.html`,
        },
      })

      if (authError) {
        console.error("Auth signup error:", authError)
        if (authError.message.includes("already registered")) {
          throw new Error(
            "An account with this email address already exists. Please use a different email or try logging in.",
          )
        }
        throw authError
      }

      console.log("Auth signup successful:", authData)

      return {
        user: null,
        error: null,
        needsConfirmation: !authData.user?.email_confirmed_at,
      }
    } catch (error) {
      console.error("Signup error:", error)
      return { user: null, error: error.message }
    }
  }

  static async signIn(email, password) {
    try {
      console.log("Starting signin process for:", email)

      const client = initializeSupabase()
      if (!client) {
        throw new Error("Supabase client not available")
      }

      const { data: authData, error: authError } = await client.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        console.error("Auth signin error:", authError)
        throw authError
      }

      if (!authData.user?.email_confirmed_at) {
        throw new Error(
          "Please confirm your email address before logging in. Check your inbox for a confirmation link.",
        )
      }

      console.log("Auth signin successful:", authData)

      // Check if user exists in our users table
      const { data: existingUser, error: queryError } = await client
        .from("users")
        .select("*")
        .eq("id", authData.user.id)
        .maybeSingle()

      if (queryError) {
        console.error("Error querying user:", queryError)
        throw queryError
      }

      if (!existingUser) {
        // If user doesn't exist in our table but has auth, they might have been deleted
        // Sign them out and require re-registration
        await client.auth.signOut()
        throw new Error("Your account was not found or has been deleted. Please register again.")
      }

      return { user: existingUser, error: null }
    } catch (error) {
      console.error("Signin error:", error)
      return { user: null, error: error.message }
    }
  }

  static async getOrCreateUserRecord(authUser) {
    try {
      const client = initializeSupabase()
      if (!client) {
        throw new Error("Supabase client not available")
      }

      // First try to get existing user
      const { data: existingUser, error: queryError } = await client
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle()

      if (queryError) {
        console.error("Error querying user:", queryError)
        throw queryError
      }

      if (existingUser) {
        console.log("Found existing user:", existingUser)
        return existingUser
      }

      // Create new user record
      console.log("Creating new user record for:", authUser.email)
      const { data: newUser, error: insertError } = await client
        .from("users")
        .insert([
          {
            id: authUser.id,
            email: authUser.email,
            name: authUser.user_metadata?.name || authUser.email.split("@")[0],
            role: "user",
          },
        ])
        .select()
        .single()

      if (insertError) {
        console.error("Error creating user record:", insertError)
        // If it's a duplicate key error, try to fetch the existing user
        if (insertError.message.includes("duplicate key") || insertError.message.includes("already exists")) {
          console.log("User already exists, fetching existing user")
          const { data: existingUser, error: fetchError } = await client
            .from("users")
            .select("*")
            .eq("id", authUser.id)
            .single()

          if (fetchError) {
            throw fetchError
          }
          return existingUser
        }
        throw insertError
      }

      console.log("Created new user record:", newUser)
      return newUser
    } catch (error) {
      console.error("Error in getOrCreateUserRecord:", error)
      throw error
    }
  }

  static async signOut() {
    try {
      const client = initializeSupabase()
      if (!client) {
        throw new Error("Supabase client not available")
      }

      const { error } = await client.auth.signOut()
      return { error }
    } catch (error) {
      console.error("Signout error:", error)
      return { error: error.message }
    }
  }

  static async getCurrentUser() {
    try {
      const client = initializeSupabase()
      if (!client) {
        throw new Error("Supabase client not available")
      }

      const {
        data: { user: authUser },
      } = await client.auth.getUser()

      if (!authUser) return { user: null, error: null }

      // Get user data from our users table
      const userData = await this.getOrCreateUserRecord(authUser)
      return { user: userData, error: null }
    } catch (error) {
      console.error("Error getting current user:", error)
      return { user: null, error: error.message }
    }
  }

  // Email confirmation method
  static async confirmEmail(tokenHash, type) {
    try {
      const client = initializeSupabase()
      if (!client) {
        throw new Error("Supabase client not available")
      }

      const { data, error } = await client.auth.verifyOtp({
        token_hash: tokenHash,
        type: type,
      })

      if (error) {
        console.error("Email confirmation error:", error)
        throw error
      }

      console.log("Email confirmed successfully:", data)

      // Create user record after successful email confirmation
      if (data.user && data.user.email_confirmed_at) {
        try {
          await this.getOrCreateUserRecord(data.user)
        } catch (userError) {
          console.error("Error creating user record:", userError)
          // Don't fail the confirmation if user creation fails due to duplicate
          if (!userError.message.includes("duplicate") && !userError.message.includes("already exists")) {
            throw userError
          }
        }
      }

      return { data, error: null }
    } catch (error) {
      console.error("Confirm email error:", error)
      return { data: null, error: error.message }
    }
  }

  // Items methods
  static async getItems(filters = {}) {
    try {
      const client = initializeSupabase()
      if (!client) {
        throw new Error("Supabase client not available")
      }

      let query = client
        .from("items")
        .select(`
                    *,
                    user:users(name)
                `)
        .order("created_at", { ascending: false })

      if (filters.category) {
        query = query.eq("category", filters.category)
      }
      if (filters.type) {
        query = query.eq("type", filters.type)
      }
      if (filters.status) {
        query = query.eq("status", filters.status)
      }
      if (filters.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,location.ilike.%${filters.search}%`,
        )
      }

      const { data, error } = await query
      return { data, error }
    } catch (error) {
      return { data: null, error: error.message }
    }
  }

  static async createItem(itemData) {
    try {
      console.log("Creating item with data:", itemData)

      const client = initializeSupabase()
      if (!client) {
        throw new Error("Supabase client not available")
      }

      // Get current user to ensure we have user_id
      const { user: currentUser } = await this.getCurrentUser()
      if (!currentUser) {
        throw new Error("User not authenticated")
      }

      // Generate reference number
      const refNo = await this.generateRefNo(itemData.location || "Unknown")

      // Prepare item data with all required fields
      const itemToInsert = {
        name: itemData.name || itemData.item_name || "Unnamed Item",
        description: itemData.description || itemData.item_description || "",
        category: itemData.category || itemData.item_category || "other",
        type: itemData.type || itemData.item_type || "lost",
        location: itemData.location || "Unknown Location",
        date_incident: itemData.date_incident || itemData.date || new Date().toISOString().split("T")[0],
        contact_info: itemData.contact_info || itemData.contactInfo || "",
        security_question: itemData.security_question || "",
        image_url: itemData.image_url || null,
        user_id: currentUser.id,
        ref_no: refNo,
        status: "pending",
      }

      console.log("Inserting item:", itemToInsert)

      const { data, error } = await client
        .from("items")
        .insert([itemToInsert])
        .select(`
                *,
                user:users(name)
            `)
        .single()

      if (error) {
        console.error("Database insert error:", error)
        throw error
      }

      console.log("Item created successfully:", data)
      return { data, error: null }
    } catch (error) {
      console.error("Create item error:", error)
      return { data: null, error: error.message }
    }
  }

  // Fixed generateRefNo method
  static async generateRefNo(location) {
    try {
      const client = initializeSupabase()
      if (!client) {
        throw new Error("Supabase client not available")
      }

      const prefix = location.substring(0, 1).toUpperCase()
      const randomNum = Math.floor(1000 + Math.random() * 9000)

      // Get count of existing items
      const { count, error } = await client.from("items").select("*", { count: "exact", head: true })

      if (error) {
        console.error("Error getting item count:", error)
      }

      const itemCount = (count || 0) + 1
      const refNo = `${prefix}-${randomNum}-${itemCount.toString().padStart(2, "0")}`

      console.log("Generated reference number:", refNo)
      return refNo
    } catch (error) {
      console.error("Error generating ref number:", error)
      // Fallback reference number
      return `REF-${Date.now()}`
    }
  }

  static async updateItem(id, updates) {
    try {
      const client = initializeSupabase()
      if (!client) {
        throw new Error("Supabase client not available")
      }

      const { data, error } = await client.from("items").update(updates).eq("id", id).select().single()

      return { data, error }
    } catch (error) {
      return { data: null, error: error.message }
    }
  }

  static async deleteItem(id) {
    try {
      const client = initializeSupabase()
      if (!client) {
        throw new Error("Supabase client not available")
      }

      const { error } = await client.from("items").delete().eq("id", id)

      return { error }
    } catch (error) {
      return { error: error.message }
    }
  }

  static async getUserItems(userId) {
    try {
      const client = initializeSupabase()
      if (!client) {
        throw new Error("Supabase client not available")
      }

      const { data, error } = await client
        .from("items")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      return { data, error }
    } catch (error) {
      return { data: null, error: error.message }
    }
  }

  // Claims methods
  static async createClaim(claimData) {
    try {
      const client = initializeSupabase()
      if (!client) {
        throw new Error("Supabase client not available")
      }

      // Remove security_question from claimData since it's now stored in items table
      const claimToInsert = {
        item_id: claimData.item_id,
        user_id: claimData.user_id,
        security_answer: claimData.security_answer,
        status: claimData.status || "pending",
      }

      const { data, error } = await client.from("claims").insert([claimToInsert]).select().single()

      return { data, error }
    } catch (error) {
      return { data: null, error: error.message }
    }
  }

  static async getClaims() {
    try {
      const client = initializeSupabase()
      if (!client) {
        throw new Error("Supabase client not available")
      }

      const { data, error } = await client
        .from("claims")
        .select(`
                *,
                item:items(name, description, security_question),
                user:users(name, email)
            `)
        .eq("status", "pending")
        .order("created_at", { ascending: false })

      return { data, error }
    } catch (error) {
      return { data: null, error: error.message }
    }
  }

  static async updateClaim(id, updates) {
    try {
      const client = initializeSupabase()
      if (!client) {
        throw new Error("Supabase client not available")
      }

      const { data, error } = await client.from("claims").update(updates).eq("id", id).select().single()

      return { data, error }
    } catch (error) {
      return { data: null, error: error.message }
    }
  }

  // Notifications methods
  static async createNotification(notificationData) {
    try {
      const client = initializeSupabase()
      if (!client) {
        throw new Error("Supabase client not available")
      }

      const { data, error } = await client.from("notifications").insert([notificationData]).select().single()

      return { data, error }
    } catch (error) {
      return { data: null, error: error.message }
    }
  }

  static async getUserNotifications(userId) {
    try {
      const client = initializeSupabase()
      if (!client) {
        throw new Error("Supabase client not available")
      }

      const { data, error } = await client
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      return { data, error }
    } catch (error) {
      return { data: null, error: error.message }
    }
  }

  static async markNotificationAsRead(id) {
    try {
      const client = initializeSupabase()
      if (!client) {
        throw new Error("Supabase client not available")
      }

      const { data, error } = await client.from("notifications").update({ read: true }).eq("id", id).select().single()

      return { data, error }
    } catch (error) {
      return { data: null, error: error.message }
    }
  }

  static async markAllNotificationsAsRead(userId) {
    try {
      const client = initializeSupabase()
      if (!client) {
        throw new Error("Supabase client not available")
      }

      const { data, error } = await client
        .from("notifications")
        .update({ read: true })
        .eq("user_id", userId)
        .eq("read", false)

      return { data, error }
    } catch (error) {
      return { data: null, error: error.message }
    }
  }

  // Conversations and Messages methods
  static async getConversations() {
    try {
      const client = initializeSupabase()
      if (!client) {
        throw new Error("Supabase client not available")
      }

      const { data, error } = await client
        .from("conversations")
        .select(`
                    *,
                    user:users!conversations_user_id_fkey(name, email)
                `)
        .order("last_message_at", { ascending: false })

      return { data, error }
    } catch (error) {
      return { data: null, error: error.message }
    }
  }

  static async getConversationMessages(conversationId) {
    try {
      const client = initializeSupabase()
      if (!client) {
        throw new Error("Supabase client not available")
      }

      const { data, error } = await client
        .from("conversation_messages")
        .select(`
                    *,
                    sender:users(name, role)
                `)
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })

      return { data, error }
    } catch (error) {
      return { data: null, error: error.message }
    }
  }

  static async sendMessage(conversationId, senderId, content) {
    try {
      const client = initializeSupabase()
      if (!client) {
        throw new Error("Supabase client not available")
      }

      // Insert message
      const { data: messageData, error: messageError } = await client
        .from("conversation_messages")
        .insert([
          {
            conversation_id: conversationId,
            sender_id: senderId,
            content,
          },
        ])
        .select()
        .single()

      if (messageError) throw messageError

      // Update conversation last message
      const { error: updateError } = await client
        .from("conversations")
        .update({
          last_message: content,
          last_message_at: new Date().toISOString(),
        })
        .eq("id", conversationId)

      if (updateError) throw updateError

      return { data: messageData, error: null }
    } catch (error) {
      return { data: null, error: error.message }
    }
  }

  static async createConversation(userId, adminId) {
    try {
      const client = initializeSupabase()
      if (!client) {
        throw new Error("Supabase client not available")
      }

      const { data, error } = await client
        .from("conversations")
        .insert([
          {
            user_id: userId,
            admin_id: adminId,
            last_message: "Conversation started",
            last_message_at: new Date().toISOString(),
          },
        ])
        .select()
        .single()

      return { data, error }
    } catch (error) {
      return { data: null, error: error.message }
    }
  }

  // Utility methods
  static async generateRefNo(location) {
    try {
      const client = initializeSupabase()
      if (!client) {
        throw new Error("Supabase client not available")
      }
      const prefix = location.substring(0, 1).toUpperCase()
      const randomNum = Math.floor(1000 + Math.random() * 9000)

      // Get count of existing items
      const { count, error } = await client.from("items").select("*", { count: "exact", head: true })

      if (error) {
        console.error("Error getting item count:", error)
      }

      const itemCount = (count || 0) + 1
      const refNo = `${prefix}-${randomNum}-${itemCount.toString().padStart(2, "0")}`

      console.log("Generated reference number:", refNo)
      return refNo
    } catch (error) {
      console.error("Error generating ref number:", error)
      // Fallback reference number
      return `REF-${Date.now()}`
    }
  }

  // Statistics methods for admin dashboard
  static async getStatistics() {
    try {
      const client = initializeSupabase()
      if (!client) {
        throw new Error("Supabase client not available")
      }

      const [itemsResult, claimsResult, usersResult] = await Promise.all([
        client.from("items").select("*", { count: "exact", head: true }),
        client.from("claims").select("*", { count: "exact", head: true }).eq("status", "pending"),
        client.from("users").select("*", { count: "exact", head: true }).eq("role", "user"),
      ])

      const resolvedItems = await client
        .from("items")
        .select("*", { count: "exact", head: true })
        .eq("status", "claimed")

      return {
        totalReports: itemsResult.count || 0,
        pendingClaims: claimsResult.count || 0,
        resolvedItems: resolvedItems.count || 0,
        activeUsers: usersResult.count || 0,
      }
    } catch (error) {
      return {
        totalReports: 0,
        pendingClaims: 0,
        resolvedItems: 0,
        activeUsers: 0,
      }
    }
  }

  // Delete methods
  static async deleteNotification(notificationId) {
    try {
      const client = initializeSupabase()
      if (!client) {
        throw new Error("Supabase client not available")
      }

      const { error } = await client.from("notifications").delete().eq("id", notificationId)
      return { error }
    } catch (error) {
      return { error: error.message }
    }
  }

  static async deleteAllUserNotifications(userId) {
    try {
      const client = initializeSupabase()
      if (!client) {
        throw new Error("Supabase client not available")
      }

      const { error } = await client.from("notifications").delete().eq("user_id", userId)
      return { error }
    } catch (error) {
      return { error: error.message }
    }
  }

  // New method to delete users
  static async deleteUser(userId) {
    try {
      const client = initializeSupabase()
      if (!client) {
        throw new Error("Supabase client not available")
      }

      // First delete from users table
      const { error: dbError } = await client.from("users").delete().eq("id", userId)

      if (dbError) {
        console.error("Error deleting from users table:", dbError)
      }

      // Then delete from Supabase Auth (requires admin privileges)
      // Note: This requires admin API key, so we'll handle it differently
      // For now, we'll just delete from users table and the auth will remain orphaned

      return { error: dbError }
    } catch (error) {
      return { error: error.message }
    }
  }

  // Image upload method
  static async uploadImage(file, fileName) {
    try {
      const client = initializeSupabase()
      if (!client) {
        throw new Error("Supabase client not available")
      }

      const { data, error } = await client.storage.from("item-images").upload(fileName, file)

      if (error) throw error

      // Get public URL
      const { data: urlData } = client.storage.from("item-images").getPublicUrl(fileName)

      return { data: urlData.publicUrl, error: null }
    } catch (error) {
      return { data: null, error: error.message }
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("Initializing Supabase...")

  // Wait for Supabase to be available
  const checkSupabase = () => {
    if (window.supabase) {
      initializeSupabase()
      console.log("Supabase initialized successfully")
    } else {
      console.log("Waiting for Supabase...")
      setTimeout(checkSupabase, 100)
    }
  }

  checkSupabase()
})

// Export for use in other files
window.DatabaseService = DatabaseService
