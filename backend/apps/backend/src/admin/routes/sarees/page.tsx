import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Swatch } from "@medusajs/icons"
import { Badge, Button, Container, Heading, Input, Text } from "@medusajs/ui"
import { useCallback, useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { api, formatINR, Saree } from "../../lib/sarees-api"

const PAGE = 40

/**
 * Sarees: the simple list of every saree. Click one to edit it, or "Add a saree".
 */
const SareesPage = () => {
  const navigate = useNavigate()
  const [sarees, setSarees] = useState<Saree[]>([])
  const [count, setCount] = useState(0)
  const [search, setSearch] = useState("")
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Only the newest request may update the list, so a slow earlier load can't
  // replace the results of a search typed after it.
  const latest = useRef(0)
  const load = useCallback(async (q: string, offset: number) => {
    const ticket = ++latest.current
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ limit: String(PAGE), offset: String(offset) })
      if (q) params.set("q", q)
      const data = await api<{ sarees: Saree[]; count: number }>(`/admin/sarees?${params}`)
      if (ticket !== latest.current) return
      setSarees((prev) => (offset ? [...prev, ...data.sarees] : data.sarees))
      setCount(data.count)
    } catch (err) {
      if (ticket === latest.current) setError((err as Error).message)
    } finally {
      if (ticket === latest.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    load(query, 0)
  }, [query, load])

  return (
    <Container className="flex flex-col gap-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Heading level="h1">Sarees</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Every saree on your website. Click a saree to change its photos, price, stock or details.
          </Text>
        </div>
        <Button size="large" onClick={() => navigate("/sarees/new")}>+ Add a saree</Button>
      </div>

      <Input
        type="search"
        size="base"
        placeholder="Search by name or item code…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {error && (
        <div className="rounded-lg border border-ui-border-error bg-ui-bg-subtle p-4">
          <Text className="text-ui-fg-error">{error}</Text>
          <Button size="small" variant="secondary" className="mt-2" onClick={() => load(query, 0)}>Try again</Button>
        </div>
      )}

      {!error && !loading && sarees.length === 0 && (
        <Text className="text-ui-fg-subtle">
          {query ? `No sarees match "${query}".` : "No sarees yet. Click \"Add a saree\" to add your first one."}
        </Text>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {!error && sarees.map((s) => {
          const soldOut = s.stock_tracked && (s.stock ?? 0) <= 0
          return (
            <Link
              key={s.id}
              to={`/sarees/${s.id}`}
              className="flex gap-3 rounded-lg border border-ui-border-base bg-ui-bg-base p-3 transition-colors hover:bg-ui-bg-base-hover"
            >
              <div className="h-24 w-20 flex-none overflow-hidden rounded-md bg-ui-bg-subtle">
                {s.images[0] ? (
                  <img src={s.images[0]} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full items-center justify-center text-ui-fg-muted text-xs">No photo</div>
                )}
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <Text weight="plus" className="truncate">{s.title}</Text>
                <Text size="small" className="text-ui-fg-subtle">
                  {formatINR(s.price)}
                  {s.discount_percent > 0 && <span className="ml-1 text-ui-fg-interactive">({s.discount_percent}% off)</span>}
                </Text>
                <Text size="xsmall" className="text-ui-fg-muted truncate">
                  {s.item_code ? `Item code: ${s.item_code}` : "No item code"}
                </Text>
                <div className="flex flex-wrap gap-1">
                  {s.status === "published" ? (
                    <Badge size="2xsmall" color="green">On website</Badge>
                  ) : (
                    <Badge size="2xsmall" color="grey">Hidden</Badge>
                  )}
                  {s.stock_tracked && (
                    soldOut ? <Badge size="2xsmall" color="red">Sold out</Badge>
                      : <Badge size="2xsmall" color="blue">{s.stock} in stock</Badge>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {loading && <Text className="text-ui-fg-subtle">Loading sarees…</Text>}
      {!loading && !error && sarees.length < count && (
        <Button variant="secondary" onClick={() => load(query, sarees.length)}>Show more sarees</Button>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Sarees",
  icon: Swatch,
})

export default SareesPage
