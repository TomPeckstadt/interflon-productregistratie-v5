"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import {
  fetchProducts,
  saveProduct,
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
import {
  Download,
  Search,
  X,
  QrCode,
  FileText,
  Plus,
  Trash2,
  Users,
  Package,
  BarChart3,
  TrendingUp,
  Clock,
  MapPin,
} from "lucide-react"

// Voeg deze imports toe voor de charts
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  LineChart,
  Line,
} from "recharts"

import { getCurrentUser, onAuthStateChange, signOut } from "@/lib/auth"
import { LoginForm } from "@/components/login-form"

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

  // Nieuwe item states
  const [newUserName, setNewUserName] = useState("")
  const [newProductName, setNewProductName] = useState("")
  const [newProductQrCode, setNewProductQrCode] = useState("")
  const [newLocationName, setNewLocationName] = useState("")
  const [newPurposeName, setNewPurposeName] = useState("")

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

      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.error("Supabase omgevingsvariabelen ontbreken")
        setConnectionStatus("error")
        setImportError("❌ Fout bij verbinden met database: Configuratie ontbreekt")
        return
      }

      const [usersResult, productsResult, locationsResult, purposesResult, registrationsResult] = await Promise.all([
        fetchUsers(),
        fetchProducts(),
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
        const existingProduct = products.find(
          (p) => p.name === newProductName.trim() || (qrcode && p.qrcode === qrcode),
        )
        if (!existingProduct) {
          console.log("addNewProduct aangeroepen voor:", newProductName.trim())
          const result = await saveProduct({ name: newProductName.trim(), qrcode })

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
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 bg-white border border-gray-200 shadow-sm">
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
                          <TableHead>Locatie</TableHead>
                          <TableHead className="hidden md:table-cell">Doel</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getFilteredAndSortedEntries().length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-gray-500">
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
                  <Users className="h-5 w-5" /> Gebruikers Beheren
                </CardTitle>
                <CardDescription>Voeg nieuwe gebruikers toe of verwijder bestaande gebruikers</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-medium mb-4">Nieuwe gebruiker toevoegen</h3>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1">
                        <Label htmlFor="newUserName" className="sr-only">
                          Naam
                        </Label>
                        <Input
                          id="newUserName"
                          placeholder="Voer naam in..."
                          value={newUserName}
                          onChange={(e) => setNewUserName(e.target.value)}
                        />
                      </div>
                      <Button onClick={addNewUser} className="bg-amber-600 hover:bg-amber-700">
                        <Plus className="mr-1 h-4 w-4" /> Toevoegen
                      </Button>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-medium mb-4">Importeren / Exporteren</h3>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1">
                        <Label htmlFor="userImport" className="block text-sm font-medium mb-1">
                          Importeer gebruikers (CSV of TXT)
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="userImport"
                            type="file"
                            accept=".csv,.txt"
                            ref={userFileInputRef}
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleFileImport(e.target.files[0], "users")
                              }
                            }}
                          />
                          <Button
                            onClick={() => exportTemplate("users")}
                            variant="outline"
                            className="whitespace-nowrap"
                          >
                            <FileText className="mr-1 h-4 w-4" /> Template
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead>Naam</TableHead>
                          <TableHead className="w-[100px] text-right">Acties</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={2} className="text-center py-8 text-gray-500">
                              Geen gebruikers gevonden
                            </TableCell>
                          </TableRow>
                        ) : (
                          users.map((user) => (
                            <TableRow key={user}>
                              <TableCell className="font-medium">{user}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  onClick={() => removeUser(user)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Verwijder {user}</span>
                                </Button>
                              </TableCell>
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

          <TabsContent value="products">
            <Card className="shadow-sm">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Package className="h-5 w-5" /> Producten Beheren
                </CardTitle>
                <CardDescription>Voeg nieuwe producten toe of verwijder bestaande producten</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-medium mb-4">Nieuw product toevoegen</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2">
                        <Label htmlFor="newProductName" className="block text-sm font-medium mb-1">
                          Productnaam
                        </Label>
                        <Input
                          id="newProductName"
                          placeholder="Voer productnaam in..."
                          value={newProductName}
                          onChange={(e) => setNewProductName(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="newProductQrCode" className="block text-sm font-medium mb-1">
                          QR Code (optioneel)
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="newProductQrCode"
                            placeholder="QR Code..."
                            value={newProductQrCode}
                            onChange={(e) => setNewProductQrCode(e.target.value)}
                          />
                          <Button
                            type="button"
                            onClick={() => {
                              console.log("QR button clicked for product management")
                              setQrScanMode("product-management")
                              startQrScanner()
                            }}
                            variant="outline"
                            className="px-2"
                            disabled={showQrScanner}
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="sm:col-span-3">
                        <Button onClick={addNewProduct} className="bg-amber-600 hover:bg-amber-700">
                          <Plus className="mr-1 h-4 w-4" /> Product Toevoegen
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-medium mb-4">Importeren / Exporteren</h3>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1">
                        <Label htmlFor="productImport" className="block text-sm font-medium mb-1">
                          Importeer producten (CSV formaat: Naam,QRCode)
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="productImport"
                            type="file"
                            accept=".csv"
                            ref={productFileInputRef}
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleFileImport(e.target.files[0], "products")
                              }
                            }}
                          />
                          <Button
                            onClick={() => exportTemplate("products")}
                            variant="outline"
                            className="whitespace-nowrap"
                          >
                            <FileText className="mr-1 h-4 w-4" /> Template
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead>Naam</TableHead>
                          <TableHead className="hidden md:table-cell">QR Code</TableHead>
                          <TableHead className="w-[100px] text-right">Acties</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                              Geen producten gevonden
                            </TableCell>
                          </TableRow>
                        ) : (
                          products.map((product) => (
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
                              <TableCell className="text-right">
                                <Button
                                  onClick={() => removeProduct(product)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Verwijder {product.name}</span>
                                </Button>
                              </TableCell>
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

          <TabsContent value="locations">
            <Card className="shadow-sm">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <MapPin className="h-5 w-5" /> Locaties Beheren
                </CardTitle>
                <CardDescription>Voeg nieuwe locaties toe of verwijder bestaande locaties</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-medium mb-4">Nieuwe locatie toevoegen</h3>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1">
                        <Label htmlFor="newLocationName" className="sr-only">
                          Locatie naam
                        </Label>
                        <Input
                          id="newLocationName"
                          placeholder="Voer locatie naam in..."
                          value={newLocationName}
                          onChange={(e) => setNewLocationName(e.target.value)}
                        />
                      </div>
                      <Button onClick={addNewLocation} className="bg-amber-600 hover:bg-amber-700">
                        <Plus className="mr-1 h-4 w-4" /> Toevoegen
                      </Button>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-medium mb-4">Importeren / Exporteren</h3>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1">
                        <Label htmlFor="locationImport" className="block text-sm font-medium mb-1">
                          Importeer locaties (CSV of TXT)
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="locationImport"
                            type="file"
                            accept=".csv,.txt"
                            ref={locationFileInputRef}
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleFileImport(e.target.files[0], "locations")
                              }
                            }}
                          />
                          <Button
                            onClick={() => exportTemplate("locations")}
                            variant="outline"
                            className="whitespace-nowrap"
                          >
                            <FileText className="mr-1 h-4 w-4" /> Template
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead>Naam</TableHead>
                          <TableHead className="w-[100px] text-right">Acties</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {locations.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={2} className="text-center py-8 text-gray-500">
                              Geen locaties gevonden
                            </TableCell>
                          </TableRow>
                        ) : (
                          locations.map((location) => (
                            <TableRow key={location}>
                              <TableCell className="font-medium">{location}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  onClick={() => removeLocation(location)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Verwijder {location}</span>
                                </Button>
                              </TableCell>
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

          <TabsContent value="purposes">
            <Card className="shadow-sm">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
                <CardTitle className="flex items-center gap-2 text-xl">🎯 Doelen Beheren</CardTitle>
                <CardDescription>Voeg nieuwe doelen toe of verwijder bestaande doelen</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-medium mb-4">Nieuw doel toevoegen</h3>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1">
                        <Label htmlFor="newPurposeName" className="sr-only">
                          Doel naam
                        </Label>
                        <Input
                          id="newPurposeName"
                          placeholder="Voer doel naam in..."
                          value={newPurposeName}
                          onChange={(e) => setNewPurposeName(e.target.value)}
                        />
                      </div>
                      <Button onClick={addNewPurpose} className="bg-amber-600 hover:bg-amber-700">
                        <Plus className="mr-1 h-4 w-4" /> Toevoegen
                      </Button>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-medium mb-4">Importeren / Exporteren</h3>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1">
                        <Label htmlFor="purposeImport" className="block text-sm font-medium mb-1">
                          Importeer doelen (CSV of TXT)
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="purposeImport"
                            type="file"
                            accept=".csv,.txt"
                            ref={purposeFileInputRef}
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleFileImport(e.target.files[0], "purposes")
                              }
                            }}
                          />
                          <Button
                            onClick={() => exportTemplate("purposes")}
                            variant="outline"
                            className="whitespace-nowrap"
                          >
                            <FileText className="mr-1 h-4 w-4" /> Template
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead>Naam</TableHead>
                          <TableHead className="w-[100px] text-right">Acties</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {purposes.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={2} className="text-center py-8 text-gray-500">
                              Geen doelen gevonden
                            </TableCell>
                          </TableRow>
                        ) : (
                          purposes.map((purpose) => (
                            <TableRow key={purpose}>
                              <TableCell className="font-medium">{purpose}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  onClick={() => removePurpose(purpose)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Verwijder {purpose}</span>
                                </Button>
                              </TableCell>
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

          <TabsContent value="statistics">
            <Card className="shadow-sm">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <BarChart3 className="h-5 w-5" /> Dashboard & Statistieken
                </CardTitle>
                <CardDescription>
                  Overzicht van product registraties en gebruiksstatistieken met grafieken
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-8">
                  {/* Overzicht kaarten */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-blue-600">Totaal Registraties</p>
                            <p className="text-2xl font-bold text-blue-900">{stats.totalRegistrations}</p>
                          </div>
                          <BarChart3 className="h-8 w-8 text-blue-600" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-green-600">Actieve Gebruikers</p>
                            <p className="text-2xl font-bold text-green-900">{stats.uniqueUsers}</p>
                          </div>
                          <Users className="h-8 w-8 text-green-600" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-purple-600">Gebruikte Producten</p>
                            <p className="text-2xl font-bold text-purple-900">{stats.uniqueProducts}</p>
                          </div>
                          <Package className="h-8 w-8 text-purple-600" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Grafieken sectie - kleiner gemaakt */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Gebruikers Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5" /> Top Gebruikers (Grafiek)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {stats.topUsers.length > 0 ? (
                          <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={stats.topUsers.map(([name, count]) => ({ name, count }))}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} fontSize={12} />
                                <YAxis fontSize={12} />
                                <Tooltip />
                                <Bar dataKey="count" fill="#f59e0b" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <p className="text-gray-500 text-center py-4">Geen data beschikbaar</p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Top Producten Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Package className="h-5 w-5" /> Top Producten (Grafiek)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {stats.topProducts.length > 0 ? (
                          <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={stats.topProducts.map(([name, count], index) => ({
                                    name,
                                    count,
                                    fill: ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444"][index % 5],
                                  }))}
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={60}
                                  dataKey="count"
                                  label={({ name, percent }) =>
                                    `${name.length > 15 ? name.substring(0, 15) + "..." : name} (${(percent * 100).toFixed(0)}%)`
                                  }
                                  fontSize={10}
                                />
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <p className="text-gray-500 text-center py-4">Geen data beschikbaar</p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Activiteit per dag */}
                    <Card className="lg:col-span-2">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Clock className="h-5 w-5" /> Activiteit per Dag (Laatste 7 dagen)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {(() => {
                          // Bereken activiteit per dag voor de laatste 7 dagen
                          const last7Days = Array.from({ length: 7 }, (_, i) => {
                            const date = new Date()
                            date.setDate(date.getDate() - i)
                            return date.toLocaleDateString("nl-NL")
                          }).reverse()

                          const activityPerDay = last7Days.map((date) => {
                            const count = entries.filter((entry) => entry.date === date).length
                            return { date, count }
                          })

                          return activityPerDay.some((day) => day.count > 0) ? (
                            <div className="h-48">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={activityPerDay}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="date" fontSize={12} />
                                  <YAxis fontSize={12} />
                                  <Tooltip />
                                  <Line type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={2} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          ) : (
                            <p className="text-gray-500 text-center py-8">Geen activiteit in de laatste 7 dagen</p>
                          )
                        })()}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Alle lijsten in een grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5" /> Top Gebruikers
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {stats.topUsers.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">Geen data beschikbaar</p>
                          ) : (
                            stats.topUsers.map(([user, count], index) => (
                              <div key={user} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">
                                    {index + 1}
                                  </div>
                                  <span className="font-medium">{user}</span>
                                </div>
                                <Badge variant="secondary">{count} registraties</Badge>
                              </div>
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Package className="h-5 w-5" /> Top Producten
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {stats.topProducts.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">Geen data beschikbaar</p>
                          ) : (
                            stats.topProducts.map(([product, count], index) => (
                              <div key={product} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">
                                    {index + 1}
                                  </div>
                                  <span className="font-medium">{product}</span>
                                </div>
                                <Badge variant="secondary">{count} keer gebruikt</Badge>
                              </div>
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <MapPin className="h-5 w-5" /> Top Locaties
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {stats.topLocations.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">Geen data beschikbaar</p>
                          ) : (
                            stats.topLocations.map(([location, count], index) => (
                              <div key={location} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">
                                    {index + 1}
                                  </div>
                                  <span className="font-medium">{location}</span>
                                </div>
                                <Badge variant="secondary">{count} registraties</Badge>
                              </div>
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Clock className="h-5 w-5" /> Recente Activiteit
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {stats.recentActivity.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">Geen recente activiteit</p>
                          ) : (
                            stats.recentActivity.map((entry) => (
                              <div key={entry.id} className="flex items-center justify-between text-sm">
                                <div>
                                  <span className="font-medium">{entry.user}</span>
                                  <span className="text-gray-500"> gebruikte </span>
                                  <span className="font-medium">{entry.product}</span>
                                </div>
                                <div className="text-right text-gray-500">
                                  <div className="text-xs">{entry.date}</div>
                                  <div className="font-medium">{entry.time}</div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* QR Scanner Modal */}
        {showQrScanner && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">📱 QR Code Scanner</h3>
                <Button onClick={stopQrScanner} variant="outline" size="sm">
                  ✕ Sluiten
                </Button>
              </div>

              <div className="space-y-4">
                {isScanning ? (
                  <>
                    <video ref={videoRef} className="w-full h-64 bg-gray-200 rounded-lg" autoPlay playsInline />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-4">Richt de camera op een QR code</p>
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <div className="animate-pulse w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-sm text-blue-600">Scannen...</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-600 mb-4">Camera niet beschikbaar</p>
                  </div>
                )}

                <Button onClick={scanQrCode} className="w-full">
                  🔍 Handmatig Invoeren
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-12 border-t border-gray-200 bg-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="flex items-center mr-6">
                {/* CSS-gebaseerd Interflon logo */}
                <div className="flex items-center mr-3">
                  <div className="relative w-10 h-10 mr-2">
                    {/* Hoofdcirkel */}
                    <div className="w-10 h-10 border-4 border-red-500 rounded-full relative">
                      {/* Kleine cirkel linksboven */}
                      <div className="absolute -top-1 -left-1 w-3 h-3 bg-red-500 rounded-full"></div>
                    </div>
                    <div className="text-lg font-bold text-red-500 tracking-wide">INTERFLON</div>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                © {new Date().getFullYear()} INTERFLON. Alle rechten voorbehouden.
              </p>
            </div>
            <div className="flex items-center gap-6">
              <a href="#" className="text-sm text-gray-500 hover:text-red-600">
                Privacy
              </a>
              <a href="#" className="text-sm text-gray-500 hover:text-red-600">
                Voorwaarden
              </a>
              <a href="#" className="text-sm text-gray-500 hover:text-red-600">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
