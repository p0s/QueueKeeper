"use client";

import { useEffect, useState } from "react";

type PreviewItem = {
  name: string;
  type: string;
  url: string;
};

export function FilePreviewGrid({ files }: { files: File[] }) {
  const [previews, setPreviews] = useState<PreviewItem[]>([]);

  useEffect(() => {
    const next = files.map((file) => ({
      name: file.name,
      type: file.type || "application/octet-stream",
      url: URL.createObjectURL(file)
    }));
    setPreviews(next);

    return () => {
      next.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [files]);

  if (previews.length === 0) {
    return null;
  }

  return (
    <div className="proof-grid">
      {previews.map((preview) => (
        <div key={`${preview.name}-${preview.url}`} className="file-preview-card">
          {preview.type.startsWith("image/") ? <img alt={preview.name} src={preview.url} /> : null}
          <strong>{preview.name}</strong>
          <span className="muted">{preview.type}</span>
        </div>
      ))}
    </div>
  );
}
