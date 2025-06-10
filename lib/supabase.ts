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
      // Check if it's a "relation does not exist" error
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

// ===== REGISTRATIES FUNCTIONALITEIT =====
export async function fetchRegistrations() {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.from("registrations").select("*").order("created_at", { ascending: false })

    if (error) {
      // Check if it's a "relation does not exist" error
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
      // Check if it's a "relation does not exist" error
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
