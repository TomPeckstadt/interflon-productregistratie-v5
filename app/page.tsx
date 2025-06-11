"use client"

import { useState, useEffect } from "react"
import type React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Download, Plus, Trash2 } from "lucide-react"

// Types
interface Product {
  id: string
  name: string
  qrcode?: string
  categoryId?: string
}

interface Category {
  id: string
  name: string
}

interface Registration {
  id: string
  productId: string
  productName: string
  user: string
  location: string
  purpose: string
  timestamp: string
  qrcode?: string
}

export default function ProductRegistrationApp() {
  // Basic state
  const [currentUser, setCurrentUser] = useState("")
  const [selectedProduct, setSelectedProduct] = useState("")
  const [location, setLocation] = useState("")
  const [purpose, setPurpose] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Data arrays - stored in localStorage
  const [users, setUsers] = useState<string[]>(["Jan Janssen", "Marie Pietersen", "Piet de Vries", "Anna van der Berg"])

  const [products, setProducts] = useState<Product[]>([
    { id: "1", name: "Interflon Fin Super", qrcode: "IFLS001", categoryId: "1" },
    { id: "2", name: "Interflon Food Lube", qrcode: "IFFL002", categoryId: "1" },
    { id: "3", name: "Interflon Degreaser", qrcode: "IFD003", categoryId: "2" },
  ])

  const [locations, setLocations] = useState<string[]>([
    "Kantoor 1.1",
    "Kantoor 1.2",
    "Vergaderzaal A",
    "Warehouse",
    "Thuis",
  ])

  const [purposes, setPurposes] = useState<string[]>([
    "Presentatie",
    "Thuiswerken",
    "Reparatie",
    "Training",
    "Demonstratie",
  ])

  const [categories, setCategories] = useState<Category[]>([
    { id: "1", name: "Smeermiddelen" },
    { id: "2", name: "Reinigers" },
    { id: "3", name: "Onderhoud" },
  ])

  const [registrations, setRegistrations] = useState<Registration[]>([])

  // New item states
  const [newUserName, setNewUserName] = useState("")
  const [newProductName, setNewProductName] = useState("")
  const [newProductQrCode, setNewProductQrCode] = useState("")
  const [newProductCategory, setNewProductCategory] = useState("none")
  const [newLocationName, setNewLocationName] = useState("")
  const [newPurposeName, setNewPurposeName] = useState("")
  const [newCategoryName, setNewCategoryName] = useState("")

  // Load data from localStorage on mount
  useEffect(() => {
    const savedUsers = localStorage.getItem("interflon-users")
    const savedProducts = localStorage.getItem("interflon-products")
    const savedLocations = localStorage.getItem("interflon-locations")
    const savedPurposes = localStorage.getItem("interflon-purposes")
    const savedCategories = localStorage.getItem("interflon-categories")
    const savedRegistrations = localStorage.getItem("interflon-registrations")

    if (savedUsers) setUsers(JSON.parse(savedUsers))
    if (savedProducts) setProducts(JSON.parse(savedProducts))
    if (savedLocations) setLocations(JSON.parse(savedLocations))
    if (savedPurposes) setPurposes(JSON.parse(savedPurposes))
    if (savedCategories) setCategories(JSON.parse(savedCategories))
    if (savedRegistrations) setRegistrations(JSON.parse(savedRegistrations))

    // Set default user
    if (users.length > 0 && !currentUser) {
      setCurrentUser(users[0])
    }
  }, [])

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem("interflon-users", JSON.stringify(users))
  }, [users])

  useEffect(() => {
    localStorage.setItem("interflon-products", JSON.stringify(products))
  }, [products])

  useEffect(() => {
    localStorage.setItem("interflon-locations", JSON.stringify(locations))
  }, [locations])

  useEffect(() => {
    localStorage.setItem("interflon-purposes", JSON.stringify(purposes))
  }, [purposes])

  useEffect(() => {
    localStorage.setItem("interflon-categories", JSON.stringify(categories))
  }, [categories])

  useEffect(() => {
    localStorage.setItem("interflon-registrations", JSON.stringify(registrations))
  }, [registrations])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentUser || !selectedProduct || !location || !purpose) {
      return
    }

    setIsLoading(true)

    try {
      const now = new Date()
      const product = products.find((p) => p.name === selectedProduct)

      const newRegistration: Registration = {
        id: Date.now().toString(),
        productId: product?.id || "",
        productName: selectedProduct,
        user: currentUser,
        location,
        purpose,
        timestamp: now.toISOString(),
        qrcode: product?.qrcode,
      }

      setRegistrations((prev) => [newRegistration, ...prev])

      // Reset form
      setSelectedProduct("")
      setLocation("")
      setPurpose("")

      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (error) {
      console.error("Error saving registration:", error)
    }

    setIsLoading(false)
  }

  const addNewUser = () => {
    if (newUserName.trim() && !users.includes(newUserName.trim())) {
      setUsers((prev) => [...prev, newUserName.trim()])
      setNewUserName("")
    }
  }

  const addNewProduct = () => {
    if (newProductName.trim()) {
      const newProduct: Product = {
        id: Date.now().toString(),
        name: newProductName.trim(),
        qrcode: newProductQrCode.trim() || undefined,
        categoryId: newProductCategory === "none" ? undefined : newProductCategory,
      }
      setProducts((prev) => [newProduct, ...prev])
      setNewProductName("")
      setNewProductQrCode("")
      setNewProductCategory("none")
    }
  }

  const addNewLocation = () => {
    if (newLocationName.trim() && !locations.includes(newLocationName.trim())) {
      setLocations((prev) => [...prev, newLocationName.trim()])
      setNewLocationName("")
    }
  }

  const addNewPurpose = () => {
    if (newPurposeName.trim() && !purposes.includes(newPurposeName.trim())) {
      setPurposes((prev) => [...prev, newPurposeName.trim()])
      setNewPurposeName("")
    }
  }

  const addNewCategory = () => {
    if (newCategoryName.trim() && !categories.find((c) => c.name === newCategoryName.trim())) {
      const newCategory: Category = {
        id: Date.now().toString(),
        name: newCategoryName.trim(),
      }
      setCategories((prev) => [...prev, newCategory])
      setNewCategoryName("")
    }
  }

  const removeUser = (userToRemove: string) => {
    setUsers((prev) => prev.filter((u) => u !== userToRemove))
  }

  const removeProduct = (productToRemove: Product) => {
    setProducts((prev) => prev.filter((p) => p.id !== productToRemove.id))
  }

  const removeLocation = (locationToRemove: string) => {
    setLocations((prev) => prev.filter((l) => l !== locationToRemove))
  }

  const removePurpose = (purposeToRemove: string) => {
    setPurposes((prev) => prev.filter((p) => p !== purposeToRemove))
  }

  const removeCategory = (categoryToRemove: Category) => {
    setCategories((prev) => prev.filter((c) => c.id !== categoryToRemove.id))
  }

  const exportToCSV = () => {
    const headers = ["Datum", "Tijd", "Gebruiker", "Product", "QR Code", "Locatie", "Doel"]
    const csvContent = [
      headers.join(","),
      ...registrations.map((entry) => {
        const date = new Date(entry.timestamp)
        return [
          date.toLocaleDateString("nl-NL"),
          date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }),
          `"${entry.user}"`,
          `"${entry.productName}"`,
          `"${entry.qrcode || ""}"`,
          `"${entry.location}"`,
          `"${entry.purpose}"`,
        ].join(",")
      }),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `product-registraties-${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return "-"
    const category = categories.find((c) => c.id === categoryId)
    return category ? category.name : "-"
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center bg-white p-4 rounded-lg shadow-sm border">
                <div className="w-1 h-12 bg-amber-500 mr-4"></div>
                <div className="text-2xl font-bold text-gray-800 tracking-wide">DEMATIC</div>
              </div>
              <div className="text-center lg:text-left">
                <h1 className="text-3xl font-bold text-gray-900">Product Registratie</h1>
                <p className="text-gray-600 mt-1">Registreer product gebruik en locatie</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span>Lokale opslag actief</span>
              </div>
              <div>{registrations.length} registraties</div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {showSuccess && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">✅ Product succesvol geregistreerd!</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="register" className="space-y-6">
          <TabsList className="grid w-full grid-cols-8 bg-white border border-gray-200 shadow-sm">
            <TabsTrigger
              value="register"
              className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700"
            >
              Registreren
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700">
              Geschiedenis ({registrations.length})
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
                <CardDescription>Vul onderstaande gegevens in om een product te registreren</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                      <Label className="text-base font-medium">👤 Gebruiker</Label>
                      <Select value={currentUser} onValueChange={setCurrentUser} required>
                        <SelectTrigger className="h-12">
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
                      <Label className="text-base font-medium">📦 Product</Label>
                      <Select value={selectedProduct} onValueChange={setSelectedProduct} required>
                        <SelectTrigger className="h-12">
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
                    </div>

                    <div className="space-y-2">
                      <Label className="text-base font-medium">📍 Locatie</Label>
                      <Select value={location} onValueChange={setLocation} required>
                        <SelectTrigger className="h-12">
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
                      <Label className="text-base font-medium">🎯 Doel</Label>
                      <Select value={purpose} onValueChange={setPurpose} required>
                        <SelectTrigger className="h-12">
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
                    className="w-full bg-amber-600 hover:bg-amber-700 h-14 text-lg font-medium"
                    disabled={isLoading}
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
                <CardDescription>Bekijk alle product registraties</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <Button onClick={exportToCSV} className="bg-green-600 hover:bg-green-700">
                      <Download className="mr-2 h-4 w-4" /> Exporteer naar CSV
                    </Button>
                  </div>

                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead>Datum</TableHead>
                          <TableHead>Tijd</TableHead>
                          <TableHead>Gebruiker</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>QR Code</TableHead>
                          <TableHead>Categorie</TableHead>
                          <TableHead>Locatie</TableHead>
                          <TableHead>Doel</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {registrations.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                              Nog geen registraties
                            </TableCell>
                          </TableRow>
                        ) : (
                          registrations.map((entry) => {
                            const date = new Date(entry.timestamp)
                            const product = products.find((p) => p.name === entry.productName)
                            return (
                              <TableRow key={entry.id}>
                                <TableCell className="font-medium">{date.toLocaleDateString("nl-NL")}</TableCell>
                                <TableCell>
                                  {date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
                                </TableCell>
                                <TableCell>{entry.user}</TableCell>
                                <TableCell>{entry.productName}</TableCell>
                                <TableCell>
                                  {entry.qrcode ? (
                                    <Badge variant="outline" className="font-mono text-xs">
                                      {entry.qrcode}
                                    </Badge>
                                  ) : (
                                    "-"
                                  )}
                                </TableCell>
                                <TableCell>
                                  {product?.categoryId ? (
                                    <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                                      {getCategoryName(product.categoryId)}
                                    </Badge>
                                  ) : (
                                    "-"
                                  )}
                                </TableCell>
                                <TableCell>{entry.location}</TableCell>
                                <TableCell>{entry.purpose}</TableCell>
                              </TableRow>
                            )
                          })
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
                <CardTitle className="flex items-center gap-2 text-xl">👥 Gebruikers Beheren</CardTitle>
                <CardDescription>Voeg nieuwe gebruikers toe of verwijder bestaande</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Input
                      type="text"
                      placeholder="Nieuwe gebruiker"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                    />
                    <Button onClick={addNewUser}>
                      <Plus className="mr-2 h-4 w-4" /> Toevoegen
                    </Button>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Naam</TableHead>
                        <TableHead className="text-right">Acties</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user}>
                          <TableCell>{user}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="destructive" size="icon" onClick={() => removeUser(user)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <Card className="shadow-sm">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
                <CardTitle className="flex items-center gap-2 text-xl">📦 Producten Beheren</CardTitle>
                <CardDescription>Voeg nieuwe producten toe of verwijder bestaande</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input
                      type="text"
                      placeholder="Nieuw product"
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                    />
                    <Input
                      type="text"
                      placeholder="QR code (optioneel)"
                      value={newProductQrCode}
                      onChange={(e) => setNewProductQrCode(e.target.value)}
                    />
                    <Select value={newProductCategory} onValueChange={setNewProductCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer categorie" />
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
                  <Button onClick={addNewProduct}>
                    <Plus className="mr-2 h-4 w-4" /> Product Toevoegen
                  </Button>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Naam</TableHead>
                        <TableHead>QR Code</TableHead>
                        <TableHead>Categorie</TableHead>
                        <TableHead className="text-right">Acties</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>{product.name}</TableCell>
                          <TableCell>
                            {product.qrcode ? (
                              <Badge variant="outline" className="font-mono text-xs">
                                {product.qrcode}
                              </Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            {product.categoryId ? (
                              <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                                {getCategoryName(product.categoryId)}
                              </Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="destructive" size="icon" onClick={() => removeProduct(product)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories">
            <Card className="shadow-sm">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
                <CardTitle className="flex items-center gap-2 text-xl">🗂️ Categorieën Beheren</CardTitle>
                <CardDescription>Voeg nieuwe categorieën toe of verwijder bestaande</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Input
                      type="text"
                      placeholder="Nieuwe categorie"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                    />
                    <Button onClick={addNewCategory}>
                      <Plus className="mr-2 h-4 w-4" /> Toevoegen
                    </Button>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Naam</TableHead>
                        <TableHead className="text-right">Acties</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell>{category.name}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="destructive" size="icon" onClick={() => removeCategory(category)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="locations">
            <Card className="shadow-sm">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
                <CardTitle className="flex items-center gap-2 text-xl">📍 Locaties Beheren</CardTitle>
                <CardDescription>Voeg nieuwe locaties toe of verwijder bestaande</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Input
                      type="text"
                      placeholder="Nieuwe locatie"
                      value={newLocationName}
                      onChange={(e) => setNewLocationName(e.target.value)}
                    />
                    <Button onClick={addNewLocation}>
                      <Plus className="mr-2 h-4 w-4" /> Toevoegen
                    </Button>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Naam</TableHead>
                        <TableHead className="text-right">Acties</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {locations.map((location) => (
                        <TableRow key={location}>
                          <TableCell>{location}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="destructive" size="icon" onClick={() => removeLocation(location)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="purposes">
            <Card className="shadow-sm">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
                <CardTitle className="flex items-center gap-2 text-xl">🎯 Doelen Beheren</CardTitle>
                <CardDescription>Voeg nieuwe doelen toe of verwijder bestaande</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Input
                      type="text"
                      placeholder="Nieuw doel"
                      value={newPurposeName}
                      onChange={(e) => setNewPurposeName(e.target.value)}
                    />
                    <Button onClick={addNewPurpose}>
                      <Plus className="mr-2 h-4 w-4" /> Toevoegen
                    </Button>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Naam</TableHead>
                        <TableHead className="text-right">Acties</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purposes.map((purpose) => (
                        <TableRow key={purpose}>
                          <TableCell>{purpose}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="destructive" size="icon" onClick={() => removePurpose(purpose)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="statistics">
            <Card className="shadow-sm">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
                <CardTitle className="flex items-center gap-2 text-xl">📊 Statistieken</CardTitle>
                <CardDescription>Overzicht van product registraties</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle>Totaal Registraties</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{registrations.length}</div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle>Unieke Gebruikers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{new Set(registrations.map((r) => r.user)).size}</div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle>Unieke Producten</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{new Set(registrations.map((r) => r.productName)).size}</div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
