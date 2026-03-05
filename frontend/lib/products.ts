export type Product = {
    id: string;
    name: string;
    price: number;
    category: string;
    description: string;
    details: string[];
    image: string;
    badge?: string;
};

export const categories = ["All", "Watches", "Bags", "Accessories", "Shoes", "Fragrance"];

export const products: Product[] = [
    {
        id: "chrono-noir",
        name: "Chronograph Noir",
        price: 4250,
        category: "Watches",
        description: "A masterpiece of precision engineering. The Chronograph Noir features a 42mm case in brushed black titanium with a sapphire crystal exhibition caseback.",
        details: ["42mm brushed titanium case", "Swiss automatic movement", "Sapphire crystal", "100m water resistance", "Alligator leather strap"],
        image: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=600&h=600&fit=crop",
        badge: "Bestseller",
    },
    {
        id: "heritage-gold",
        name: "Heritage Gold",
        price: 8900,
        category: "Watches",
        description: "An icon reimagined. The Heritage Gold blends 18k rose gold with modern complications in a timepiece that transcends generations.",
        details: ["40mm 18k rose gold case", "In-house caliber movement", "Moon phase complication", "50m water resistance", "Hand-stitched calfskin strap"],
        image: "https://images.unsplash.com/photo-1548169874-53e85f753f1e?w=600&h=600&fit=crop",
    },
    {
        id: "maison-tote",
        name: "Maison Tote",
        price: 2850,
        category: "Bags",
        description: "Crafted from the finest full-grain leather, the Maison Tote is an everyday companion for the modern connoisseur.",
        details: ["Full-grain Italian leather", "Cotton twill lining", "Brass hardware", "Interior zip pocket", "Handcrafted in Italy"],
        image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&h=600&fit=crop",
        badge: "New",
    },
    {
        id: "voyager-weekender",
        name: "Voyager Weekender",
        price: 3600,
        category: "Bags",
        description: "The ultimate travel companion. Supple leather meets thoughtful design in a bag built for those who move with purpose.",
        details: ["Vegetable-tanned leather", "Padded laptop compartment", "Detachable shoulder strap", "Dust bag included", "Monogram available"],
        image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&h=600&fit=crop",
    },
    {
        id: "silk-cravat",
        name: "Silk Cravat",
        price: 420,
        category: "Accessories",
        description: "Hand-rolled edges on pure mulberry silk. Each cravat is printed using traditional methods passed down through artisan families.",
        details: ["100% mulberry silk", "Hand-rolled edges", "Artisan printed", "Gift box included", "Made in Como, Italy"],
        image: "https://images.unsplash.com/photo-1589756823695-278bc923a351?w=600&h=600&fit=crop",
    },
    {
        id: "onyx-cufflinks",
        name: "Onyx Cufflinks",
        price: 680,
        category: "Accessories",
        description: "Polished black onyx set in sterling silver. A subtle statement of refined taste for formal occasions.",
        details: ["Sterling silver setting", "Natural black onyx", "T-bar closure", "Presentation box", "Hallmarked"],
        image: "https://images.unsplash.com/photo-1611085583191-a3b181a88401?w=600&h=600&fit=crop",
        badge: "Limited",
    },
    {
        id: "artisan-oxford",
        name: "Artisan Oxford",
        price: 1250,
        category: "Shoes",
        description: "Blake-stitched on heritage lasts. Each pair of Artisan Oxfords is hand-burnished over three days to achieve an unparalleled patina.",
        details: ["Hand-burnished calfskin", "Blake stitch construction", "Leather sole with rubber insert", "Cedar shoe trees included", "Made in England"],
        image: "https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=600&h=600&fit=crop",
    },
    {
        id: "suede-loafer",
        name: "Suede Loafer",
        price: 890,
        category: "Shoes",
        description: "Effortless elegance. The Suede Loafer is unlined for a soft, flexible feel that molds to your foot over time.",
        details: ["Italian suede upper", "Unlined construction", "Leather sole", "Hand-sewn apron", "Made in Italy"],
        image: "https://images.unsplash.com/photo-1582897085656-c636d006a246?w=600&h=600&fit=crop",
    },
    {
        id: "noir-absolute",
        name: "Noir Absolut",
        price: 320,
        category: "Fragrance",
        description: "A bold opening of black pepper and cardamom gives way to a heart of oud and leather, finished with smoky vetiver.",
        details: ["100ml Eau de Parfum", "Top: Black pepper, cardamom", "Heart: Oud, leather", "Base: Vetiver, amber", "Hand-poured in Grasse"],
        image: "https://images.unsplash.com/photo-1594035910387-fea081d65ace?w=600&h=600&fit=crop",
        badge: "Signature",
    },
    {
        id: "cedar-vetiver",
        name: "Cèdre & Vetiver",
        price: 280,
        category: "Fragrance",
        description: "A refined composition where noble cedar wood meets earthy vetiver, creating a scent that is both grounding and uplifting.",
        details: ["50ml Eau de Parfum", "Top: Bergamot, pink pepper", "Heart: Atlas cedar", "Base: Vetiver, musk", "Refillable bottle"],
        image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&h=600&fit=crop",
    },
];

export function getProduct(id: string): Product | undefined {
    return products.find((p) => p.id === id);
}

export function getProductsByCategory(category: string): Product[] {
    if (category === "All") return products;
    return products.filter((p) => p.category === category);
}
