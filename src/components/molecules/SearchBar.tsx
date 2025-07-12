// src/components/molecules/SearchBar.tsx
import { useState, useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { Card } from '@/components/atoms/Card'
import { Text } from '@/components/atoms/Text'
import { Button } from '@/components/atoms/Button'
import { Icon } from '@/components/atoms/Icon'
import { cn } from '@/lib/utils'

interface SearchResult {
  id: number
  nom_fournisseur: string
  code_fournisseur: string
  nom_pharmacie: string
}

interface SearchBarProps {
  data: SearchResult[]
  onSelect: (item: SearchResult | null) => void
  placeholder?: string
  className?: string
  loading?: boolean
}

export function SearchBar({ 
  data, 
  onSelect, 
  placeholder = "Rechercher un laboratoire...",
  className,
  loading = false
}: SearchBarProps): React.ReactElement {
  const [query, setQuery] = useState<string>('')
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredData = data.filter(item =>
    item.nom_fournisseur.toLowerCase().includes(query.toLowerCase()) ||
    item.code_fournisseur.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 10) // Limite à 10 résultats

  const handleSelect = (item: SearchResult): void => {
    setSelectedItem(item)
    setQuery(item.nom_fournisseur)
    setIsOpen(false)
    onSelect(item)
  }

  const handleClear = (): void => {
    setQuery('')
    setSelectedItem(null)
    setIsOpen(false)
    onSelect(null)
    inputRef.current?.focus()
  }

  const handleInputChange = (value: string): void => {
    setQuery(value)
    setIsOpen(value.length > 0)
    if (value === '') {
      setSelectedItem(null)
      onSelect(null)
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.closest('.search-container')?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={cn("relative search-container", className)}>
      <Card variant="default" className="relative">
        <div className="flex items-center px-4 py-3">
          <Icon icon={Search} variant="muted" size="sm" className="mr-3" />
          
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => query.length > 0 && setIsOpen(true)}
            placeholder={placeholder}
            disabled={loading}
            className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 placeholder-gray-500 disabled:opacity-50"
          />
          
          {query && (
            <Button variant="ghost" size="sm" onClick={handleClear}>
              <Icon icon={X} variant="muted" size="sm" />
            </Button>
          )}
        </div>

        {selectedItem && (
          <div className="px-4 pb-2">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span>Sélectionné:</span>
              <span className="font-medium">{selectedItem.code_fournisseur}</span>
              <span>•</span>
              <span>{selectedItem.nom_pharmacie}</span>
            </div>
          </div>
        )}
      </Card>

      {/* Dropdown Results */}
      {isOpen && (
        <Card variant="elevated" className="absolute top-full left-0 right-0 mt-2 z-50 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center">
              <Text variant="caption" color="muted">Chargement...</Text>
            </div>
          ) : filteredData.length > 0 ? (
            <div className="py-2">
              {filteredData.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors duration-150"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <Text variant="body" weight="medium" className="mb-1">
                        {item.nom_fournisseur}
                      </Text>
                      <Text variant="caption" color="muted">
                        Code: {item.code_fournisseur} • {item.nom_pharmacie}
                      </Text>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : query.length > 0 ? (
            <div className="p-4 text-center">
              <Text variant="caption" color="muted">Aucun laboratoire trouvé</Text>
            </div>
          ) : null}
        </Card>
      )}
    </div>
  )
}