import { Badge, Button, Container, Heading, Input, Label, Switch, Text, Textarea, toast, usePrompt } from "@medusajs/ui"
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { api, formatINR, Saree, SareeOptions, uploadPhoto } from "../../../lib/sarees-api"

/**
 * Add / edit one saree. Everything the website's product page shows is here,
 * in plain words, with one Save button. The web address (handle) is created
 * automatically and never shown.
 */

type Form = {
  title: string
  description: string
  published: boolean
  images: string[]
  price: string
  regular_price: string
  item_code: string
  stock: string
  collection_id: string
  category_ids: string[]
  occasion: string
  badge: string
  bestseller: boolean
  fabric: string
  colors: string[]
  fabric_details: string
  weave: string
  color_description: string
  length: string
  blouse_piece: string
  origin: string
  details: string[]
  care: string
}

const EMPTY: Form = {
  title: "", description: "", published: true, images: [], price: "", regular_price: "", item_code: "", stock: "1",
  collection_id: "", category_ids: [], occasion: "", badge: "", bestseller: false, fabric: "", colors: [],
  fabric_details: "", weave: "", color_description: "", length: "", blouse_piece: "", origin: "", details: [], care: "",
}

// What the website shows when a field is left empty (keep in sync with js/product-page.js).
const WEBSITE_DEFAULTS = {
  length: "6.3 Meters (includes unstitched blouse piece)",
  blouse_piece: "Included, unstitched (approx. 80 cm)",
  care: [
    "Dry clean only, preferably by a specialist experienced with silk and zari.",
    "Never spray alcohol-based perfumes or deodorants directly onto gold zari threads.",
    "Store folded in the muslin cloth it arrives in, away from direct sunlight.",
    "Change folds every 3 months to prevent creasing of heavy zari brocade.",
    "Iron on the reverse side only using low to medium silk temperature settings.",
  ].join("\n"),
}

const toForm = (s: Saree): Form => ({
  title: s.title, description: s.description, published: s.status === "published", images: s.images,
  price: s.price != null ? String(s.price) : "", regular_price: s.regular_price ? String(s.regular_price) : "",
  item_code: s.item_code, stock: s.stock != null ? String(s.stock) : "", collection_id: s.collection_id ?? "",
  category_ids: s.category_ids, occasion: s.occasion, badge: s.badge, bestseller: s.bestseller, fabric: s.fabric,
  colors: s.colors, fabric_details: s.fabric_details, weave: s.weave, color_description: s.color_description,
  length: s.length, blouse_piece: s.blouse_piece, origin: s.origin, details: s.details, care: s.care,
})

const wholeRupees = (v: string) => {
  const n = Number(String(v).replace(/[,\s₹]/g, ""))
  return v.trim() === "" || !Number.isFinite(n) ? null : Math.round(n)
}

const Section = ({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) => (
  <Container className="flex flex-col gap-y-4 p-6">
    <div>
      <Heading level="h2">{title}</Heading>
      {hint && <Text size="small" className="text-ui-fg-subtle mt-1">{hint}</Text>}
    </div>
    {children}
  </Container>
)

const Field = ({ label, hint, htmlFor, children }: { label: string; hint?: string; htmlFor?: string; children: ReactNode }) => (
  <div className="flex flex-col gap-y-1.5">
    <Label htmlFor={htmlFor} weight="plus">{label}</Label>
    {children}
    {hint && <Text size="xsmall" className="text-ui-fg-subtle">{hint}</Text>}
  </div>
)

const selectClass =
  "h-9 w-full rounded-md border border-ui-border-base bg-ui-bg-field px-3 text-sm text-ui-fg-base shadow-borders-base focus:outline-none focus:shadow-borders-interactive-with-active"

/** Type a word and press Enter (or click Add); click × to remove. Suggestions are one click. */
const TagInput = ({ id, values, onChange, suggestions, placeholder }: {
  id: string; values: string[]; onChange: (v: string[]) => void; suggestions: string[]; placeholder: string
}) => {
  const [draft, setDraft] = useState("")
  const add = (raw: string) => {
    const v = raw.trim()
    if (v && !values.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...values, v])
    setDraft("")
  }
  const unused = suggestions.filter((s) => !values.some((v) => v.toLowerCase() === s.toLowerCase()))
  return (
    <div className="flex flex-col gap-y-2">
      <div className="flex flex-wrap gap-2">
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full bg-ui-bg-component px-3 py-1 text-sm">
            {v}
            <button type="button" aria-label={`Remove ${v}`} className="text-ui-fg-muted hover:text-ui-fg-base" onClick={() => onChange(values.filter((x) => x !== v))}>×</button>
          </span>
        ))}
        {!values.length && <Text size="small" className="text-ui-fg-muted">None added yet.</Text>}
      </div>
      <div className="flex gap-2">
        <Input id={id} value={draft} placeholder={placeholder} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(draft) } }} />
        <Button type="button" variant="secondary" onClick={() => add(draft)} disabled={!draft.trim()}>Add</Button>
      </div>
      {unused.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <Text size="xsmall" className="text-ui-fg-subtle mr-1">Quick add:</Text>
          {unused.slice(0, 24).map((s) => (
            <button key={s} type="button" onClick={() => add(s)}
              className="rounded-full border border-ui-border-base px-2 py-0.5 text-xs hover:bg-ui-bg-base-hover">+ {s}</button>
          ))}
        </div>
      )}
    </div>
  )
}

/** A list of lines (bullet points) with add / remove / move. */
const LinesInput = ({ values, onChange }: { values: string[]; onChange: (v: string[]) => void }) => {
  const set = (i: number, v: string) => onChange(values.map((x, j) => (j === i ? v : x)))
  const move = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= values.length) return
    const next = [...values];
    [next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }
  return (
    <div className="flex flex-col gap-y-2">
      {values.map((v, i) => (
        <div key={i} className="flex items-center gap-2">
          <Text size="small" className="w-5 text-ui-fg-muted">{i + 1}.</Text>
          <Input value={v} onChange={(e) => set(i, e.target.value)} placeholder="e.g. Hand-woven zari border" />
          <Button type="button" size="small" variant="transparent" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</Button>
          <Button type="button" size="small" variant="transparent" onClick={() => move(i, 1)} disabled={i === values.length - 1} aria-label="Move down">↓</Button>
          <Button type="button" size="small" variant="transparent" onClick={() => onChange(values.filter((_, j) => j !== i))} aria-label="Remove line">×</Button>
        </div>
      ))}
      <div><Button type="button" variant="secondary" size="small" onClick={() => onChange([...values, ""])}>+ Add a line</Button></div>
    </div>
  )
}

const SareeEditorPage = () => {
  const { id = "new" } = useParams()
  const isNew = id === "new"
  const navigate = useNavigate()
  const prompt = usePrompt()
  const fileInput = useRef<HTMLInputElement>(null)

  const [options, setOptions] = useState<SareeOptions | null>(null)
  const [saree, setSaree] = useState<Saree | null>(null)
  const [form, setForm] = useState<Form>(EMPTY)
  const [initial, setInitial] = useState<Form>(EMPTY)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }))
  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initial), [form, initial])

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      const [opts, data] = await Promise.all([
        api<SareeOptions>("/admin/saree-options"),
        isNew ? Promise.resolve(null) : api<{ saree: Saree }>(`/admin/sarees/${id}`),
      ])
      setOptions(opts)
      if (data) {
        setSaree(data.saree)
        const f = toForm(data.saree)
        setForm(f)
        setInitial(f)
      } else {
        setSaree(null)
        setForm(EMPTY)
        setInitial(EMPTY)
      }
    } catch (err) {
      setLoadError((err as Error).message)
    }
  }, [id, isNew])

  useEffect(() => { load() }, [load])

  // Warn before closing the tab with unsaved changes.
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = "" }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [dirty])

  const price = wholeRupees(form.price)
  const regular = wholeRupees(form.regular_price)
  const discount = price && regular && regular > price ? Math.round(((regular - price) / regular) * 100) : 0
  const stock = wholeRupees(form.stock)
  const stockTracked = isNew || (saree?.stock_tracked ?? false)
  const multiVariant = (saree?.variant_count ?? 1) > 1

  const problems: string[] = []
  if (!form.title.trim()) problems.push("Give the saree a name.")
  if (!price || price < 1) problems.push("Enter the selling price.")
  if (form.regular_price.trim() && (regular == null || regular < 0)) problems.push("The regular price must be a number (or leave it empty).")
  if (stockTracked && (stock == null || stock < 0)) problems.push("Enter how many pieces you have (0 if sold out).")

  const goBack = async () => {
    if (dirty && !(await prompt({ title: "Leave without saving?", description: "Your changes to this saree will be lost.", confirmText: "Leave", cancelText: "Stay" }))) return
    navigate("/sarees")
  }

  const onPhotos = async (files: FileList | null) => {
    if (!files?.length) return
    const list = Array.from(files)
    const added: string[] = []
    for (const [i, file] of list.entries()) {
      setUploading(`Uploading photo ${i + 1} of ${list.length}…`)
      try {
        added.push(await uploadPhoto(file))
      } catch (err) {
        toast.error((err as Error).message)
      }
    }
    setUploading(null)
    if (added.length) {
      setForm((f) => ({ ...f, images: [...f.images, ...added] }))
      toast.success(`${added.length} photo${added.length > 1 ? "s" : ""} added. Click Save to keep ${added.length > 1 ? "them" : "it"}.`)
    }
    if (fileInput.current) fileInput.current.value = ""
  }

  const movePhoto = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= form.images.length) return
    const next = [...form.images];
    [next[i], next[j]] = [next[j], next[i]]
    set("images", next)
  }

  const save = async () => {
    if (problems.length) {
      toast.error(problems[0])
      return
    }
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description,
        status: form.published ? "published" : "draft",
        images: form.images,
        price,
        regular_price: regular && regular > 0 ? regular : null,
        item_code: form.item_code.trim(),
        collection_id: form.collection_id || null,
        category_ids: form.category_ids,
        occasion: form.occasion,
        badge: form.badge,
        bestseller: form.bestseller,
        fabric: form.fabric.trim(),
        colors: form.colors,
        fabric_details: form.fabric_details,
        weave: form.weave,
        color_description: form.color_description,
        length: form.length,
        blouse_piece: form.blouse_piece,
        origin: form.origin,
        details: form.details.map((d) => d.trim()).filter(Boolean),
        care: form.care,
      }
      if (stockTracked) body.stock = stock ?? 0
      const data = isNew
        ? await api<{ saree: Saree }>("/admin/sarees", { method: "POST", body })
        : await api<{ saree: Saree }>(`/admin/sarees/${id}`, { method: "POST", body })
      const f = toForm(data.saree)
      setSaree(data.saree)
      setForm(f)
      setInitial(f)
      toast.success(isNew ? "Saree added to your website." : "Saved. The website shows the changes on the next page load.")
      if (isNew) navigate(`/sarees/${data.saree.id}`, { replace: true })
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!saree) return
    const yes = await prompt({
      title: `Delete "${saree.title}"?`,
      description: "It will be removed from your website and from Medusa. This can't be undone. To keep it but hide it, turn off \"Show on website\" instead.",
      confirmText: "Delete saree",
      cancelText: "Keep it",
    })
    if (!yes) return
    try {
      await api(`/admin/sarees/${saree.id}`, { method: "DELETE" })
      setInitial(form)
      toast.success("Saree deleted.")
      navigate("/sarees")
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  if (loadError) {
    return (
      <Container className="p-6">
        <Heading level="h2">Couldn't open this saree</Heading>
        <Text className="text-ui-fg-error mt-2">{loadError}</Text>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" onClick={load}>Try again</Button>
          <Button variant="transparent" onClick={() => navigate("/sarees")}>Back to all sarees</Button>
        </div>
      </Container>
    )
  }
  if (!options) {
    return <Container className="p-6"><Text>Loading…</Text></Container>
  }

  const topCategories = options.categories.filter((c) => !c.parent_id).sort((a, b) => a.name.localeCompare(b.name))
  const childrenOf = (pid: string) => options.categories.filter((c) => c.parent_id === pid).sort((a, b) => (a.rank - b.rank) || a.name.localeCompare(b.name))
  const toggleCategory = (cid: string, on: boolean) =>
    set("category_ids", on ? [...new Set([...form.category_ids, cid])] : form.category_ids.filter((x) => x !== cid))

  return (
    <div className="flex flex-col gap-y-3 pb-24">
      <Container className="flex flex-wrap items-center justify-between gap-3 p-6">
        <div className="flex flex-col gap-1">
          <button type="button" onClick={goBack} className="text-left text-sm text-ui-fg-subtle hover:text-ui-fg-base">← All sarees</button>
          <Heading level="h1">{isNew ? "Add a saree" : form.title || "Untitled saree"}</Heading>
          {!isNew && (
            <div className="flex gap-1">
              {form.published ? <Badge size="2xsmall" color="green">Showing on website</Badge> : <Badge size="2xsmall" color="grey">Hidden from website</Badge>}
              {stockTracked && (stock ?? 0) <= 0 && <Badge size="2xsmall" color="red">Sold out</Badge>}
            </div>
          )}
        </div>
        <Button size="large" onClick={save} isLoading={saving} disabled={multiVariant || !!uploading}>
          {isNew ? "Add saree" : "Save changes"}
        </Button>
      </Container>

      {multiVariant && (
        <Container className="p-6">
          <Text className="text-ui-fg-error">
            This saree has more than one variant, so it can only be edited on Medusa's own product page (Products).
          </Text>
        </Container>
      )}

      <Section title="1. Photos" hint="The first photo is the main picture on the website. Use the arrows to change the order.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {form.images.map((url, i) => (
            <div key={url + i} className="flex flex-col gap-1 rounded-lg border border-ui-border-base p-1">
              <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-ui-bg-subtle">
                <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                {i === 0 && <span className="absolute left-1 top-1 rounded bg-ui-bg-base px-1.5 py-0.5 text-[10px] font-medium">Main photo</span>}
              </div>
              <div className="flex justify-between">
                <Button size="small" variant="transparent" onClick={() => movePhoto(i, -1)} disabled={i === 0} aria-label="Move left">←</Button>
                <Button size="small" variant="transparent" onClick={() => set("images", form.images.filter((_, j) => j !== i))} aria-label="Remove photo">Remove</Button>
                <Button size="small" variant="transparent" onClick={() => movePhoto(i, 1)} disabled={i === form.images.length - 1} aria-label="Move right">→</Button>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => fileInput.current?.click()} disabled={!!uploading}
            className="flex aspect-[3/4] flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-ui-border-strong text-ui-fg-subtle hover:bg-ui-bg-base-hover">
            <span className="text-3xl">+</span>
            <span className="text-sm">{uploading ?? "Add photos"}</span>
          </button>
        </div>
        <input ref={fileInput} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onPhotos(e.target.files)} />
      </Section>

      <Section title="2. Name and description">
        <Field label="Saree name" htmlFor="s-title">
          <Input id="s-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Mustard Yellow & Coffee Zari Border Saree" />
        </Field>
        <Field label="Description" hint="A few sentences shown under the name on the website." htmlFor="s-desc">
          <Textarea id="s-desc" rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
      </Section>

      <Section title="3. Price" hint="Customers pay the selling price. Add a regular price only if you want to show a discount.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Selling price (₹)" hint="What the customer pays." htmlFor="s-price">
            <Input id="s-price" inputMode="numeric" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="e.g. 8500" />
          </Field>
          <Field label="Regular price (₹) — optional" hint="Leave empty for no discount." htmlFor="s-regular">
            <Input id="s-regular" inputMode="numeric" value={form.regular_price} onChange={(e) => set("regular_price", e.target.value)} placeholder="e.g. 10000" />
          </Field>
        </div>
        <div className="rounded-lg bg-ui-bg-subtle p-4">
          <Text size="small" className="text-ui-fg-subtle">Customers will see:</Text>
          {price ? (
            <div className="mt-1 flex flex-wrap items-baseline gap-3">
              <span className="text-2xl font-semibold">{formatINR(price)}</span>
              {discount > 0 && <>
                <span className="text-ui-fg-muted line-through">{formatINR(regular)}</span>
                <Badge color="green">Save {discount}%</Badge>
              </>}
            </div>
          ) : <Text>Enter a selling price.</Text>}
          {regular != null && price != null && regular > 0 && regular <= price && (
            <Text size="small" className="mt-2 text-ui-fg-subtle">No discount will show: the regular price must be higher than the selling price.</Text>
          )}
        </div>
      </Section>

      <Section title="4. Stock and item code">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {stockTracked ? (
            <Field label="Pieces in stock" hint={`Put 0 when it's sold out.${saree?.reserved ? ` ${saree.reserved} more are reserved by orders.` : ""}`} htmlFor="s-stock">
              <div className="flex items-center gap-2">
                <Input id="s-stock" inputMode="numeric" value={form.stock} onChange={(e) => set("stock", e.target.value)} />
                {(stock ?? 0) <= 0 ? <Badge color="red">Sold out</Badge> : <Badge color="green">In stock</Badge>}
              </div>
            </Field>
          ) : (
            <Field label="Pieces in stock"><Text size="small" className="text-ui-fg-subtle">Stock isn't tracked for this saree.</Text></Field>
          )}
          <Field label="Item code" hint="Your own code for this saree (also shown in Inventory). Must be different for every saree." htmlFor="s-code">
            <Input id="s-code" value={form.item_code} onChange={(e) => set("item_code", e.target.value)} placeholder="e.g. PMS-0085" />
          </Field>
        </div>
      </Section>

      <Section title="5. Where it shows on the website">
        <div className="flex items-center gap-3">
          <Switch id="s-pub" checked={form.published} onCheckedChange={(v) => set("published", v)} />
          <Label htmlFor="s-pub">{form.published ? "Show on website" : "Hidden from website"}</Label>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Collection" htmlFor="s-col">
            <select id="s-col" className={selectClass} value={form.collection_id} onChange={(e) => set("collection_id", e.target.value)}>
              <option value="">— None —</option>
              {options.collections.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </Field>
          <Field label="Occasion" htmlFor="s-occ">
            <select id="s-occ" className={selectClass} value={form.occasion} onChange={(e) => set("occasion", e.target.value)}>
              <option value="">— None —</option>
              {[...new Set([...options.occasions, ...(form.occasion ? [form.occasion] : [])])].map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Label on the photo — optional" hint="A short word shown on the saree's photo, e.g. New, Bestseller, Pichwai Art." htmlFor="s-badge">
            <Input id="s-badge" value={form.badge} onChange={(e) => set("badge", e.target.value)} />
          </Field>
          <div className="flex items-center gap-3 pt-6">
            <Switch id="s-best" checked={form.bestseller} onCheckedChange={(v) => set("bestseller", v)} />
            <Label htmlFor="s-best">Bestseller (listed first when sorting by bestselling)</Label>
          </div>
        </div>
        <Field label="Categories" hint="Tick every category this saree belongs to.">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topCategories.map((top) => (
              <div key={top.id} className="rounded-lg border border-ui-border-base p-3">
                <label className="flex items-center gap-2 font-medium">
                  <input type="checkbox" className="h-4 w-4" checked={form.category_ids.includes(top.id)} onChange={(e) => toggleCategory(top.id, e.target.checked)} />
                  {top.name}
                </label>
                {childrenOf(top.id).map((c) => (
                  <label key={c.id} className="ml-6 mt-1.5 flex items-center gap-2 text-sm">
                    <input type="checkbox" className="h-4 w-4" checked={form.category_ids.includes(c.id)} onChange={(e) => toggleCategory(c.id, e.target.checked)} />
                    {c.name}
                  </label>
                ))}
              </div>
            ))}
          </div>
        </Field>
      </Section>

      <Section title="6. Fabric and colours" hint="These are used by the Fabric and Colour filters on the website.">
        <Field label="Fabric" hint="Pick one, or type a new fabric." htmlFor="s-fabric">
          <Input id="s-fabric" list="s-fabric-list" value={form.fabric} onChange={(e) => set("fabric", e.target.value)} placeholder="e.g. Kanjivaram Silk" />
          <datalist id="s-fabric-list">{options.fabrics.map((f) => <option key={f} value={f} />)}</datalist>
          <div className="flex flex-wrap gap-1">
            {options.fabrics.map((f) => (
              <button key={f} type="button" onClick={() => set("fabric", f)}
                className={`rounded-full border px-2 py-0.5 text-xs ${f.toLowerCase() === form.fabric.trim().toLowerCase() ? "border-ui-border-interactive bg-ui-bg-highlight" : "border-ui-border-base hover:bg-ui-bg-base-hover"}`}>{f}</button>
            ))}
          </div>
        </Field>
        <Field label="Colours" hint="Add every colour in this saree. Type a colour and press Enter.">
          <TagInput id="s-colors" values={form.colors} onChange={(v) => set("colors", v)} suggestions={options.colors} placeholder="e.g. Ruby Red" />
        </Field>
      </Section>

      <Section title="7. Product details" hint={'Shown in "Product Details & Specifications" on the saree\'s page. Leave a box empty to hide that line (or to use the shop\'s standard text where shown).'}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Fabric (full description)" hint="e.g. Pure Mulberry Katan Silk. Empty = the Fabric above." htmlFor="s-fd">
            <Input id="s-fd" value={form.fabric_details} onChange={(e) => set("fabric_details", e.target.value)} />
          </Field>
          <Field label="Weave & motif" htmlFor="s-weave">
            <Input id="s-weave" value={form.weave} onChange={(e) => set("weave", e.target.value)} placeholder="e.g. Pichwai Kamdhenu, Lotus & Tassel Finish" />
          </Field>
          <Field label="Colour (description)" hint="e.g. Mauve Rose & Gold Zari Pallu. Empty = the colours above." htmlFor="s-cd">
            <Input id="s-cd" value={form.color_description} onChange={(e) => set("color_description", e.target.value)} />
          </Field>
          <Field label="Saree length" hint={`Empty = "${WEBSITE_DEFAULTS.length}"`} htmlFor="s-len">
            <Input id="s-len" value={form.length} onChange={(e) => set("length", e.target.value)} placeholder={WEBSITE_DEFAULTS.length} />
          </Field>
          <Field label="Blouse piece" hint={`Empty = "${WEBSITE_DEFAULTS.blouse_piece}"`} htmlFor="s-blouse">
            <Input id="s-blouse" value={form.blouse_piece} onChange={(e) => set("blouse_piece", e.target.value)} placeholder={WEBSITE_DEFAULTS.blouse_piece} />
          </Field>
          <Field label="Origin (where it's woven)" htmlFor="s-origin">
            <Input id="s-origin" value={form.origin} onChange={(e) => set("origin", e.target.value)} placeholder="e.g. Kanchipuram, Tamil Nadu" />
          </Field>
        </div>
      </Section>

      <Section title="8. Design & artisan craftsmanship" hint={'The bullet points under "Design & Artisan Craftsmanship" on the saree\'s page.'}>
        <LinesInput values={form.details} onChange={(v) => set("details", v)} />
      </Section>

      <Section title="9. Material & care instructions" hint={'Shown as bullet points under "Material & Care Instructions". One instruction per line. Empty = the shop\'s standard care text (shown faded below).'}>
        <Textarea rows={6} value={form.care} onChange={(e) => set("care", e.target.value)} placeholder={WEBSITE_DEFAULTS.care} />
      </Section>

      {!isNew && saree && (
        <Section title="Delete this saree" hint={'Removes it permanently. To keep it but stop showing it, turn off "Show on website" in section 5 instead.'}>
          <div><Button variant="danger" onClick={remove}>Delete saree</Button></div>
        </Section>
      )}

      <div className="fixed bottom-0 right-0 z-10 flex w-full items-center justify-end gap-3 border-t border-ui-border-base bg-ui-bg-base px-6 py-3 md:w-[calc(100%-220px)]">
        <Text size="small" className="text-ui-fg-subtle">
          {uploading ?? (problems.length ? problems[0] : dirty ? "You have unsaved changes." : "All changes saved.")}
        </Text>
        <Button variant="secondary" onClick={goBack}>Back</Button>
        <Button onClick={save} isLoading={saving} disabled={multiVariant || !!uploading || !dirty && !isNew}>
          {isNew ? "Add saree" : "Save changes"}
        </Button>
      </div>
    </div>
  )
}

export default SareeEditorPage
