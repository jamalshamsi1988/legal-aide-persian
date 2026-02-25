import { useState, useRef, useCallback } from "react";
import { Upload, X, Image, FileText, AlertCircle } from "lucide-react";

export interface UploadedFile {
  file: File;
  preview: string | null;
  type: "image" | "pdf";
}

interface FileUploadZoneProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  disabled?: boolean;
  maxFiles?: number;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export const FileUploadZone = ({
  files,
  onFilesChange,
  disabled = false,
  maxFiles = 50,
}: FileUploadZoneProps) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(
    (incoming: FileList | File[]) => {
      const newFiles: UploadedFile[] = [];
      const errors: string[] = [];
      const remaining = maxFiles - files.length;

      const fileArray = Array.from(incoming).slice(0, remaining);

      for (const file of fileArray) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          errors.push(`${file.name}: فرمت پشتیبانی نمی‌شود`);
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          errors.push(`${file.name}: حجم بیش از ۱۰ مگابایت`);
          continue;
        }

        const isImage = file.type.startsWith("image/");
        const preview = isImage ? URL.createObjectURL(file) : null;

        newFiles.push({ file, preview, type: isImage ? "image" : "pdf" });
      }

      if (errors.length > 0) {
        alert(errors.join("\n"));
      }

      if (newFiles.length > 0) {
        onFilesChange([...files, ...newFiles]);
      }
    },
    [files, maxFiles, onFilesChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (!disabled) processFiles(e.dataTransfer.files);
    },
    [disabled, processFiles]
  );

  const handleRemove = (index: number) => {
    const updated = [...files];
    if (updated[index].preview) URL.revokeObjectURL(updated[index].preview!);
    updated.splice(index, 1);
    onFilesChange(updated);
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200
          ${dragActive ? "border-gold bg-gold-pale" : "border-border hover:border-gold/50 hover:bg-gold-pale/50"}
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            if (e.target.files) processFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Upload className="w-8 h-8 text-gold mx-auto mb-2" />
        <p className="text-sm text-foreground font-medium">
          عکس یا فایل PDF را اینجا بکشید یا کلیک کنید
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          حداکثر {maxFiles} فایل • JPG, PNG, WEBP, PDF • هر فایل تا ۱۰ مگابایت
        </p>
      </div>

      {/* File count */}
      {files.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {files.length} فایل انتخاب شده
          </span>
          <button
            onClick={() => {
              files.forEach((f) => f.preview && URL.revokeObjectURL(f.preview));
              onFilesChange([]);
            }}
            className="text-xs text-destructive hover:underline"
            disabled={disabled}
          >
            حذف همه
          </button>
        </div>
      )}

      {/* File previews */}
      {files.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto scrollbar-thin">
          {files.map((f, i) => (
            <div
              key={i}
              className="relative group rounded-lg overflow-hidden border border-border bg-parchment aspect-square flex items-center justify-center"
            >
              {f.type === "image" && f.preview ? (
                <img
                  src={f.preview}
                  alt={f.file.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-1 p-1">
                  <FileText className="w-6 h-6 text-destructive" />
                  <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                    {f.file.name.length > 10
                      ? f.file.name.slice(0, 8) + "…"
                      : f.file.name}
                  </span>
                </div>
              )}
              {!disabled && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(i);
                  }}
                  className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Warning */}
      {files.length > 0 && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          فایل‌ها فقط برای تحلیل فعلی استفاده می‌شوند و ذخیره نخواهند شد.
        </p>
      )}
    </div>
  );
};
