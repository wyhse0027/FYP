// src/components/TagsInput.js
import { useState, useEffect } from "react";

export default function TagsInput({ tags, setTags }) {
  const [input, setInput] = useState("");

  // Debug: whenever tags change
  useEffect(() => {
    console.log("🎯 TagsInput received tags:", tags);
  }, [tags]);

  const addTag = () => {
    const val = input.trim();
    if (val && !tags.includes(val)) {
      console.log("➕ Adding tag:", val);
      setTags([...tags, val]);
    }
    setInput("");
  };

  const removeTag = (tag) => {
    console.log("🗑 Removing tag:", tag);
    setTags(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className="p-2 bg-white/10 rounded">
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag, i) => (
          <span
            key={i}
            className="bg-blue-700/60 text-white px-3 py-1 rounded-full text-sm flex items-center gap-1"
          >
            {tag}
            <button
              onClick={() => removeTag(tag)}
              className="ml-1 text-xs hover:text-red-400"
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type tag & press Enter"
        className="w-full p-2 bg-transparent outline-none"
      />
    </div>
  );
}
