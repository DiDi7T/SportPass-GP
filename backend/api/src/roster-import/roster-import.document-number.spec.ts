import '../auth/entities/session.entity';
import { BadRequestException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { isValidDocumentNumber, normalizeDocumentNumber } from '../users/document-number';
import { RosterImportService } from './roster-import.service';

const csv = (content: string) => ({ originalname: 'lista.csv', buffer: Buffer.from(content) }) as Express.Multer.File;

describe('Cédula en la lista oficial de deportistas (HU2 + HU9)', () => {
  // Las filas inválidas fallan antes de tocar la BD, así que no hace falta un DataSource real.
  const service = new RosterImportService({} as any);

  it('normalizes and validates the document number', () => {
    expect(normalizeDocumentNumber(' 1.107.012-345 ')).toBe('1107012345');
    expect(isValidDocumentNumber('1107012345')).toBe(true);
    expect(isValidDocumentNumber('AB12345')).toBe(true);
    expect(isValidDocumentNumber('123')).toBe(false);
    expect(isValidDocumentNumber('12#45678')).toBe(false);
  });

  it('requires the document_number column in the official list', async () => {
    await expect(service.importAthletes(csv('email,student_code\na@icesi.edu.co,A1'))).rejects.toThrow(
      new BadRequestException('Faltan columnas obligatorias: document_number'),
    );
  });

  it('rejects rows without document number or with an invalid one', async () => {
    const result = await service.importAthletes(csv('email,student_code,document_number\na@icesi.edu.co,A1,\nb@icesi.edu.co,B1,12'));
    expect(result).toMatchObject({ imported: 0, failed: 2 });
    expect(result.errors.map(error => error.reason)).toEqual([
      'Todos los campos son obligatorios.',
      'El documento de identidad debe tener entre 5 y 20 caracteres, solo números o letras.',
    ]);
  });

  it('rejects the same document number twice in the file', async () => {
    const processRow = jest.spyOn(service as any, 'processAthleteRow').mockResolvedValue(undefined);
    const result = await service.importAthletes(csv('email,student_code,document_number\na@icesi.edu.co,A1,1107012345\nb@icesi.edu.co,B1,1.107.012.345'));
    expect(result).toMatchObject({ imported: 1, failed: 1 });
    expect(result.errors[0].reason).toBe('El documento de identidad está duplicado dentro del archivo CSV.');
    processRow.mockRestore();
  });
});
