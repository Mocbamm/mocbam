// NAPAS account-transfer QR: EMV TLV fields, VND and CRC-16/CCITT-FALSE.
// Generated locally; bank account data is never sent to a QR-image service.
function field(id: string, value: string): string {
  if (!/^[\x20-\x7e]*$/.test(value) || value.length > 99)
    throw new Error("Invalid QR field");
  return id + String(value.length).padStart(2, "0") + value;
}

export function qrChecksum(payload: string): string {
  let crc = 0xffff;
  for (const character of payload) {
    crc ^= character.charCodeAt(0) << 8;
    for (let bit = 0; bit < 8; bit++)
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    crc &= 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function buildVietQrPayload({
  bankBin,
  accountNumber,
  amount,
  reference,
}: {
  bankBin: string;
  accountNumber: string;
  amount: number;
  reference: string;
}): string {
  if (
    !/^[0-9]{6}$/.test(bankBin) ||
    !/^[A-Za-z0-9]{5,19}$/.test(accountNumber) ||
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    amount > 9_999_999_999_999 ||
    !/^[A-Za-z0-9 ]{1,25}$/.test(reference)
  )
    throw new Error("Invalid bank transfer details");
  const consumer = field("00", bankBin) + field("01", accountNumber);
  const account =
    field("00", "A000000727") + field("01", consumer) + field("02", "QRIBFTTA");
  const payload =
    field("00", "01") +
    field("01", "12") +
    field("38", account) +
    field("53", "704") +
    field("54", String(amount)) +
    field("58", "VN") +
    field("62", field("08", reference)) +
    "6304";
  return payload + qrChecksum(payload);
}
