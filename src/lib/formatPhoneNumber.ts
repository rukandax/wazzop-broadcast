export default function formatPhoneNumber(phoneNumber: string) {
  let cleanPhone = phoneNumber.replace(/[^0-9+]/g, "");

  if (!cleanPhone.startsWith("+")) {
    if (cleanPhone.startsWith("0")) {
      cleanPhone = cleanPhone.replace(/^0/, "+62");
    } else {
      cleanPhone = `+${cleanPhone}`;
    }
  }

  return cleanPhone;
}
