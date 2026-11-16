import Swal from "sweetalert2"
import "sweetalert2/dist/sweetalert2.min.css"

const base = {
  confirmButtonColor: "#1f6f8b",
  cancelButtonColor: "#6b7280",
  background: "var(--t-card, #ffffff)",
  color: "var(--t-ink, #111827)",
}

export async function confirmDialog({
  title = "Are you sure?",
  text = "",
  confirmButtonText = "Confirm",
  cancelButtonText = "Cancel",
  icon = "warning",
} = {}) {
  const result = await Swal.fire({
    ...base,
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
    focusCancel: true,
  })
  return result.isConfirmed
}

export function alertSuccess(title, text = "") {
  return Swal.fire({ ...base, title, text, icon: "success", timer: 1800, showConfirmButton: false })
}

export function alertError(title, text = "") {
  return Swal.fire({ ...base, title, text, icon: "error", confirmButtonText: "OK" })
}

export function alertInfo(title, text = "") {
  return Swal.fire({ ...base, title, text, icon: "info", confirmButtonText: "OK" })
}
