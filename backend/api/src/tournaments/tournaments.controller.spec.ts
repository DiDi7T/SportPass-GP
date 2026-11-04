// Session debe cargarse antes que User para evitar el ciclo de imports entre ambas entidades.
import '../auth/entities/session.entity';
import { RequestMethod } from '@nestjs/common';
import { GUARDS_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { AccessGuard } from '../auth/guards/access.guard';
import { REQUIRED_PERMISSION } from '../auth/guards/permission.guard';
import { TournamentsController } from './tournaments.controller';

// CA4: cualquier usuario con sesión @icesi.edu.co consulta la programación sin permisos de entrenador o administrador.
describe('TournamentsController access (CA4)', () => {
  const handlers = [TournamentsController.prototype.findMatches, TournamentsController.prototype.findMatch];

  it('requires a session (AccessGuard) and nothing else', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, TournamentsController)).toEqual([AccessGuard]);
    for (const handler of handlers) expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toBeUndefined();
  });

  it('does not require any permission such as competitions:manage', () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, TournamentsController)).toBeUndefined();
    for (const handler of handlers) expect(Reflect.getMetadata(REQUIRED_PERMISSION, handler)).toBeUndefined();
  });

  it('is read-only: every route is a GET', () => {
    const routes = Object.getOwnPropertyNames(TournamentsController.prototype)
      .filter(name => name !== 'constructor')
      .map(name => Reflect.getMetadata(METHOD_METADATA, (TournamentsController.prototype as any)[name]));
    expect(routes).toEqual([RequestMethod.GET, RequestMethod.GET]);
  });
});
