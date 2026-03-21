import ProductForm from "../../components/ProductForm";

export default function NewProductPage() {
  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground mb-3">New Product</p>
        <h1 className="font-serif text-5xl tracking-tight">Create a new listing.</h1>
        <p className="mt-3 text-muted-foreground">Fill in product details, colors, variants, and images.</p>
      </div>
      <ProductForm />
    </div>
  );
}
