import { useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { User } from "lucide-react";
import { GENDER, type CustomerInput } from "@smartpos/shared";
import { DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const AVATAR_MAX_DIMENSION = 256;

// Downscale + compress client-side so the avatar (stored inline as a data URL,
// no file storage backend for v1) stays a reasonable size in the database.
function fileToResizedDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, AVATAR_MAX_DIMENSION / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

interface CustomerFormProps {
  form: UseFormReturn<CustomerInput>;
  code?: string;
  avatarUrl?: string | null;
  onSubmit: () => void;
  onCancel: () => void;
  submitting?: boolean;
  submitLabel?: string;
}

export function CustomerForm({
  form,
  code,
  avatarUrl,
  onSubmit,
  onCancel,
  submitting,
  submitLabel = "Lưu",
}: CustomerFormProps) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(avatarUrl ?? null);

  const gender = watch("gender");

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToResizedDataUrl(file);
    setAvatarPreview(dataUrl);
    setValue("avatarUrl", dataUrl);
  }

  return (
    <form
      className="grid grid-cols-[112px_1fr_1fr] gap-x-6 gap-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="row-span-4 flex flex-col items-center gap-2">
        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-muted">
          {avatarPreview ? (
            <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
          ) : (
            <User className="h-10 w-10 text-muted-foreground" />
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
          Chọn ảnh
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label>Tên khách hàng</Label>
        <Input autoFocus {...register("name")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>Nhóm khách hàng</Label>
        <Input placeholder="Khách lẻ, VIP..." {...register("groupName")} />
      </div>

      <div className="space-y-1.5">
        <Label>Mã khách hàng</Label>
        <Input value={code ?? "Tự động"} disabled className="text-muted-foreground" />
      </div>
      <div className="space-y-1.5">
        <Label>Ngày sinh</Label>
        <div className="flex items-center gap-3">
          <Input type="date" className="flex-1" {...register("birthday")} />
          <label className="flex items-center gap-1 text-sm">
            <input
              type="radio"
              checked={gender === GENDER.MALE}
              onChange={() => setValue("gender", GENDER.MALE)}
            />
            Nam
          </label>
          <label className="flex items-center gap-1 text-sm">
            <input
              type="radio"
              checked={gender === GENDER.FEMALE}
              onChange={() => setValue("gender", GENDER.FEMALE)}
            />
            Nữ
          </label>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Điện thoại</Label>
        <Input {...register("phone")} />
        {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>Email</Label>
        <Input type="email" {...register("email")} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Địa chỉ</Label>
        <Input placeholder="Số nhà, tòa nhà, ngõ, đường" {...register("address")} />
      </div>
      <div className="space-y-1.5">
        <Label>Facebook</Label>
        <Input {...register("facebook")} />
      </div>

      <div className="space-y-1.5">
        <Label>Khu vực</Label>
        <Input placeholder="Tỉnh/TP - Quận/Huyện" {...register("province")} />
      </div>
      <div className="row-span-2 space-y-1.5">
        <Label>Ghi chú</Label>
        <Textarea rows={4} {...register("note")} />
      </div>

      <div className="space-y-1.5">
        <Label>Phường xã</Label>
        <Input placeholder="Chọn Phường/Xã" {...register("ward")} />
      </div>

      <DialogFooter className="col-span-3 mt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Bỏ qua
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Đang lưu..." : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}
