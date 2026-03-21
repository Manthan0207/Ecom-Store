import ProductForm from "../../components/ProductForm";

export default function EditProductPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground mb-3">Edit Product</p>
        <h1 className="font-serif text-5xl tracking-tight">Refine your listing.</h1>
        <p className="mt-3 text-muted-foreground">Update pricing, colors, inventory, and imagery.</p>
      </div>
      <ProductForm productId={params.id} />
    </div>
  );
}
