// Cédula / documento de identidad (users.document_number).
// Se guarda y se busca normalizada: sin puntos, espacios ni guiones y en mayúsculas,
// para que "1.107.012.345" y "1107012345" sean la misma persona (HU2 importación, HU9 asistencia).
export const normalizeDocumentNumber = (value: unknown) =>
  String(value ?? '').replace(/[\s.-]/g, '').toUpperCase();

// Números (cédula) o letras y números (pasaporte / cédula de extranjería), entre 5 y 20 caracteres.
export const isValidDocumentNumber = (value: string) => /^[0-9A-Z]{5,20}$/.test(value);

export const INVALID_DOCUMENT_NUMBER =
  'El documento de identidad debe tener entre 5 y 20 caracteres, solo números o letras.';
