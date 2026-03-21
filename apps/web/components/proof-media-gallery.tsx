"use client";

import { useState } from "react";

type ProofMedia = {
  filename: string;
  mimeType: string;
  dataUrl: string;
};

export function ProofMediaGallery({
  media,
  title = "Proof media"
}: {
  media: ProofMedia[];
  title?: string;
}) {
  const [selected, setSelected] = useState<ProofMedia | null>(null);

  if (media.length === 0) {
    return <p className="muted">No proof media attached.</p>;
  }

  return (
    <>
      <div className="proof-grid">
        {media.map((item) => {
          const isImage = item.mimeType.startsWith("image/");
          return (
            <button
              key={`${item.filename}-${item.dataUrl.length}`}
              className="thumb-button"
              onClick={() => setSelected(item)}
              type="button"
            >
              {isImage ? (
                <img alt={item.filename} className="proof-thumb" src={item.dataUrl} />
              ) : (
                <div className="file-preview-card">
                  <strong>{item.filename}</strong>
                  <span className="muted">{item.mimeType}</span>
                </div>
              )}
              <span className="thumb-caption">{item.filename}</span>
            </button>
          );
        })}
      </div>
      {selected ? (
        <div
          aria-modal="true"
          className="media-modal-backdrop"
          onClick={() => setSelected(null)}
          role="dialog"
        >
          <div className="media-modal" onClick={(event) => event.stopPropagation()}>
            <div className="media-modal-header">
              <div className="stack-tight">
                <span className="eyebrow">{title}</span>
                <strong>{selected.filename}</strong>
                <span className="muted">{selected.mimeType}</span>
              </div>
              <button className="button secondary" onClick={() => setSelected(null)} type="button">
                Close
              </button>
            </div>
            {selected.mimeType.startsWith("image/") ? (
              <img alt={selected.filename} src={selected.dataUrl} />
            ) : (
              <div className="file-preview-card">
                <strong>{selected.filename}</strong>
                <span className="muted">Preview unavailable for this media type.</span>
                <a className="button secondary" download={selected.filename} href={selected.dataUrl}>
                  Download file
                </a>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
