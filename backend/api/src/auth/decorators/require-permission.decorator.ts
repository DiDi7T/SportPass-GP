import { SetMetadata } from '@nestjs/common';
import { REQUIRED_PERMISSION } from '../guards/permission.guard';

export const RequirePermission = (permission: string) => SetMetadata(REQUIRED_PERMISSION, permission);
