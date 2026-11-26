import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { AdminProduct, DetailWidgetProps } from "@medusajs/framework/types"
import { Button, Container, Text } from "@medusajs/ui"
import { useNavigate } from "react-router-dom"

/** On Medusa's own product page: a shortcut to the simple Sarees editor. */
const ProductSimpleEditorLink = ({ data: product }: DetailWidgetProps<AdminProduct>) => {
  const navigate = useNavigate()
  return (
    <Container className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
      <Text size="small" className="text-ui-fg-subtle">
        Edit photos, price, stock, fabric, colours and every product detail on one simple page.
      </Text>
      <Button size="small" onClick={() => navigate(`/sarees/${product.id}`)}>Open in the simple Sarees editor</Button>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details",
})

export default ProductSimpleEditorLink
