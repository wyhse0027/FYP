import { useState } from "react";
import { useNavigate } from "react-router-dom";
import http from "../../lib/http";
import TagsInput from "../../components/TagsInput";

export default function AddProductPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    category: "",
    price: "",
    stock: "",
    description: "",
    tags: [],
    promo_image: null,
    card_image: null,
    media: [],
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.files[0] });
  };

  const handleMediaChange = (e) => {
    setForm({ ...form, media: Array.from(e.target.files) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("category", form.category);
      fd.append("price", form.price);
      fd.append("stock", form.stock);
      fd.append("description", form.description);
      fd.append("tags", JSON.stringify(form.tags || []));

      if (form.promo_image) fd.append("promo_image_file", form.promo_image);
      if (form.card_image) fd.append("card_image_file", form.card_image);

      form.media.forEach((file) => fd.append("gallery_files", file));

      await http.post("/admin/products/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("✅ Product created!");
      navigate("/admin/products");
    } catch (err) {
      console.error("Create error:", err.response?.data || err.message);
      alert("❌ Failed to create product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c1a3a] text-white px-6 md:px-12 lg:px-16 py-8">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 p-2 rounded-full hover:bg-white/10"
      >
        ←
      </button>
      <h1 className="text-2xl font-bold mb-6">Add New Product</h1>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        <input name="name" placeholder="Name" value={form.name} onChange={handleChange} className="w-full p-2 rounded bg-white/10" />
        <input name="category" placeholder="Category" value={form.category} onChange={handleChange} className="w-full p-2 rounded bg-white/10" />
        <input name="price" type="number" placeholder="Price" value={form.price} onChange={handleChange} className="w-full p-2 rounded bg-white/10" />
        <input name="stock" type="number" placeholder="Stock" value={form.stock} onChange={handleChange} className="w-full p-2 rounded bg-white/10" />
        <textarea name="description" placeholder="Description" value={form.description} onChange={handleChange} className="w-full p-2 rounded bg-white/10" />

        <TagsInput tags={form.tags} setTags={(tags) => setForm({ ...form, tags })} />

        <label className="block">Promo Image: <input type="file" name="promo_image" onChange={handleFileChange} /></label>
        <label className="block">Card Image: <input type="file" name="card_image" onChange={handleFileChange} /></label>
        <label className="block">Media Gallery: <input type="file" multiple onChange={handleMediaChange} /></label>

        <button disabled={loading} type="submit" className="px-6 py-2 bg-green-600 rounded hover:bg-green-700 font-semibold">
          {loading ? "Saving..." : "Save Product"}
        </button>
      </form>
    </div>
  );
}
