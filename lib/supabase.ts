import { createClient } from "@supabase/supabase-js"

// Debug functie voor logging
function debugLog(message: string, data?: any) {
  console.log(`[DEBUG ${new Date().toISOString()}] ${message}`, data || "")
}

// Supabase client voor client-side gebruik (singleton pattern)
let supabaseClient: ReturnType<typeof createClient> | null = null

export const getSupabaseClient = () => {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    console.log("Supabase configuratie:", {
      url: supabaseUrl ? "Aanwezig" : "Ontbreekt",
      key: supabaseAnonKey ? "Aanwezig" : "Ontbreekt",
    })

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Supabase URL of Anon Key ontbreekt. Controleer je omgevingsvariabelen.")
      // Return een dummy client die geen echte operaties uitvoert maar ook geen errors gooit
      return {
        from: () => ({
          select: () => ({ data: [], error: new Error("Supabase niet geconfigureerd") }),
          insert: () => ({ data: null, error: new Error("Supabase niet geconfigureerd") }),
          delete: () => ({ error: new Error("Supabase niet geconfigureerd") }),
        }),
        channel: () => ({
          on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
        }),
      } as any
    }

    try {
      console.log("Supabase client wordt geïnitialiseerd...")
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
      console.log("Supabase client succesvol geïnitialiseerd")
    } catch (error) {
      console.error("Fout bij initialiseren Supabase client:", error)
      return {
        from: () => ({
          select: () => ({ data: [], error: new Error("Supabase initialisatie mislukt") }),
          insert: () => ({ data: null, error: new Error("Supabase initialisatie mislukt") }),
          delete: () => ({ error: new Error("Supabase initialisatie mislukt") }),
        }),
        channel: () => ({
          on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
        }),
      } as any
    }
  }
  return supabaseClient
}

// Type definities
export interface Product {
  id?: string
  name: string
  qrcode: string
  categoryId?: string
}

export interface Category {
  id: string
  name: string
}

export interface RegistrationEntry {
  id?: string
  user: string
  product: string
  location: string
  purpose: string
  timestamp: string
  date: string
  time: string
  qrcode?: string
  created_at?: string
}

// Mock categorieën data voor fallback
const mockCategories: Category[] = [
  { id: "1", name: "Smeermiddelen" },
  { id: "2", name: "Reinigers" },
  { id: "3", name: "Onderhoud" },
]

// ===== PRODUCT FUNCTIONALITEIT =====
export async function fetchProducts() {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false })

    if (error) {
      if (
        error.message.includes('relation "public.products" does not exist') ||
        error.message.includes("does not exist")
      ) {
        console.log("Products table does not exist, using mock data")
        return { data: null, error: { message: "Table does not exist", code: "TABLE_NOT_FOUND" } }
      }
      console.error("Error fetching products:", error)
      return { data: null, error }
    }

    return { data: data || [], error: null }
  } catch (error) {
    console.log("Unexpected error fetching products:", error)
    return { data: null, error: { message: "Unexpected error", code: "UNEXPECTED_ERROR" } }
  }
}

export async function saveProduct(product: Product) {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.from("products").insert([product]).select()

    if (error) {
      if (
        error.message.includes('relation "public.products" does not exist') ||
        error.message.includes("does not exist")
      ) {
        console.log("Products table does not exist, cannot save to database")
        return { data: null, error: { message: "Table does not exist", code: "TABLE_NOT_FOUND" } }
      }
      console.error("Error saving product:", error)
      return { data: null, error }
    }

    return { data: data?.[0] || null, error: null }
  } catch (error) {
    console.log("Unexpected error saving product:", error)
    return { data: null, error: { message: "Unexpected error", code: "UNEXPECTED_ERROR" } }
  }
}

export async function deleteProduct(id: string) {
  debugLog("deleteProduct aangeroepen met ID:", id)
  const supabase = getSupabaseClient()

  try {
    const { error } = await supabase.from("products").delete().eq("id", id)

    if (error) {
      console.error("Error deleting product:", error)
      return { success: false, error }
    }

    debugLog("Product succesvol verwijderd met ID:", id)
    return { success: true, error: null }
  } catch (error) {
    console.error("Onverwachte fout bij verwijderen product:", error)
    return { success: false, error }
  }
}

// ===== GEBRUIKERS FUNCTIONALITEIT =====
export async function fetchUsers() {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.from("users").select("*").order("created_at", { ascending: false })

    if (error) {
      if (
        error.message.includes('relation "public.users" does not exist') ||
        error.message.includes("does not exist")
      ) {
        console.log("Users table does not exist, using mock data")
        return { data: ["Jan Janssen", "Marie Pietersen", "Piet de Vries", "Anna van der Berg"], error: null }
      }
      console.error("Error fetching users:", error)
      return { data: [], error }
    }

    return { data: data?.map((user) => user.name) || [], error: null }
  } catch (error) {
    console.log("Unexpected error fetching users:", error)
    return { data: ["Jan Janssen", "Marie Pietersen", "Piet de Vries", "Anna van der Berg"], error: null }
  }
}

export async function saveUser(name: string) {
  debugLog("saveUser aangeroepen met:", name)
  const supabase = getSupabaseClient()

  try {
    debugLog("Bezig met opslaan van gebruiker...")
    const { data, error } = await supabase.from("users").insert([{ name }]).select()

    if (error) {
      console.error("Database error bij opslaan gebruiker:", error)
      return { data: null, error }
    }

    debugLog("Gebruiker succesvol opgeslagen:", data)
    return { data: data?.[0] || null, error: null }
  } catch (error) {
    console.error("Onverwachte fout bij opslaan gebruiker:", error)
    return { data: null, error }
  }
}

export async function deleteUser(name: string) {
  console.log("deleteUser aangeroepen met:", name)
  const supabase = getSupabaseClient()

  try {
    console.log("Bezig met verwijderen van gebruiker...")
    const { error } = await supabase.from("users").delete().eq("name", name)

    if (error) {
      console.error("Database error bij verwijderen gebruiker:", error)
      return { success: false, error }
    }

    console.log("Gebruiker succesvol verwijderd")
    return { success: true, error: null }
  } catch (error) {
    console.error("Onverwachte fout bij verwijderen gebruiker:", error)
    return { success: false, error }
  }
}

// ===== LOCATIES FUNCTIONALITEIT =====
export async function fetchLocations() {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.from("locations").select("*").order("created_at", { ascending: false })

    if (error) {
      if (
        error.message.includes('relation "public.locations" does not exist') ||
        error.message.includes("does not exist")
      ) {
        console.log("Locations table does not exist, using mock data")
        return { data: ["Kantoor 1.1", "Kantoor 1.2", "Vergaderzaal A", "Warehouse", "Thuis"], error: null }
      }
      console.error("Error fetching locations:", error)
      return { data: [], error }
    }

    return { data: data?.map((location) => location.name) || [], error: null }
  } catch (error) {
    console.log("Unexpected error fetching locations:", error)
    return { data: ["Kantoor 1.1", "Kantoor 1.2", "Vergaderzaal A", "Warehouse", "Thuis"], error: null }
  }
}

export async function saveLocation(name: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("locations").insert([{ name }]).select()

  if (error) {
    console.error("Error saving location:", error)
    return { data: null, error }
  }

  return { data: data?.[0] || null, error: null }
}

export async function deleteLocation(name: string) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from("locations").delete().eq("name", name)

  if (error) {
    console.error("Error deleting location:", error)
    return { success: false, error }
  }

  return { success: true, error: null }
}

// ===== DOELEN FUNCTIONALITEIT =====
export async function fetchPurposes() {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.from("purposes").select("*").order("created_at", { ascending: false })

    if (error) {
      if (
        error.message.includes('relation "public.purposes" does not exist') ||
        error.message.includes("does not exist")
      ) {
        console.log("Purposes table does not exist, using mock data")
        return { data: ["Presentatie", "Thuiswerken", "Reparatie", "Training", "Demonstratie"], error: null }
      }
      console.error("Error fetching purposes:", error)
      return { data: [], error }
    }

    return { data: data?.map((purpose) => purpose.name) || [], error: null }
  } catch (error) {
    console.log("Unexpected error fetching purposes:", error)
    return { data: ["Presentatie", "Thuiswerken", "Reparatie", "Training", "Demonstratie"], error: null }
  }
}

export async function savePurpose(name: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("purposes").insert([{ name }]).select()

  if (error) {
    console.error("Error saving purpose:", error)
    return { data: null, error }
  }

  return { data: data?.[0] || null, error: null }
}

export async function deletePurpose(name: string) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from("purposes").delete().eq("name", name)

  if (error) {
    console.error("Error deleting purpose:", error)
    return { success: false, error }
  }

  return { success: true, error: null }
}

// ===== REGISTRATIES FUNCTIONALITEIT =====
export async function fetchRegistrations() {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.from("registrations").select("*").order("created_at", { ascending: false })

    if (error) {
      if (
        error.message.includes('relation "public.registrations" does not exist') ||
        error.message.includes("does not exist")
      ) {
        console.log("Registrations table does not exist, using mock data")
        return { data: [], error: { message: "Table does not exist", code: "TABLE_NOT_FOUND" } }
      }
      console.error("Error fetching registrations:", error)
      return { data: [], error }
    }

    return { data: data || [], error: null }
  } catch (error) {
    console.log("Unexpected error fetching registrations:", error)
    return { data: [], error: { message: "Unexpected error", code: "UNEXPECTED_ERROR" } }
  }
}

export async function saveRegistration(registration: Omit<RegistrationEntry, "id" | "created_at">) {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.from("registrations").insert([registration]).select()

    if (error) {
      if (
        error.message.includes('relation "public.registrations" does not exist') ||
        error.message.includes("does not exist")
      ) {
        console.log("Registrations table does not exist, cannot save to database")
        return { data: null, error: { message: "Table does not exist", code: "TABLE_NOT_FOUND" } }
      }
      console.error("Error saving registration:", error)
      return { data: null, error }
    }

    return { data: data?.[0] || null, error: null }
  } catch (error) {
    console.log("Unexpected error saving registration:", error)
    return { data: null, error: { message: "Unexpected error", code: "UNEXPECTED_ERROR" } }
  }
}

// ===== CATEGORIEËN FUNCTIONALITEIT =====
export async function fetchCategories() {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.from("categories").select("*").order("name")

    if (error) {
      if (
        error.message.includes('relation "public.categories" does not exist') ||
        error.message.includes("does not exist")
      ) {
        console.log("Categories table does not exist, using mock data")
        return { data: mockCategories, error: null }
      }
      console.error("Error fetching categories:", error)
      return { data: mockCategories, error: null }
    }

    return { data: data || [], error: null }
  } catch (error) {
    console.log("Unexpected error fetching categories:", error)
    return { data: mockCategories, error: null }
  }
}

export async function saveCategory(category: Omit<Category, "id">) {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.from("categories").insert([category]).select().single()

    if (error) {
      if (
        error.message.includes('relation "public.categories" does not exist') ||
        error.message.includes("does not exist")
      ) {
        console.log("Categories table does not exist, using local fallback")
        const newCategory = { ...category, id: Date.now().toString() } as Category
        return { data: newCategory, error: null }
      }
      console.error("Error saving category:", error)
      const newCategory = { ...category, id: Date.now().toString() } as Category
      return { data: newCategory, error: null }
    }

    return { data, error: null }
  } catch (error) {
    console.log("Unexpected error saving category:", error)
    const newCategory = { ...category, id: Date.now().toString() } as Category
    return { data: newCategory, error: null }
  }
}

export async function deleteCategory(id: string) {
  const supabase = getSupabaseClient()
  try {
    const { error } = await supabase.from("categories").delete().eq("id", id)

    if (error) {
      console.error("Error deleting category:", error)
    }

    return { error }
  } catch (error) {
    console.error("Unexpected error deleting category:", error)
    return { error: null }
  }
}

// ===== REALTIME SUBSCRIPTIONS (SAFE FALLBACKS) =====
export function subscribeToUsers(callback: (users: string[]) => void) {
  debugLog("Setting up users subscription")
  const supabase = getSupabaseClient()

  try {
    const subscription = supabase
      .channel("users-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, async (payload) => {
        debugLog("Users change detected:", payload)
        const { data, error } = await fetchUsers()

        if (!error && data) {
          debugLog("Updated users list:", data)
          callback(data)
        }
      })
      .subscribe((status) => {
        debugLog(`Users subscription status: ${status}`)
      })

    return subscription
  } catch (error) {
    console.error("Error setting up users subscription:", error)
    return {
      unsubscribe: () => {},
    }
  }
}

export function subscribeToProducts(callback: (products: Product[]) => void) {
  debugLog("Setting up products subscription")
  const supabase = getSupabaseClient()

  try {
    const subscription = supabase
      .channel("products-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, async (payload) => {
        debugLog("Products change detected:", payload)
        const { data, error } = await fetchProducts()

        if (!error && data) {
          debugLog("Updated products list:", data)
          callback(data)
        }
      })
      .subscribe((status) => {
        debugLog(`Products subscription status: ${status}`)
      })

    return subscription
  } catch (error) {
    console.error("Error setting up products subscription:", error)
    return {
      unsubscribe: () => {},
    }
  }
}

export function subscribeToLocations(callback: (locations: string[]) => void) {
  debugLog("Setting up locations subscription")
  const supabase = getSupabaseClient()

  try {
    const subscription = supabase
      .channel("locations-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "locations" }, async (payload) => {
        debugLog("Locations change detected:", payload)
        const { data, error } = await fetchLocations()

        if (!error && data) {
          debugLog("Updated locations list:", data)
          callback(data)
        }
      })
      .subscribe((status) => {
        debugLog(`Locations subscription status: ${status}`)
      })

    return subscription
  } catch (error) {
    console.error("Error setting up locations subscription:", error)
    return {
      unsubscribe: () => {},
    }
  }
}

export function subscribeToPurposes(callback: (purposes: string[]) => void) {
  debugLog("Setting up purposes subscription")
  const supabase = getSupabaseClient()

  try {
    const subscription = supabase
      .channel("purposes-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "purposes" }, async (payload) => {
        debugLog("Purposes change detected:", payload)
        const { data, error } = await fetchPurposes()

        if (!error && data) {
          debugLog("Updated purposes list:", data)
          callback(data)
        }
      })
      .subscribe((status) => {
        debugLog(`Purposes subscription status: ${status}`)
      })

    return subscription
  } catch (error) {
    console.error("Error setting up purposes subscription:", error)
    return {
      unsubscribe: () => {},
    }
  }
}

export function subscribeToRegistrations(callback: (registrations: RegistrationEntry[]) => void) {
  const supabase = getSupabaseClient()

  try {
    return supabase
      .channel("registrations-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "registrations" }, async () => {
        const { data } = await fetchRegistrations()
        if (data) callback(data)
      })
      .subscribe()
  } catch (error) {
    console.error("Error setting up registrations subscription:", error)
    return {
      unsubscribe: () => {},
    }
  }
}

export function subscribeToCategories(callback: (categories: Category[]) => void) {
  debugLog("Setting up categories subscription")
  const supabase = getSupabaseClient()

  try {
    const subscription = supabase
      .channel("categories-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, async (payload) => {
        debugLog("Categories change detected:", payload)
        const { data, error } = await fetchCategories()

        if (!error && data) {
          debugLog("Updated categories list:", data)
          callback(data)
        }
      })
      .subscribe((status) => {
        debugLog(`Categories subscription status: ${status}`)
      })

    return subscription
  } catch (error) {
    console.error("Error setting up categories subscription:", error)
    return {
      unsubscribe: () => {},
    }
  }
}
