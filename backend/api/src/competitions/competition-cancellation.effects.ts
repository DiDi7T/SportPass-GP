import { Injectable, Logger } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import type { Competition } from './entities/competition.entity';

// HU7 CA2: punto único con los efectos de cancelar una competencia.
// Las solicitudes de permiso (SCRUM-14) y las notificaciones (SCRUM-35 y SCRUM-37) son del
// Sprint 2: cuando existan, se implementan aquí sin tocar la lógica de cancelación.
@Injectable()
export class CompetitionCancellationEffects {
  private readonly logger = new Logger(CompetitionCancellationEffects.name);

  // Corre dentro de la misma transacción que la cancelación: si falla, la competencia no queda cancelada.
  // Debe pasar a "Anulada" las solicitudes "Pendiente" y "Aprobada" de la competencia y devolver cuántas cambió.
  async annulPermissionRequests(_competition: Competition, _manager: EntityManager): Promise<number> {
    return 0;
  }

  // Corre después de confirmar la cancelación. Debe avisar a los deportistas convocados y a los
  // profesores involucrados; por ahora solo deja registro, sin enviar correos.
  async notifyCancellation(competition: Competition, annulledRequests: number): Promise<void> {
    this.logger.log(`Competencia ${competition.id} cancelada; solicitudes anuladas: ${annulledRequests}.`);
  }
}
