import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * 拼 class。`twMerge` 负责让后面的 tailwind 类真的能盖住前面的 ——
 * 不加它的话 `cn("p-2", "p-4")` 会两条都留下，最终取决于 CSS 里的顺序，
 * 而那个顺序是构建产物决定的，看不出来也管不住。
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
