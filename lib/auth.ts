import { createClient } from "@supabase/supabase-js"

// Supabase client voor authenticatie
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types
export interface User {
  id: string
  email: string
  name?: string
  role?: string
}

/**
 * Signs in with email and password
 */
export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  } catch (error) {
    console.error("Error signing in:", error)
    return { data: null, error }
  }
}

/**
 * Signs out the current user
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    return { error }
  } catch (error) {
    console.error("Error signing out:", error)
    return { error }
  }
}

/**
 * Gets the current authenticated user
 */
export async function getCurrentUser() {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error || !session?.user) {
      return null
    }

    const user = session.user
    return {
      id: user.id,
      email: user.email || "",
      name: user.user_metadata?.name || user.email?.split("@")[0] || "User",
      role: user.user_metadata?.role || "user",
    }
  } catch (error) {
    console.error("Error getting current user:", error)
    return null
  }
}

/**
 * Sets up a subscription to auth state changes
 */
export function onAuthStateChange(callback: (user: any) => void) {
  return supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      const user = {
        id: session.user.id,
        email: session.user.email || "",
        name: session.user.user_metadata?.name || session.user.email?.split("@")[0] || "User",
        role: session.user.user_metadata?.role || "user",
      }
      callback(user)
    } else {
      callback(null)
    }
  })
}

/**
 * Signs up a new user
 */
export async function signUpWithPassword(email: string, password: string, name?: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || email.split("@")[0],
        },
      },
    })

    if (error) {
      throw error
    }

    return { user: data.user, error: null }
  } catch (error) {
    console.error("Error signing up:", error)
    return { user: null, error }
  }
}
