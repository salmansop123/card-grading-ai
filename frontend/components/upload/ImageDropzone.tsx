"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onFileSelect: (file: File) => void;
}

export function ImageDropzone({ onFileSelect }: Props) {
  const [preview, setPreview] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        setPreview(URL.createObjectURL(file));
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpeg", ".jpg", ".png", ".webp"] },
    maxFiles: 1,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors",
        isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
      )}
    >
      <input {...getInputProps()} />
      {preview ? (
        <img src={preview} alt="Preview" className="max-h-64 rounded-md object-contain" />
      ) : (
        <>
          <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium">Drop your card image here</p>
          <p className="mt-1 text-sm text-muted-foreground">or click to browse (JPEG, PNG, WebP)</p>
        </>
      )}
    </div>
  );
}
