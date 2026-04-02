import { useState } from "react";
import { uploadMenuApi } from "./menu.api";

export default function MenuUpload() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFile = (e) => {
    const selected = e.target.files[0];

    if (!selected) return;

    if (selected.type !== "application/pdf") {
      alert("Only PDF allowed");
      return;
    }

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const handleUpload = async () => {
    if (!file) return alert("Select file");

    setLoading(true);

    const [data, error] = await uploadMenuApi(file);

    setLoading(false);

    if (error) {
      alert(error);
      return;
    }

    alert("Uploaded successfully");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Upload Menu</h1>

      <div className="border-2 border-dashed p-6 rounded-xl text-center">
        <input type="file" accept="application/pdf" onChange={handleFile} />
        <p className="text-sm text-gray-500 mt-2">
          Upload your PDF menu
        </p>
      </div>

      {preview && (
        <div className="bg-white shadow rounded-xl overflow-hidden">
          <iframe src={preview} className="w-full h-125" />
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={loading}
        className="bg-black text-white px-6 py-2 rounded-xl disabled:opacity-50"
      >
        {loading ? "Uploading..." : "Upload Menu"}
      </button>
    </div>
  );
}