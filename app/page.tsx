"use client"

import { useState, useEffect, useRef } from "react"
import type React from "react"
import {
  fetchProducts,
  saveProduct,
  updateProduct as updateProductInDB,
  deleteProduct,
  fetchUsers,
  saveUser,
  deleteUser,
  fetchLocations,
  saveLocation,
  deleteLocation,
  fetchPurposes,
  savePurpose,
  deletePurpose,
  fetchRegistrations,
  saveRegistration,
  subscribeToProducts,
  subscribeToUsers,
  subscribeToLocations,
  subscribeToPurposes,
  subscribeToRegistrations,
  fetchCategories,
  saveCategory,
  deleteCategory,
  type Category,
  type Product,
  type RegistrationEntry,
} from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Download, Search, X, Plus, Trash2, Edit } from "lucide-react"

// Voeg deze imports toe voor de charts
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

import { getCurrentUser, onAuthStateChange, signOut, LoginForm } from "@/lib/auth"

export default function ProductRegistrationApp() {
  const [currentUser, setCurrentUser] = useState("")
  const [selectedProduct, setSelectedProduct] = useState("")
  const [location, setLocation] = useState("")
  const [purpose, setPurpose] = useState("")
  const [entries, setEntries] = useState<RegistrationEntry[]>([])
  const [showSuccess, setShowSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const [user, setUser] = useState<any>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)

  // Beheer states
  const [users, setUsers] = useState<string[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [locations, setLocations] = useState<string[]>([])
  const [purposes, setPurposes] = useState<string[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  // Nieuwe item states
  const [newUserName, setNewUserName] = useState("")
  const [newProductName, setNewProductName] = useState("")
  const [newProductQrCode, setNewProductQrCode] = useState("")
  const [newProductCategory, setNewProductCategory] = useState("none")
  const [newLocationName, setNewLocationName] = useState("")
  const [newPurposeName, setNewPurposeName] = useState("")
  const [newCategoryName, setNewCategoryName] = useState("")

  // QR Scanner states
  const [showQrScanner, setShowQrScanner] = useState(false)
  const [qrScanResult, setQrScanResult] = useState("")
  const [qrScanMode, setQrScanMode] = useState<"registration" | "product-management">("registration")
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Import states
  const [importMessage, setImportMessage] = useState("")
  const [importError, setImportError] = useState("")
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "error">("connecting")
  const userFileInputRef = useRef<HTMLInputElement>(null)
  const productFileInputRef = useRef<HTMLInputElement>(null)
  const locationFileInputRef = useRef<HTMLInputElement>(null)
  const purposeFileInputRef = useRef<HTMLInputElement>(null)

  // Filter en zoek states
  const [searchQuery, setSearchQuery] = useState("")
  const [filterUser, setFilterUser] = useState("all")
  const [filterProduct, setFilterProduct] = useState("")
  const [filterLocation, setFilterLocation] = useState("all")
  const [filterDateFrom, setFilterDateFrom] = useState("")
  const [filterDateTo, setFilterDateTo] = useState("")
  const [sortBy, setSortBy] = useState<"date" | "user" | "product">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)

  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [showEditCategoryDialog, setShowEditCategoryDialog] = useState(false)

  // Laad alle data bij start
  useEffect(() => {
    loadAllData()
    setupRealtimeSubscriptions()
  }, [])

  // Cleanup camera stream when component unmounts
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop())
      }
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current)
      }
    }
  }, [cameraStream])

  // Authentication check
  useEffect(() => {
    const checkUser = async () => {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
      setIsAuthLoading(false)
    }

    checkUser()

    const {
      data: { subscription },
    } = onAuthStateChange((user) => {
      setUser(user)
      setIsAuthLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadAllData = async () => {
    try {
      setConnectionStatus("connecting")

      const [usersResult, productsResult, categoriesResult, locationsResult, purposesResult, registrationsResult] =
        await Promise.all([
          fetchUsers(),
          fetchProducts(),
          fetchCategories(),
          fetchLocations(),
          fetchPurposes(),
          fetchRegistrations(),
        ])

      if (usersResult.data) {
        setUsers(usersResult.data)
        if (usersResult.data.length > 0 && !currentUser) {
          setCurrentUser(usersResult.data[0])
        }
      }

      if (productsResult.data) setProducts(productsResult.data)
      if (locationsResult.data) setLocations(locationsResult.data)
      if (purposesResult.data) setPurposes(purposesResult.data)
      if (categoriesResult.data) setCategories(categoriesResult.data)
      if (registrationsResult.data) setEntries(registrationsResult.data)

      setConnectionStatus("connected")
      setImportMessage("✅ Verbonden met database - alle data gesynchroniseerd!")
      setTimeout(() => setImportMessage(""), 3000)
    } catch (error) {
      console.error("Error loading data:", error)
      setConnectionStatus("error")
      setImportError(`❌ Fout bij verbinden met database: ${error instanceof Error ? error.message : "Onbekende fout"}`)
    }
  }

  const setupRealtimeSubscriptions = () => {
    console.log("Setting up realtime subscriptions...")

    try {
      const unsubscribeProducts = subscribeToProducts((updatedProducts) => {
        console.log("Products subscription update received:", updatedProducts.length)
        setProducts(updatedProducts)
      })

      const unsubscribeUsers = subscribeToUsers((updatedUsers) => {
        console.log("Users subscription update received:", updatedUsers.length)
        setUsers(updatedUsers)
      })

      const unsubscribeLocations = subscribeToLocations((updatedLocations) => {
        console.log("Locations subscription update received:", updatedLocations.length)
        setLocations(updatedLocations)
      })

      const unsubscribePurposes = subscribeToPurposes((updatedPurposes) => {
        console.log("Purposes subscription update received:", updatedPurposes.length)
        setPurposes(updatedPurposes)
      })

      const unsubscribeRegistrations = subscribeToRegistrations((updatedRegistrations) => {
        console.log("Registrations subscription update received:", updatedRegistrations.length)
        setEntries(updatedRegistrations)
      })

      console.log("All realtime subscriptions set up successfully")

      return () => {
        console.log("Cleaning up subscriptions...")
        if (unsubscribeProducts) unsubscribeProducts.unsubscribe()
        if (unsubscribeUsers) unsubscribeUsers.unsubscribe()
        if (unsubscribeLocations) unsubscribeLocations.unsubscribe()
        if (unsubscribePurposes) unsubscribePurposes.unsubscribe()
        if (unsubscribeRegistrations) unsubscribeRegistrations.unsubscribe()
      }
    } catch (error) {
      console.error("Error setting up realtime subscriptions:", error)
      setImportError("Fout bij het opzetten van realtime updates. Vernieuw de pagina om het opnieuw te proberen.")
      return () => {}
    }
  }

  // Eenvoudige QR code detectie functie
  const detectQRCode = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context || video.videoWidth === 0 || video.videoHeight === 0) return

    // Set canvas size to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Get image data
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

    // Hier zou normaal een QR code library gebruikt worden
    // Voor nu simuleren we QR code detectie door te kijken naar donkere pixels
    // Dit is een zeer eenvoudige implementatie

    // In een echte implementatie zou je een library zoals jsQR gebruiken:
    // const code = jsQR(imageData.data, imageData.width, imageData.height)
    // if (code) {
    //   handleQrCodeDetected(code.data)
    // }
  }

  const startQrScanner = async () => {
    try {
      console.log("Starting QR scanner...")

      // Toon eerst de modal
      setShowQrScanner(true)
      setIsScanning(true)

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.log("Camera not supported, showing manual input")
        setIsScanning(false)
        return
      }

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      })

      console.log("Camera stream obtained:", stream)
      setCameraStream(stream)

      // Wait for video element to be available
      setTimeout(() => {
        if (videoRef.current && stream) {
          console.log("Setting video source...")
          videoRef.current.srcObject = stream
          videoRef.current
            .play()
            .then(() => {
              // Start scanning for QR codes
              scanIntervalRef.current = setInterval(detectQRCode, 500) // Scan every 500ms
            })
            .catch(console.error)
        }
      }, 100)
    } catch (error) {
      console.error("Camera error:", error)
      setIsScanning(false)
      // Modal is already open, just show manual input option
    }
  }

  const stopQrScanner = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop())
      setCameraStream(null)
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    setShowQrScanner(false)
    setIsScanning(false)
  }

  const scanQrCode = () => {
    const qrInput = prompt("Voer QR code in:")
    if (qrInput && qrInput.trim()) {
      handleQrCodeDetected(qrInput.trim())
    }
  }

  const handleQrCodeDetected = (qrCode: string) => {
    console.log("QR Code detected:", qrCode)
    setQrScanResult(qrCode)

    if (qrScanMode === "registration") {
      const foundProduct = products.find((p) => p.qrcode === qrCode)

      if (foundProduct) {
        setSelectedProduct(foundProduct.name)
        setImportMessage(`✅ Product gevonden: ${foundProduct.name}`)
        setTimeout(() => setImportMessage(""), 3000)
      } else {
        setImportError(`❌ Geen product gevonden voor QR code: ${qrCode}`)
        setTimeout(() => setImportError(""), 3000)
      }
    } else if (qrScanMode === "product-management") {
      setNewProductQrCode(qrCode)
      setImportMessage(`✅ QR code gescand: ${qrCode}`)
      setTimeout(() => setImportMessage(""), 3000)
    }

    stopQrScanner()
  }

  const handleFileImport = async (file: File, type: "users" | "products" | "locations" | "purposes") => {
    try {
      setImportError("")
      setImportMessage("Bestand wordt verwerkt...")

      const text = await file.text()
      let items: string[] = []

      if (file.name.endsWith(".csv")) {
        const lines = text.split("\n").filter((line) => line.trim())

        if (type === "products") {
          const newProducts: Product[] = []
          lines.forEach((line) => {
            const [name, qrcode] = line.split(",").map((item) => item.replace(/"/g, "").trim())
            if (name && qrcode) {
              newProducts.push({ name, qrcode })
            }
          })

          if (newProducts.length > 0) {
            for (const product of newProducts) {
              await saveProduct(product)
            }
            setImportMessage(`✅ ${newProducts.length} nieuwe producten geïmporteerd!`)
            setTimeout(() => setImportMessage(""), 5000)
          }
          return
        } else {
          items = lines
            .map((line) => line.split(",")[0].replace(/"/g, "").trim())
            .filter((item) => item && item.length > 0)
        }
      } else {
        items = text
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line && line.length > 0)
      }

      if (items.length === 0) {
        setImportError("Geen geldige items gevonden in het bestand")
        return
      }

      let savedCount = 0
      for (const item of items) {
        try {
          switch (type) {
            case "users":
              if (!users.includes(item)) {
                await saveUser(item)
                savedCount++
              }
              break
            case "locations":
              if (!locations.includes(item)) {
                await saveLocation(item)
                savedCount++
              }
              break
            case "purposes":
              if (!purposes.includes(item)) {
                await savePurpose(item)
                savedCount++
              }
              break
          }
        } catch (error) {
          console.error(`Error saving ${item}:`, error)
        }
      }

      setImportMessage(
        `✅ ${savedCount} nieuwe ${type} geïmporteerd! (${items.length - savedCount} duplicaten overgeslagen)`,
      )

      if (type === "users" && userFileInputRef.current) userFileInputRef.current.value = ""
      if (type === "products" && productFileInputRef.current) productFileInputRef.current.value = ""
      if (type === "locations" && locationFileInputRef.current) locationFileInputRef.current.value = ""
      if (type === "purposes" && purposeFileInputRef.current) purposeFileInputRef.current.value = ""

      setTimeout(() => setImportMessage(""), 5000)
    } catch (error) {
      setImportError(`Fout bij importeren: ${error instanceof Error ? error.message : "Onbekende fout"}`)
      setTimeout(() => setImportError(""), 5000)
    }
  }

  const exportTemplate = (type: "users" | "products" | "locations" | "purposes") => {
    let templateData: string[] = []
    let filename = ""

    switch (type) {
      case "users":
        templateData = ["Jan Janssen", "Marie Pietersen", "Piet de Vries", "Anna van der Berg", "Nieuwe Gebruiker"]
        filename = "gebruikers-template.csv"
        break
      case "products":
        templateData = [
          "Laptop Dell XPS,DELL-XPS-001",
          "Monitor Samsung 24,SAM-MON-002",
          "Muis Logitech,LOG-MOU-003",
          "Toetsenbord Mechanical,MECH-KEY-004",
          "Nieuw Product,NEW-PROD-005",
        ]
        filename = "producten-template.csv"
        break
      case "locations":
        templateData = ["Kantoor 1.1", "Kantoor 1.2", "Vergaderzaal A", "Warehouse", "Thuis", "Nieuwe Locatie"]
        filename = "locaties-template.csv"
        break
      case "purposes":
        templateData = ["Presentatie", "Thuiswerken", "Reparatie", "Training", "Demonstratie", "Nieuw Doel"]
        filename = "doelen-template.csv"
        break
    }

    const csvContent = templateData.join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", filename)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentUser || !selectedProduct || !location || !purpose) {
      return
    }

    setIsLoading(true)

    try {
      const now = new Date()
      const productQrcode = products.find((p) => p.name === selectedProduct)?.qrcode || ""

      const newEntry: Omit<RegistrationEntry, "id" | "created_at"> = {
        user: currentUser,
        product: selectedProduct,
        location,
        purpose,
        timestamp: now.toISOString(),
        date: now.toLocaleDateString("nl-NL"),
        time: now.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }),
        qrcode: productQrcode,
      }

      const result = await saveRegistration(newEntry)

      if (result.data) {
        console.log("Registratie direct toevoegen aan lijst:", result.data)
        setEntries((prevEntries) => [result.data, ...prevEntries])

        setSelectedProduct("")
        setLocation("")
        setPurpose("")
        setQrScanResult("")

        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 3000)
      } else {
        setImportError("Fout bij opslaan registratie")
      }
    } catch (error) {
      console.error("Error saving registration:", error)
      setImportError("Fout bij opslaan registratie")
    }

    setIsLoading(false)
  }

  const exportToCSV = () => {
    const filteredEntries = getFilteredAndSortedEntries()
    const headers = ["Datum", "Tijd", "Gebruiker", "Product", "QR Code", "Locatie", "Doel"]
    const csvContent = [
      headers.join(","),
      ...filteredEntries.map((entry) =>
        [
          entry.date,
          entry.time,
          `"${entry.user}"`,
          `"${entry.product}"`,
          `"${entry.qrcode || ""}"`,
          `"${entry.location}"`,
          `"${entry.purpose}"`,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)

    const filterSuffix =
      searchQuery || filterUser !== "all" || filterProduct || filterLocation !== "all" ? "-gefilterd" : ""
    link.setAttribute("download", `product-registraties${filterSuffix}-${new Date().toISOString().split("T")[0]}.csv`)

    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const addNewUser = async () => {
    if (newUserName.trim() && !users.includes(newUserName.trim())) {
      try {
        console.log("addNewUser functie aangeroepen voor:", newUserName.trim())
        const result = await saveUser(newUserName.trim())

        if (result.error) {
          console.error("Fout bij toevoegen gebruiker:", result.error)
          setImportError(`Fout bij toevoegen gebruiker: ${result.error.message || "Onbekende fout"}`)
          setTimeout(() => setImportError(""), 5000)
        } else {
          if (result.data) {
            console.log("Gebruiker direct toevoegen aan lijst:", result.data)
            setUsers((prevUsers) => [...prevUsers, newUserName.trim()])
          }

          setNewUserName("")
          setImportMessage("✅ Gebruiker toegevoegd!")
          setTimeout(() => setImportMessage(""), 2000)
        }
      } catch (error) {
        console.error("Onverwachte fout bij toevoegen gebruiker:", error)
        setImportError(`Onverwachte fout: ${error instanceof Error ? error.message : "Onbekende fout"}`)
        setTimeout(() => setImportError(""), 5000)
      }
    }
  }

  const addNewProduct = async () => {
    if (newProductName.trim()) {
      try {
        const qrcode = newProductQrCode.trim() || ""
        const categoryId = newProductCategory === "none" ? undefined : newProductCategory
        const existingProduct = products.find(
          (p) => p.name === newProductName.trim() || (qrcode && p.qrcode === qrcode),
        )
        if (!existingProduct) {
          console.log("addNewProduct aangeroepen voor:", newProductName.trim())
          const result = await saveProduct({
            name: newProductName.trim(),
            qrcode,
            categoryId,
          })

          if (result.error) {
            console.error("Fout bij toevoegen product:", result.error)
            setImportError(`Fout bij toevoegen product: ${result.error.message || "Onbekende fout"}`)
          } else {
            if (result.data) {
              console.log("Product direct toevoegen aan lijst:", result.data)
              setProducts((prevProducts) => [result.data, ...prevProducts])
            }

            setNewProductName("")
            setNewProductQrCode("")
            setNewProductCategory("none")
            setImportMessage("✅ Product toegevoegd!")
            setTimeout(() => setImportMessage(""), 2000)
          }
        }
      } catch (error) {
        console.error("Onverwachte fout bij toevoegen product:", error)
        setImportError("Fout bij toevoegen product")
      }
    }
  }

  const updateProduct = async () => {
    console.log("updateProduct functie wordt aangeroepen!")

    if (editingProduct && editingProduct.id) {
      try {
        console.log("Bezig met bijwerken van product:", editingProduct)

        // Update lokaal eerst voor directe feedback
        setProducts((prevProducts) => prevProducts.map((p) => (p.id === editingProduct.id ? editingProduct : p)))

        // Toon direct een bericht dat het product is bijgewerkt
        setImportMessage("✅ Product bijgewerkt!")
        setShowEditDialog(false)
        setEditingProduct(null)

        // Probeer daarna de database bij te werken
        const result = await updateProductInDB(editingProduct.id, {
          name: editingProduct.name,
          qrcode: editingProduct.qrcode,
          categoryId: editingProduct.categoryId === "none" ? undefined : editingProduct.categoryId,
        })

        if (result.error && result.error.code !== "TABLE_NOT_FOUND") {
          console.error("Fout bij bijwerken product in database:", result.error)
          setImportMessage("⚠️ Product lokaal bijgewerkt (database niet beschikbaar)")
        }

        setTimeout(() => setImportMessage(""), 2000)
      } catch (error) {
        console.error("Fout bij bijwerken product:", error)
        setImportError("Fout bij bijwerken product")
        setTimeout(() => setImportError(""), 2000)
      }
    } else {
      console.error("Geen geldig product om bij te werken")
    }
  }

  const addNewLocation = async () => {
    if (newLocationName.trim() && !locations.includes(newLocationName.trim())) {
      try {
        console.log("addNewLocation aangeroepen voor:", newLocationName.trim())
        const result = await saveLocation(newLocationName.trim())

        if (result.error) {
          console.error("Fout bij toevoegen locatie:", result.error)
          setImportError(`Fout bij toevoegen locatie: ${result.error.message || "Onbekende fout"}`)
        } else {
          if (result.data) {
            console.log("Locatie direct toevoegen aan lijst:", result.data)
            setLocations((prevLocations) => [newLocationName.trim(), ...prevLocations])
          }

          setNewLocationName("")
          setImportMessage("✅ Locatie toegevoegd!")
          setTimeout(() => setImportMessage(""), 2000)
        }
      } catch (error) {
        console.error("Onverwachte fout bij toevoegen locatie:", error)
        setImportError("Fout bij toevoegen locatie")
      }
    }
  }

  const addNewPurpose = async () => {
    if (newPurposeName.trim() && !purposes.includes(newPurposeName.trim())) {
      try {
        console.log("addNewPurpose aangeroepen voor:", newPurposeName.trim())
        const result = await savePurpose(newPurposeName.trim())

        if (result.error) {
          console.error("Fout bij toevoegen doel:", result.error)
          setImportError(`Fout bij toevoegen doel: ${result.error.message || "Onbekende fout"}`)
        } else {
          if (result.data) {
            console.log("Doel direct toevoegen aan lijst:", result.data)
            setPurposes((prevPurposes) => [newPurposeName.trim(), ...prevPurposes])
          }

          setNewPurposeName("")
          setImportMessage("✅ Doel toegevoegd!")
          setTimeout(() => setImportMessage(""), 2000)
        }
      } catch (error) {
        console.error("Onverwachte fout bij toevoegen doel:", error)
        setImportError("Fout bij toevoegen doel")
      }
    }
  }

  const removeUser = async (userToRemove: string) => {
    try {
      console.log("removeUser functie aangeroepen voor:", userToRemove)
      const result = await deleteUser(userToRemove)

      if (result.error) {
        console.error("Fout bij verwijderen gebruiker:", result.error)
        setImportError(`Fout bij verwijderen gebruiker: ${result.error.message || "Onbekende fout"}`)
        setTimeout(() => setImportError(""), 5000)
      } else {
        console.log("Gebruiker direct verwijderen uit lijst:", userToRemove)
        setUsers((prevUsers) => prevUsers.filter((u) => u !== userToRemove))

        setImportMessage("✅ Gebruiker verwijderd!")
        setTimeout(() => setImportMessage(""), 2000)
      }
    } catch (error) {
      console.error("Onverwachte fout bij verwijderen gebruiker:", error)
      setImportError(`Onverwachte fout: ${error instanceof Error ? error.message : "Onbekende fout"}`)
      setTimeout(() => setImportError(""), 5000)
    }
  }

  const removeProduct = async (productToRemove: Product) => {
    try {
      if (productToRemove.id) {
        console.log("removeProduct aangeroepen voor:", productToRemove)
        const result = await deleteProduct(productToRemove.id)

        if (result.error) {
          console.error("Fout bij verwijderen product:", result.error)
          setImportError(`Fout bij verwijderen product: ${result.error.message || "Onbekende fout"}`)
        } else {
          console.log("Product direct verwijderen uit lijst:", productToRemove.id)
          setProducts((prevProducts) => prevProducts.filter((p) => p.id !== productToRemove.id))

          setImportMessage("✅ Product verwijderd!")
          setTimeout(() => setImportMessage(""), 2000)
        }
      }
    } catch (error) {
      console.error("Onverwachte fout bij verwijderen product:", error)
      setImportError("Fout bij verwijderen product")
    }
  }

  const removeLocation = async (locationToRemove: string) => {
    try {
      console.log("removeLocation aangeroepen voor:", locationToRemove)
      const result = await deleteLocation(locationToRemove)

      if (result.error) {
        console.error("Fout bij verwijderen locatie:", result.error)
        setImportError(`Fout bij verwijderen locatie: ${result.error.message || "Onbekende fout"}`)
      } else {
        console.log("Locatie direct verwijderen uit lijst:", locationToRemove)
        setLocations((prevLocations) => prevLocations.filter((l) => l !== locationToRemove))

        setImportMessage("✅ Locatie verwijderd!")
        setTimeout(() => setImportMessage(""), 2000)
      }
    } catch (error) {
      console.error("Fout bij verwijderen locatie:", error)
      setImportError("Fout bij verwijderen locatie")
    }
  }

  const removePurpose = async (purposeToRemove: string) => {
    try {
      console.log("removePurpose aangeroepen voor:", purposeToRemove)
      const result = await deletePurpose(purposeToRemove)

      if (result.error) {
        console.error("Fout bij verwijderen doel:", result.error)
        setImportError(`Fout bij verwijderen doel: ${result.error.message || "Onbekende fout"}`)
      } else {
        console.log("Doel direct verwijderen uit lijst:", purposeToRemove)
        setPurposes((prevPurposes) => prevPurposes.filter((p) => p !== purposeToRemove))

        setImportMessage("✅ Doel verwijderd!")
        setTimeout(() => setImportMessage(""), 2000)
      }
    } catch (error) {
      console.error("Fout bij verwijderen doel:", error)
      setImportError("Fout bij verwijderen doel")
    }
  }

  const addNewCategory = async () => {
    if (newCategoryName.trim() && !categories.find((c) => c.name === newCategoryName.trim())) {
      try {
        console.log("addNewCategory aangeroepen voor:", newCategoryName.trim())
        const result = await saveCategory({ name: newCategoryName.trim() })

        if (result.error) {
          console.error("Fout bij toevoegen categorie:", result.error)
          setImportError(`Fout bij toevoegen categorie: ${result.error.message || "Onbekende fout"}`)
        } else {
          if (result.data) {
            console.log("Categorie direct toevoegen aan lijst:", result.data)
            setCategories((prevCategories) => [...prevCategories, result.data])
          }

          setNewCategoryName("")
          setImportMessage("✅ Categorie toegevoegd!")
          setTimeout(() => setImportMessage(""), 2000)
        }
      } catch (error) {
        console.error("Onverwachte fout bij toevoegen categorie:", error)
        setImportError("Fout bij toevoegen categorie")
      }
    }
  }

  const updateCategory = async () => {
    if (editingCategory && editingCategory.id) {
      try {
        console.log("updateCategory aangeroepen voor:", editingCategory)

        // Update lokaal eerst
        setCategories((prevCategories) =>
          prevCategories.map((c) => (c.id === editingCategory.id ? editingCategory : c)),
        )

        setEditingCategory(null)
        setShowEditCategoryDialog(false)
        setImportMessage("✅ Categorie bijgewerkt!")
        setTimeout(() => setImportMessage(""), 2000)
      } catch (error) {
        console.error("Fout bij bijwerken categorie:", error)
        setImportError("Fout bij bijwerken categorie")
      }
    }
  }

  const removeCategory = async (categoryId: string) => {
    try {
      console.log("removeCategory aangeroepen voor:", categoryId)
      const result = await deleteCategory(categoryId)

      if (result.error) {
        console.error("Fout bij verwijderen categorie:", result.error)
        setImportError(`Fout bij verwijderen categorie: ${result.error.message || "Onbekende fout"}`)
      } else {
        console.log("Categorie direct verwijderen uit lijst:", categoryId)
        setCategories((prevCategories) => prevCategories.filter((c) => c.id !== categoryId))

        setImportMessage("✅ Categorie verwijderd!")
        setTimeout(() => setImportMessage(""), 2000)
      }
    } catch (error) {
      console.error("Fout bij verwijderen categorie:", error)
      setImportError("Fout bij verwijderen categorie")
    }
  }

  const getFilteredAndSortedEntries = () => {
    const filtered = entries.filter((entry) => {
      const searchMatch =
        !searchQuery ||
        entry.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (entry.qrcode && entry.qrcode.toLowerCase().includes(searchQuery.toLowerCase()))

      const userMatch = !filterUser || filterUser === "all" || entry.user === filterUser
      const productMatch = !filterProduct || entry.product.toLowerCase().includes(filterProduct.toLowerCase())
      const locationMatch = !filterLocation || filterLocation === "all" || entry.location === filterLocation

      let dateMatch = true
      if (filterDateFrom || filterDateTo) {
        const entryDate = new Date(entry.timestamp)
        if (filterDateFrom) {
          const fromDate = new Date(filterDateFrom)
          dateMatch = dateMatch && entryDate >= fromDate
        }
        if (filterDateTo) {
          const toDate = new Date(filterDateTo + "T23:59:59")
          dateMatch = dateMatch && entryDate <= toDate
        }
      }

      return searchMatch && userMatch && productMatch && locationMatch && dateMatch
    })

    filtered.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case "date":
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          break
        case "user":
          comparison = a.user.localeCompare(b.user)
          break
        case "product":
          comparison = a.product.localeCompare(b.product)
          break
      }

      return sortOrder === "asc" ? comparison : -comparison
    })

    return filtered
  }

  const clearAllFilters = () => {
    setSearchQuery("")
    setFilterUser("all")
    setFilterProduct("")
    setFilterLocation("all")
    setFilterDateFrom("")
    setFilterDateTo("")
    setSortBy("date")
    setSortOrder("desc")
  }

  const calculateStatistics = () => {
    const totalRegistrations = entries.length
    const uniqueUsers = new Set(entries.map((entry) => entry.user)).size
    const uniqueProducts = new Set(entries.map((entry) => entry.product)).size

    const userCounts: Record<string, number> = {}
    entries.forEach((entry) => {
      userCounts[entry.user] = (userCounts[entry.user] || 0) + 1
    })
    const topUsers = Object.entries(userCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    const productCounts: Record<string, number> = {}
    entries.forEach((entry) => {
      productCounts[entry.product] = (productCounts[entry.product] || 0) + 1
    })
    const topProducts = Object.entries(productCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    const locationCounts: Record<string, number> = {}
    entries.forEach((entry) => {
      locationCounts[entry.location] = (locationCounts[entry.location] || 0) + 1
    })
    const topLocations = Object.entries(locationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    const recentActivity = [...entries]
      .sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      })
      .slice(0, 10)

    return {
      totalRegistrations,
      uniqueUsers,
      uniqueProducts,
      topUsers,
      topProducts,
      topLocations,
      recentActivity,
    }
  }

  const handleLogout = async () => {
    await signOut()
    setUser(null)
  }

  const stats = calculateStatistics()

  // Show loading while checking authentication
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Laden...</p>
        </div>
      </div>
    )
  }

  // Show login form if not authenticated
  if (!user) {
    return <LoginForm onLogin={() => setUser(user)} />
  }

  // Show main app if authenticated
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with logout button */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4 sm:gap-6">
            <div className="flex flex-col lg:flex-row items-center gap-6">
              <div className="flex-shrink-0">
                <div className="flex items-center bg-white p-4 rounded-lg shadow-sm border">
                  <div className="w-1 h-12 bg-amber-500 mr-4"></div>
                  <div className="text-2xl font-bold text-gray-800 tracking-wide">DEMATIC</div>
                </div>
              </div>

              <div className="hidden lg:block w-px h-16 bg-gray-300"></div>

              <div className="text-center lg:text-left">
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Product Registratie</h1>
                <p className="text-sm lg:text-base text-gray-600 mt-1">Registreer product gebruik en locatie</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    connectionStatus === "connected"
                      ? "bg-green-500"
                      : connectionStatus === "connecting"
                        ? "bg-yellow-500"
                        : "bg-red-500"
                  }`}
                ></div>
                <span>
                  {connectionStatus === "connected"
                    ? "Database verbonden"
                    : connectionStatus === "connecting"
                      ? "Verbinden..."
                      : "Verbindingsfout"}
                </span>
              </div>
              <div className="hidden md:block">{entries.length} registraties</div>
              <div className="flex items-center gap-2">
                <span>Ingelogd als: {user.email}</span>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  Uitloggen
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Rest of your existing app content */}
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
        {showSuccess && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">✅ Product succesvol geregistreerd!</AlertDescription>
          </Alert>
        )}

        {importMessage && (
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <AlertDescription className="text-blue-800">{importMessage}</AlertDescription>
          </Alert>
        )}

        {importError && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">{importError}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="register" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 bg-white border border-gray-200 shadow-sm">
            <TabsTrigger
              value="register"
              className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700"
            >
              Registreren
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700">
              Geschiedenis ({entries.length})
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700">
              Gebruikers ({users.length})
            </TabsTrigger>
            <TabsTrigger
              value="products"
              className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700"
            >
              Producten ({products.length})
            </TabsTrigger>
            <TabsTrigger
              value="categories"
              className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700"
            >
              Categorieën ({categories.length})
            </TabsTrigger>
            <TabsTrigger
              value="locations"
              className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700"
            >
              Locaties ({locations.length})
            </TabsTrigger>
            <TabsTrigger
              value="purposes"
              className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700"
            >
              Doelen ({purposes.length})
            </TabsTrigger>
            <TabsTrigger
              value="statistics"
              className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700"
            >
              Statistieken
            </TabsTrigger>
          </TabsList>

          <TabsContent value="register">
            <Card className="shadow-sm">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
                <CardTitle className="flex items-center gap-2 text-xl">📦 Nieuw Product Registreren</CardTitle>
                <CardDescription>Scan een QR code of vul onderstaande gegevens handmatig in</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 sm:gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm sm:text-base font-medium">👤 Gebruiker</Label>
                      <Select value={currentUser} onValueChange={setCurrentUser} required>
                        <SelectTrigger className="h-10 sm:h-12">
                          <SelectValue placeholder="Selecteer gebruiker" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user} value={user}>
                              {user}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm sm:text-base font-medium">📦 Product</Label>
                      <div className="flex gap-2">
                        <Select value={selectedProduct} onValueChange={setSelectedProduct} required>
                          <SelectTrigger className="h-10 sm:h-12 flex-1">
                            <SelectValue placeholder="Selecteer een product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.name}>
                                {product.name} {product.qrcode && `(${product.qrcode})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          onClick={() => {
                            setQrScanMode("registration")
                            startQrScanner()
                          }}
                          className="h-10 sm:h-12 px-4 bg-blue-600 hover:bg-blue-700"
                          disabled={showQrScanner}
                        >
                          📱 Scan QR
                        </Button>
                      </div>
                      {qrScanResult && <p className="text-sm text-green-600">✅ QR Code gescand: {qrScanResult}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm sm:text-base font-medium">📍 Locatie</Label>
                      <Select value={location} onValueChange={setLocation} required>
                        <SelectTrigger className="h-10 sm:h-12">
                          <SelectValue placeholder="Selecteer een locatie" />
                        </SelectTrigger>
                        <SelectContent>
                          {locations.map((loc) => (
                            <SelectItem key={loc} value={loc}>
                              {loc}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm sm:text-base font-medium">🎯 Doel</Label>
                      <Select value={purpose} onValueChange={setPurpose} required>
                        <SelectTrigger className="h-10 sm:h-12">
                          <SelectValue placeholder="Selecteer een doel" />
                        </SelectTrigger>
                        <SelectContent>
                          {purposes.map((purposeItem) => (
                            <SelectItem key={purposeItem} value={purposeItem}>
                              {purposeItem}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-amber-600 hover:bg-amber-700 h-12 sm:h-14 text-base sm:text-lg font-medium"
                    disabled={isLoading || connectionStatus !== "connected"}
                  >
                    {isLoading ? "Bezig met registreren..." : "💾 Product Registreren"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="shadow-sm">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
                <CardTitle className="flex items-center gap-2 text-xl">📋 Registratie Geschiedenis</CardTitle>
                <CardDescription>Bekijk en filter alle product registraties</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1">
                        <Label htmlFor="search" className="text-sm font-medium mb-1 block">
                          Zoeken
                        </Label>
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                          <Input
                            id="search"
                            type="text"
                            placeholder="Zoek op naam, product, locatie..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8"
                          />
                        </div>
                      </div>
                      <div className="w-full sm:w-48">
                        <Label htmlFor="filterUser" className="text-sm font-medium mb-1 block">
                          Gebruiker
                        </Label>
                        <Select value={filterUser} onValueChange={setFilterUser}>
                          <SelectTrigger id="filterUser">
                            <SelectValue placeholder="Alle gebruikers" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Alle gebruikers</SelectItem>
                            {users.map((user) => (
                              <SelectItem key={user} value={user}>
                                {user}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-full sm:w-48">
                        <Label htmlFor="filterLocation" className="text-sm font-medium mb-1 block">
                          Locatie
                        </Label>
                        <Select value={filterLocation} onValueChange={setFilterLocation}>
                          <SelectTrigger id="filterLocation">
                            <SelectValue placeholder="Alle locaties" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Alle locaties</SelectItem>
                            {locations.map((loc) => (
                              <SelectItem key={loc} value={loc}>
                                {loc}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="w-full sm:w-48">
                        <Label htmlFor="dateFrom" className="text-sm font-medium mb-1 block">
                          Datum vanaf
                        </Label>
                        <Input
                          id="dateFrom"
                          type="date"
                          value={filterDateFrom}
                          onChange={(e) => setFilterDateFrom(e.target.value)}
                        />
                      </div>
                      <div className="w-full sm:w-48">
                        <Label htmlFor="dateTo" className="text-sm font-medium mb-1 block">
                          Datum tot
                        </Label>
                        <Input
                          id="dateTo"
                          type="date"
                          value={filterDateTo}
                          onChange={(e) => setFilterDateTo(e.target.value)}
                        />
                      </div>
                      <div className="w-full sm:w-48">
                        <Label htmlFor="sortBy" className="text-sm font-medium mb-1 block">
                          Sorteer op
                        </Label>
                        <Select
                          value={sortBy}
                          onValueChange={(value) => setSortBy(value as "date" | "user" | "product")}
                        >
                          <SelectTrigger id="sortBy">
                            <SelectValue placeholder="Sorteer op" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="date">Datum</SelectItem>
                            <SelectItem value="user">Gebruiker</SelectItem>
                            <SelectItem value="product">Product</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-full sm:w-48">
                        <Label htmlFor="sortOrder" className="text-sm font-medium mb-1 block">
                          Volgorde
                        </Label>
                        <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as "asc" | "desc")}>
                          <SelectTrigger id="sortOrder">
                            <SelectValue placeholder="Volgorde" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="desc">Nieuwste eerst</SelectItem>
                            <SelectItem value="asc">Oudste eerst</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex justify-between">
                      <Button variant="outline" onClick={clearAllFilters} className="text-sm">
                        <X className="mr-1 h-4 w-4" /> Wis filters
                      </Button>
                      <Button onClick={exportToCSV} className="bg-green-600 hover:bg-green-700 text-sm">
                        <Download className="mr-1 h-4 w-4" /> Exporteer naar CSV
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead className="w-[100px]">Datum</TableHead>
                          <TableHead className="w-[80px]">Tijd</TableHead>
                          <TableHead>Gebruiker</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead className="hidden md:table-cell">QR Code</TableHead>
                          <TableHead className="hidden md:table-cell">Categorie</TableHead>
                          <TableHead>Locatie</TableHead>
                          <TableHead className="hidden md:table-cell">Doel</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getFilteredAndSortedEntries().length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                              Geen registraties gevonden met de huidige filters
                            </TableCell>
                          </TableRow>
                        ) : (
                          getFilteredAndSortedEntries().map((entry) => (
                            <TableRow key={entry.id}>
                              <TableCell className="font-medium">{entry.date}</TableCell>
                              <TableCell>{entry.time}</TableCell>
                              <TableCell>{entry.user}</TableCell>
                              <TableCell>{entry.product}</TableCell>
                              <TableCell className="hidden md:table-cell">
                                {entry.qrcode ? (
                                  <Badge variant="outline" className="font-mono text-xs">
                                    {entry.qrcode}
                                  </Badge>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                {(() => {
                                  const product = products.find((p) => p.name === entry.product)
                                  if (product?.categoryId) {
                                    const category = categories.find((c) => c.id === product.categoryId)
                                    return category ? (
                                      <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                                        {category.name}
                                      </Badge>
                                    ) : (
                                      "-"
                                    )
                                  }
                                  return "-"
                                })()}
                              </TableCell>
                              <TableCell>{entry.location}</TableCell>
                              <TableCell className="hidden md:table-cell">{entry.purpose}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card className="shadow-sm">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-5 h-5 mr-2"
                  >
                    <path d="M12 14a5 5 0 110-10 5 5 0 010 10z" />
                    <path
                      fillRule="evenodd"
                      d="M7.158 14.002a6 6 0 00-7.157 2.583A2.25 2.25 0 002.25 22.5h19.5a2.25 2.25 0 002.25-5.915 6 6 0 00-7.157-2.583A9.744 9.744 0 007.158 14.002z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Beheer Gebruikers
                </CardTitle>
                <CardDescription>Voeg nieuwe gebruikers toe of verwijder bestaande gebruikers</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="newUserName" className="text-sm font-medium block">
                        Nieuwe Gebruiker
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          id="newUserName"
                          placeholder="Naam van de nieuwe gebruiker"
                          value={newUserName}
                          onChange={(e) => setNewUserName(e.target.value)}
                        />
                        <Button type="button" onClick={addNewUser} className="bg-blue-600 hover:bg-blue-700">
                          <Plus className="h-4 w-4 mr-2" /> Toevoegen
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="userImport" className="text-sm font-medium block">
                        Importeer Gebruikers (CSV/TXT)
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          type="file"
                          id="userImport"
                          accept=".txt,.csv"
                          ref={userFileInputRef}
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleFileImport(e.target.files[0], "users")
                            }
                          }}
                          className="hidden"
                        />
                        <Button type="button" onClick={() => userFileInputRef.current?.click()} variant="secondary">
                          <Download className="h-4 w-4 mr-2" /> Bestand Kiezen
                        </Button>
                        <Button type="button" onClick={() => exportTemplate("users")} variant="outline">
                          <Download className="h-4 w-4 mr-2" /> Template
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead>Gebruiker</TableHead>
                          <TableHead className="text-right">Acties</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user}>
                            <TableCell className="font-medium">{user}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => removeUser(user)}
                                className="ml-2"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <Card className="shadow-sm">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-5 h-5 mr-2"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Beheer Producten
                </CardTitle>
                <CardDescription>Voeg nieuwe producten toe of verwijder bestaande producten</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="newProductName" className="text-sm font-medium block">
                        Nieuw Product
                      </Label>
                      <div className="flex flex-col gap-2">
                        <Input
                          type="text"
                          id="newProductName"
                          placeholder="Naam van het nieuwe product"
                          value={newProductName}
                          onChange={(e) => setNewProductName(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Input
                            type="text"
                            id="newProductQrCode"
                            placeholder="QR Code (optioneel)"
                            value={newProductQrCode}
                            onChange={(e) => setNewProductQrCode(e.target.value)}
                          />
                          <Button
                            type="button"
                            onClick={() => {
                              setQrScanMode("product-management")
                              startQrScanner()
                            }}
                            className="bg-blue-600 hover:bg-blue-700"
                            disabled={showQrScanner}
                          >
                            📱 Scan QR
                          </Button>
                        </div>
                        <Select value={newProductCategory} onValueChange={setNewProductCategory}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecteer categorie (optioneel)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Geen categorie</SelectItem>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button type="button" onClick={addNewProduct} className="bg-blue-600 hover:bg-blue-700">
                          <Plus className="h-4 w-4 mr-2" /> Toevoegen
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="productImport" className="text-sm font-medium block">
                        Importeer Producten (CSV)
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          type="file"
                          id="productImport"
                          accept=".csv"
                          ref={productFileInputRef}
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleFileImport(e.target.files[0], "products")
                            }
                          }}
                          className="hidden"
                        />
                        <Button type="button" onClick={() => productFileInputRef.current?.click()} variant="secondary">
                          <Download className="h-4 w-4 mr-2" /> Bestand Kiezen
                        </Button>
                        <Button type="button" onClick={() => exportTemplate("products")} variant="outline">
                          <Download className="h-4 w-4 mr-2" /> Template
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="hidden md:table-cell">QR Code</TableHead>
                          <TableHead className="hidden md:table-cell">Categorie</TableHead>
                          <TableHead className="text-right">Acties</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell className="hidden md:table-cell">
                              {product.qrcode ? (
                                <Badge variant="outline" className="font-mono text-xs">
                                  {product.qrcode}
                                </Badge>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {product.categoryId
                                ? (() => {
                                    const category = categories.find((c) => c.id === product.categoryId)
                                    return category ? (
                                      <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                                        {category.name}
                                      </Badge>
                                    ) : (
                                      "-"
                                    )
                                  })()
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="secondary"
                                size="icon"
                                onClick={() => {
                                  setEditingProduct(product)
                                  setShowEditDialog(true)
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => removeProduct(product)}
                                className="ml-2"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories">
            <Card className="shadow-sm">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-5 h-5 mr-2"
                  >
                    <path d="M21.731 2.039c.775-.399 1.72-.032 2.096.805l1.497 5.98a1.5 1.5 0 01-.21 1.744l-.743 2.982c-.151.607-.928.607-1.079 0l-.743-2.982a1.5 1.5 0 01-.21-1.744l1.497-5.98c.376-.837-.09-1.196-.851-.805l-8.94 4.614c-.644.333-1.588.333-2.232 0L2.269 2.039c-.761-.399-1.227.032-.851.805l1.497 5.98a1.5 1.5 0 01-.21 1.744l-.743 2.982c-.151.607-.928.607-1.079 0l-.743-2.982a1.5 1.5 0 01-.21-1.744l1.497-5.98c.376-.837-.09-1.196-.851-.805C3.558 1.64 4.502 2 4.878 2.837l8.94 4.614c.644.333 1.588.333 2.232 0l8.94-4.614c.376-.837 1.32-.436 2.081.367zM6.354 10.854a.5.5 0 00-.707 0l-2.121 2.121a.5.5 0 000 .707l2.121 2.121a.5.5 0 00.707 0l2.121-2.121a.5.5 0 000-.707l-2.121-2.121zM17.646 10.854a.5.5 0 01.707 0l2.121 2.121a.5.5 0 010 .707l-2.121 2.121a.5.5 0 01-.707 0l-2.121-2.121a.5.5 0 010-.707l2.121-2.121z" />
                  </svg>
                  Beheer Categorieën
                </CardTitle>
                <CardDescription>Voeg nieuwe categorieën toe of verwijder bestaande categorieën</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="newCategoryName" className="text-sm font-medium block">
                        Nieuwe Categorie
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          id="newCategoryName"
                          placeholder="Naam van de nieuwe categorie"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                        />
                        <Button type="button" onClick={addNewCategory} className="bg-blue-600 hover:bg-blue-700">
                          <Plus className="h-4 w-4 mr-2" /> Toevoegen
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead>Categorie</TableHead>
                          <TableHead className="text-right">Acties</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categories.map((category) => (
                          <TableRow key={category.id}>
                            <TableCell className="font-medium">{category.name}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="secondary"
                                size="icon"
                                onClick={() => {
                                  setEditingCategory(category)
                                  setShowEditCategoryDialog(true)
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => removeCategory(category.id)}
                                className="ml-2"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="locations">
            <Card className="shadow-sm">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-5 h-5 mr-2"
                  >
                    <path
                      fillRule="evenodd"
                      d="M11.54 22.351l.07.04.028.016a.25.25 0 00.273-.095l.063-.06a22.947 22.947 0 003.892-6.947c.09-.13.237-.26.408-.37a1.5 1.5 0 011.154-.075L20.5 12.25l-.893-.894.343-.343-7-7a1.5 1.5 0 00-2.122 0l-7 7.001.342.341L3.5 12.25l4.555 4.553a1.5 1.5 0 011.154.075.481.481 0 00.408.37a22.947 22.947 0 003.892 6.947l.063.06c.082.047.196.005.273-.095l.028-.016.07-.04zm-5.14-1.23a.75.75 0 01-.793.03l-.042-.02a19.576 19.576 0 00-3.386-6.072c-.04-.058-.158-.112-.283-.15a.75.75 0 01-.118-.975l.895-.895 5.664-5.663a.75.75 0 011.06 0l5.664 5.663.895.895a.75.75 0 01-.118.975c-.125.038-.243.092-.283.15a19.576 19.576 0 00-3.386 6.072l-.042.02a.75.75 0 01-.793-.03z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Beheer Locaties
                </CardTitle>
                <CardDescription>Voeg nieuwe locaties toe of verwijder bestaande locaties</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="newLocationName" className="text-sm font-medium block">
                        Nieuwe Locatie
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          id="newLocationName"
                          placeholder="Naam van de nieuwe locatie"
                          value={newLocationName}
                          onChange={(e) => setNewLocationName(e.target.value)}
                        />
                        <Button type="button" onClick={addNewLocation} className="bg-blue-600 hover:bg-blue-700">
                          <Plus className="h-4 w-4 mr-2" /> Toevoegen
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="locationImport" className="text-sm font-medium block">
                        Importeer Locaties (CSV/TXT)
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          type="file"
                          id="locationImport"
                          accept=".txt,.csv"
                          ref={locationFileInputRef}
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleFileImport(e.target.files[0], "locations")
                            }
                          }}
                          className="hidden"
                        />
                        <Button type="button" onClick={() => locationFileInputRef.current?.click()} variant="secondary">
                          <Download className="h-4 w-4 mr-2" /> Bestand Kiezen
                        </Button>
                        <Button type="button" onClick={() => exportTemplate("locations")} variant="outline">
                          <Download className="h-4 w-4 mr-2" /> Template
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead>Locatie</TableHead>
                          <TableHead className="text-right">Acties</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {locations.map((location) => (
                          <TableRow key={location}>
                            <TableCell className="font-medium">{location}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => removeLocation(location)}
                                className="ml-2"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="purposes">
            <Card className="shadow-sm">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-5 h-5 mr-2"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM8.547 9.505a.75.75 0 00-.69.956 3.75 3.75 0 007.337 0 .75.75 0 10-1.5-.058 2.25 2.25 0 01-4.337 0 .75.75 0 00-.69-.956zm3.984 4.496a.75.75 0 00-1.498 0 .75.75 0 011.498 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Beheer Doelen
                </CardTitle>
                <CardDescription>Voeg nieuwe doelen toe of verwijder bestaande doelen</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="newPurposeName" className="text-sm font-medium block">
                        Nieuw Doel
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          id="newPurposeName"
                          placeholder="Naam van het nieuwe doel"
                          value={newPurposeName}
                          onChange={(e) => setNewPurposeName(e.target.value)}
                        />
                        <Button type="button" onClick={addNewPurpose} className="bg-blue-600 hover:bg-blue-700">
                          <Plus className="h-4 w-4 mr-2" /> Toevoegen
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="purposeImport" className="text-sm font-medium block">
                        Importeer Doelen (CSV/TXT)
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          type="file"
                          id="purposeImport"
                          accept=".txt,.csv"
                          ref={purposeFileInputRef}
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleFileImport(e.target.files[0], "purposes")
                            }
                          }}
                          className="hidden"
                        />
                        <Button type="button" onClick={() => purposeFileInputRef.current?.click()} variant="secondary">
                          <Download className="h-4 w-4 mr-2" /> Bestand Kiezen
                        </Button>
                        <Button type="button" onClick={() => exportTemplate("purposes")} variant="outline">
                          <Download className="h-4 w-4 mr-2" /> Template
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead>Doel</TableHead>
                          <TableHead className="text-right">Acties</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {purposes.map((purpose) => (
                          <TableRow key={purpose}>
                            <TableCell className="font-medium">{purpose}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => removePurpose(purpose)}
                                className="ml-2"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="statistics">
            <Card className="shadow-sm">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
                <CardTitle className="flex items-center gap-2 text-xl">📊 Statistieken</CardTitle>
                <CardDescription>Overzicht van productregistraties</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle>Totaal Registraties</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{stats.totalRegistrations}</div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle>Unieke Gebruikers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{stats.uniqueUsers}</div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle>Unieke Producten</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{stats.uniqueProducts}</div>
                    </CardContent>
                  </Card>
                </div>

                <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Top 5 Gebruikers</h2>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={stats.topUsers.map(([user, count]) => ({ user, count }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="user" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#f59e0b" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div>
                    <h2 className="text-xl font-semibold mb-4">Top 5 Producten</h2>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={stats.topProducts.map(([product, count]) => ({ product, count }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="product" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#f59e0b" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Top 5 Locaties</h2>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={stats.topLocations.map(([location, count]) => ({ location, count }))}
                          dataKey="count"
                          nameKey="location"
                          cx="50%"
                          cy="50%"
                          outerRadius={120}
                          fill="#f59e0b"
                          label
                        >
                          {stats.topLocations.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div>
                    <h2 className="text-xl font-semibold mb-4">Recente Activiteit</h2>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Gebruiker</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>Datum</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats.recentActivity.map((activity) => (
                          <TableRow key={activity.id}>
                            <TableCell>{activity.user}</TableCell>
                            <TableCell>{activity.product}</TableCell>
                            <TableCell>{activity.date}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Product Dialog */}
        {showEditDialog && editingProduct && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Product Bewerken</h3>
                <div className="px-7 py-3">
                  <Label htmlFor="editProductName" className="text-sm font-medium block">
                    Product Naam
                  </Label>
                  <Input
                    type="text"
                    id="editProductName"
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="mt-1"
                  />

                  <Label htmlFor="editProductQrCode" className="text-sm font-medium block mt-3">
                    QR Code
                  </Label>
                  <Input
                    type="text"
                    id="editProductQrCode"
                    value={editingProduct.qrcode || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, qrcode: e.target.value })}
                    className="mt-1"
                  />

                  <Label htmlFor="editProductCategory" className="text-sm font-medium block mt-3">
                    Categorie
                  </Label>
                  <Select
                    value={editingProduct.categoryId || "none"}
                    onValueChange={(value) => setEditingProduct({ ...editingProduct, categoryId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer categorie (optioneel)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Geen categorie</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="items-center px-4 py-3">
                  <Button
                    variant="secondary"
                    className="px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 text-sm font-medium rounded-md"
                    onClick={() => setShowEditDialog(false)}
                  >
                    Annuleren
                  </Button>
                  <Button
                    className="ml-2 px-4 py-2 bg-green-500 text-white hover:bg-green-700 text-sm font-medium rounded-md"
                    onClick={updateProduct}
                  >
                    Opslaan
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Category Dialog */}
        {showEditCategoryDialog && editingCategory && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Categorie Bewerken</h3>
                <div className="px-7 py-3">
                  <Label htmlFor="editCategoryName" className="text-sm font-medium block">
                    Categorie Naam
                  </Label>
                  <Input
                    type="text"
                    id="editCategoryName"
                    value={editingCategory.name}
                    onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="items-center px-4 py-3">
                  <Button
                    variant="secondary"
                    className="px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 text-sm font-medium rounded-md"
                    onClick={() => setShowEditCategoryDialog(false)}
                  >
                    Annuleren
                  </Button>
                  <Button
                    className="ml-2 px-4 py-2 bg-green-500 text-white hover:bg-green-700 text-sm font-medium rounded-md"
                    onClick={updateCategory}
                  >
                    Opslaan
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* QR Scanner Modal */}
        {showQrScanner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="relative bg-white rounded-lg shadow-lg max-w-md w-full">
              <div className="flex items-center justify-between p-4 border-b rounded-t">
                <h3 className="text-lg font-semibold text-gray-900">QR Code Scanner</h3>
                <Button variant="ghost" onClick={stopQrScanner}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="p-4">
                {isScanning ? (
                  <>
                    {navigator.mediaDevices && navigator.mediaDevices.getUserMedia ? (
                      <div className="overflow-hidden rounded-lg">
                        <video ref={videoRef} className="w-full" autoPlay muted playsInline />
                        <canvas ref={canvasRef} className="hidden" />
                      </div>
                    ) : (
                      <p className="text-center text-gray-500">Camera niet ondersteund, voer handmatig in.</p>
                    )}
                  </>
                ) : (
                  <p className="text-center text-gray-500">
                    Camera toegang geweigerd of niet beschikbaar. Voer de QR code handmatig in.
                  </p>
                )}
                <Button
                  onClick={scanQrCode}
                  className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  Handmatig invoeren
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"]
